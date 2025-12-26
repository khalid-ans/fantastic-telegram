const { Task, Folder } = require('../models');
const telegramService = require('../services/telegramService');
const fs = require('fs');
const path = require('path');

const log = (msg) => {
    const entry = `[${new Date().toISOString()}] [PROCESSOR] ${msg}\n`;
    console.log(msg);
    const logFile = path.join(__dirname, '..', 'debug.log');
    fs.appendFileSync(logFile, entry);
};

/**
 * Core logic to process a broadcast task
 * Can be called by BullMQ worker OR directly by API as a fallback
 */
const processTask = async (taskId) => {
    console.log(`📡 Processing broadcast task: ${taskId}`);

    try {
        // 1. Fetch task and populate folders
        const task = await Task.findOne({ taskId }).populate('folders');
        if (!task) throw new Error('Task not found');

        // 2. Update status to processing
        task.status = 'processing';
        await task.save();

        // 3. Collect recipient IDs
        const recipientIds = [];
        for (const folder of task.folders) {
            if (folder.entityIds) {
                recipientIds.push(...folder.entityIds);
            }
        }

        // 4. De-duplicate recipients
        const uniqueRecipients = [...new Set(recipientIds)];
        console.log(`👥 Sending to ${uniqueRecipients.length} unique recipients`);

        // 5. Trigger Telegram Broadcast
        const results = await telegramService.sendBroadcast(
            uniqueRecipients,
            task.type,
            task.content
        );

        // 6. Update task as completed or failed
        if (results.success > 0) {
            task.status = results.failed > 0 ? 'partially_completed' : 'completed';
        } else {
            task.status = 'failed';
        }

        task.results = results;
        task.sentMessages = results.sentMessages || [];
        task.completedAt = new Date();
        await task.save();

        // 7. Schedule Analytics Tracking
        if (task.sentMessages.length > 0) {
            try {
                const { analyticsQueue } = require('../queues/analyticsQueue');
                let trackedCount = 0;

                for (const msg of task.sentMessages) {
                    // Only track channels/supergroups (ID starts with -100)
                    if (msg.recipientId && msg.recipientId.toString().startsWith('-100')) {
                        await analyticsQueue.add('track-message', {
                            taskId,
                            recipientId: msg.recipientId,
                            chatId: msg.recipientId,
                            messageId: msg.messageId,
                            startedTrackingAt: Date.now()
                        }, {
                            delay: 15 * 60 * 1000, // 15 minutes initial delay
                            removeOnComplete: true
                        });
                        trackedCount++;
                    }
                }
                if (trackedCount > 0) log(`📊 Scheduled analytics tracking for ${trackedCount} channel messages`);
            } catch (aErr) {
                log(`⚠️ Failed to schedule analytics: ${aErr.message}`);
            }
        }

        // 8. Handle Expiry if set
        if (task.expiryHours && task.expiryHours > 0) {
            log(`⏳ Task ${taskId} has ${task.expiryHours}h expiry. Scheduling deletion...`);
            // In a real system, we'd add a delayed job to BullMQ
            // For now, we'll mark it for deletion logic in the queue or a cron
            try {
                const { broadcastQueue } = require('../queues/broadcastQueue');
                const expiryDelay = task.expiryHours * 60 * 60 * 1000;
                await broadcastQueue.add('expire', { taskId }, {
                    delay: expiryDelay,
                    removeOnComplete: true
                });
            } catch (qErr) {
                log(`⚠️ Could not schedule expiry job: ${qErr.message}`);
            }
        }

        if (results.failed > 0) {
            log(`⚠️ Errors encountered during task ${taskId}:`);
            results.errors.forEach(e => log(`   - ${e}`));
        }
        log(`✅ Task ${taskId} finished: ${results.success} sent, ${results.failed} failed`);
        return results;

    } catch (err) {
        log(`❌ Task ${taskId} failed: ` + err.message);
        if (err.stack) log(err.stack); // Log stack trace if available

        await Task.findOneAndUpdate(
            { taskId },
            {
                status: 'failed',
                results: { success: 0, failed: 0, errors: [err.message] },
                completedAt: new Date()
            }
        );

        throw err;
    }
};

module.exports = { processTask };
