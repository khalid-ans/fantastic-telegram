const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Task, Folder } = require('../models');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// GET all tasks (history)
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('folders', 'name')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single task by ID
router.get('/:taskId', async (req, res) => {
    try {
        const task = await Task.findOne({ taskId: req.params.taskId })
            .populate('folders', 'name entityIds');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST schedule new broadcast (Handle optional file upload)
router.post('/schedule', upload.single('media'), async (req, res) => {
    const log = (msg) => {
        const entry = `[${new Date().toISOString()}] [ROUTER] ${msg}\n`;
        console.log(msg);
        const logFile = require('path').join(__dirname, '..', 'debug.log');
        require('fs').appendFileSync(logFile, entry);
    };

    try {
        log('--- NEW SCHEDULE REQUEST ---');
        log('Body: ' + JSON.stringify(req.body));
        log('File: ' + (req.file ? JSON.stringify(req.file) : 'NO FILE ATTACHED'));

        // Parse fields from FormData
        let content = req.body.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { }
        }

        let folderIds = req.body.folderIds;
        if (typeof folderIds === 'string') {
            try {
                folderIds = JSON.parse(folderIds);
            } catch (e) {
                // If not JSON, try comma separated
                folderIds = folderIds.split(',').map(s => s.trim());
            }
        }

        const { name, type, scheduledAt } = req.body;

        // Handle file if uploaded
        if (req.file) {
            if (!content) content = {};
            content.mediaUrl = `/uploads/${req.file.filename}`;
            log('✅ Media detected and saved: ' + content.mediaUrl);
        }

        // Validation
        if (!name) {
            return res.status(400).json({ error: 'Task name is required' });
        }
        if (!type || !['message', 'poll'].includes(type)) {
            return res.status(400).json({ error: 'Valid task type (message/poll) is required' });
        }
        if (!folderIds || folderIds.length === 0) {
            return res.status(400).json({ error: 'At least one folder must be selected' });
        }

        // Get folders and count recipients
        const folders = await Folder.find({ _id: { $in: folderIds } });
        const recipientCount = folders.reduce((sum, f) => sum + f.entityIds.length, 0);

        // Create task
        const taskId = uuidv4();
        const task = new Task({
            taskId,
            name,
            type,
            content: content || {},
            folders: folderIds,
            recipientCount,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            expiryHours: req.body.expiryHours || null, // Capture expiryHours
            status: 'pending'
        });

        await task.save();

        // Add to BullMQ queue for processing
        try {
            const { broadcastQueue, connection } = require('../queues/broadcastQueue');
            const delay = scheduledAt ? new Date(scheduledAt) - Date.now() : 0;

            // If redis is definitely not connected, throw immediately so we can fall back
            if (connection.status !== 'ready' && connection.status !== 'connect' && connection.status !== 'connecting') {
                throw new Error('Redis connection is ' + connection.status);
            }

            // Attempt to add to queue with a timeout
            const addPromise = broadcastQueue.add('broadcast', { taskId }, {
                delay: delay > 0 ? delay : 0,
                removeOnComplete: true
            });

            // If it takes more than 500ms to add, it's likely Redis is hanging
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Queue timeout')), 500));

            await Promise.race([addPromise, timeoutPromise]);

            log(`📝 Task ${taskId} added to queue (delay: ${delay}ms)`);
        } catch (queueErr) {
            log('⚠️ Failed to add to queue: ' + queueErr.message);

            const { processTask } = require('../services/taskProcessor');
            const now = new Date();
            const hasSchedule = !!scheduledAt;
            const scheduledDate = hasSchedule ? new Date(scheduledAt) : null;
            const isImmediate = !hasSchedule || (scheduledDate <= now);

            if (isImmediate) {
                // Fallback: process immediately in-process
                log('🔄 Redis unavailable, processing immediate task directly (in-process)...');
                processTask(taskId).catch(err => log('❌ Direct processing failed: ' + err.message));
            } else {
                // Fallback for scheduled tasks when Redis is not available:
                // schedule an in-memory timer so the feature still works on single-node setups.
                const delayMs = Math.max(0, scheduledDate - now);
                log(`⏰ Redis unavailable, scheduling task in-process with delay ${delayMs}ms...`);

                setTimeout(() => {
                    log(`⏰ In-process scheduler triggering task ${taskId}`);
                    processTask(taskId).catch(err => log('❌ In-process scheduled processing failed: ' + err.message));
                }, delayMs);
            }
        }

        res.status(201).json({
            message: 'Task scheduled successfully',
            task
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST undo broadcast (delete sent messages)
router.post('/:taskId/undo', async (req, res) => {
    try {
        const task = await Task.findOne({ taskId: req.params.taskId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (!task.sentMessages || task.sentMessages.length === 0) {
            return res.status(400).json({ error: 'No sent messages found for this task' });
        }

        const telegramService = require('../services/telegramService');
        const results = await telegramService.deleteMessages(task.sentMessages);

        // Mark task as undone and clear stored message references
        task.status = 'undone';
        task.sentMessages = [];
        task.completedAt = new Date();
        await task.save();

        res.json({
            message: 'Undo request processed',
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST update metrics for a task
router.post('/:taskId/update-metrics', async (req, res) => {
    try {
        const result = await telegramService.updateMetrics(req.params.taskId)
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router;
