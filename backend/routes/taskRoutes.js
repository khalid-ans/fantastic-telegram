const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Task, Folder } = require('../models');
const multer = require('multer');
const { protect, authorize, checkApproval } = require('../middleware/auth');

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
router.get('/', protect, async (req, res) => {
    try {
        const { userId } = req.query;
        let filter = { userId: req.user._id };

        // Admin can view all or filter by specific user
        if (req.user.role === 'admin') {
            if (userId && userId !== 'all') {
                filter = { userId };
            } else if (userId === 'all') {
                filter = {};
            } else {
                // Default to self for Admin too, unless explicitly requested all
                filter = { userId: req.user._id };
            }
        }

        const tasks = await Task.find(filter)
            .populate('folders', 'name')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single task by ID
router.get('/:taskId', protect, async (req, res) => {
    try {
        const filter = { taskId: req.params.taskId };
        if (req.user.role !== 'admin') {
            filter.userId = req.user._id;
        }

        const task = await Task.findOne(filter)
            .populate('folders', 'name entityIds');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST schedule new broadcast (Moderator/Admin only)
router.post('/schedule', protect, authorize('admin', 'moderator'), checkApproval, upload.single('media'), async (req, res) => {
    const log = (msg) => {
        const entry = `[${new Date().toISOString()}] [ROUTER] [USER:${req.user.username}] ${msg}\n`;
        console.log(`[${req.user.username}] ${msg}`);
        const logFile = require('path').join(__dirname, '..', 'debug.log');
        try { require('fs').appendFileSync(logFile, entry); } catch (e) { }
    };

    try {
        log('--- NEW SCHEDULE REQUEST ---');

        let content = req.body.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { }
        }

        let folderIds = req.body.folderIds;
        if (typeof folderIds === 'string') {
            try {
                folderIds = JSON.parse(folderIds);
            } catch (e) {
                folderIds = folderIds.split(',').map(s => s.trim());
            }
        }

        const { name, type, scheduledAt } = req.body;

        if (req.file) {
            if (!content) content = {};
            content.mediaUrl = `/uploads/${req.file.filename}`;
            log('✅ Media detected: ' + content.mediaUrl);
        }

        if (!name) return res.status(400).json({ error: 'Task name is required' });
        if (!type || !['message', 'poll'].includes(type)) return res.status(400).json({ error: 'Valid task type is required' });
        if (!folderIds || folderIds.length === 0) return res.status(400).json({ error: 'At least one folder must be selected' });

        const folders = await Folder.find({ _id: { $in: folderIds }, userId: req.user._id });
        const recipientCount = folders.reduce((sum, f) => sum + f.entityIds.length, 0);

        const taskId = uuidv4();
        const task = new Task({
            userId: req.user._id,
            sentByUsername: req.user.username,
            taskId,
            name,
            type,
            content: content || {},
            folders: folderIds,
            recipientCount,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            expiryHours: req.body.expiryHours || null,
            status: 'pending'
        });

        await task.save();

        // Queue logic
        try {
            const { broadcastQueue, connection } = require('../queues/broadcastQueue');
            const delay = scheduledAt ? new Date(scheduledAt) - Date.now() : 0;

            if (connection.status !== 'ready' && connection.status !== 'connect' && connection.status !== 'connecting') {
                throw new Error('Redis connection down');
            }

            await broadcastQueue.add('broadcast', { taskId }, {
                delay: delay > 0 ? delay : 0,
                removeOnComplete: true
            });

            log(`📝 Task ${taskId} added to queue`);
        } catch (queueErr) {
            log('⚠️ Queue Fallback: ' + queueErr.message);
            const { processTask } = require('../services/taskProcessor');
            const now = new Date();
            const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
            const isImmediate = !scheduledAt || (scheduledDate <= now);

            if (isImmediate) {
                processTask(taskId).catch(err => log('❌ Fallback failed: ' + err.message));
            } else {
                const delayMs = Math.max(0, scheduledDate - now);
                setTimeout(() => {
                    processTask(taskId).catch(err => log('❌ Delayed Fallback failed: ' + err.message));
                }, delayMs);
            }
        }

        res.status(201).json({ message: 'Task scheduled successfully', task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST undo broadcast (Moderator/Admin only)
router.post('/:taskId/undo', protect, authorize('admin', 'moderator'), async (req, res) => {
    try {
        const filter = { taskId: req.params.taskId };
        if (req.user.role !== 'admin') filter.userId = req.user._id;

        const task = await Task.findOne(filter);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        if (!task.sentMessages || task.sentMessages.length === 0) {
            return res.status(400).json({ error: 'No sent messages found' });
        }

        const telegramService = require('../services/telegramService');
        // Passing user config to service (to be updated later)
        const results = await telegramService.deleteMessages(task.sentMessages);

        task.status = 'undone';
        task.sentMessages = [];
        task.completedAt = new Date();
        await task.save();

        res.json({ message: 'Undo request processed', results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST update metrics for a task
router.post('/:taskId/update-metrics', protect, async (req, res) => {
    try {
        const filter = { taskId: req.params.taskId };
        if (req.user.role !== 'admin') filter.userId = req.user._id;

        const task = await Task.findOne(filter);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const telegramService = require('../services/telegramService');
        const result = await telegramService.updateMetrics(req.params.taskId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE clear task history
router.delete('/history', protect, async (req, res) => {
    try {
        let filter = { userId: req.user._id };

        // Admin can clear EVERYTHING if requested, otherwise just their own
        if (req.user.role === 'admin' && req.query.all === 'true') {
            filter = {};
        }

        const result = await Task.deleteMany(filter);
        res.json({ message: `Deleted ${result.deletedCount} tasks` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
