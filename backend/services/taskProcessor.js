const { Task, Folder, User } = require('../models');
const telegramService = require('../services/telegramService');
const fs = require('fs');
const path = require('path');

const log = (taskId, msg) => {
    const entry = `[${new Date().toISOString()}] [PROCESSOR] [Task:${taskId}] ${msg}\n`;
    console.log(`[Task:${taskId}] ${msg}`);
    const logFile = path.join(__dirname, '..', 'debug.log');
    try { fs.appendFileSync(logFile, entry); } catch (e) { }
};

/**
 * Core logic to process a broadcast task
 */
const processTask = async (taskId) => {
    log(taskId, '🚀 Starting broadcast processing...');

    try {
        // 1. Fetch task and user
        const task = await Task.findOne({ taskId }).populate('folders');
        if (!task) throw new Error('Task not found');

        const user = await User.findById(task.userId);
        if (!user) throw new Error('User associated with task not found');

        const config = {
            apiId: user.telegramConfig.apiId,
            apiHash: user.telegramConfig.apiHash,
            botToken: user.telegramConfig.botToken,
            session: user.telegramConfig.sessionString
        };

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
        log(taskId, `👥 Sending to ${uniqueRecipients.length} unique recipients`);

        // 5. Trigger Telegram Broadcast with user config
        const results = await telegramService.sendBroadcast(
            uniqueRecipients,
            task.type,
            task.content,
            config
        );

        // 6. Update task results
        task.status = (results.success > 0) ? (results.failed > 0 ? 'partially_completed' : 'completed') : 'failed';
        task.results = results;
        task.sentMessages = results.sentMessages || [];
        task.completedAt = new Date();
        await task.save();

        // 7. Schedule Analytics Tracking (Carry userId)
        if (task.sentMessages.length > 0) {
            try {
                const { analyticsQueue } = require('../queues/analyticsQueue');
                let trackedCount = 0;

                for (const msg of task.sentMessages) {
                    if (msg.recipientId && msg.recipientId.toString().startsWith('-100')) {
                        await analyticsQueue.add('track-message', {
                            taskId,
                            userId: user._id, // Crucial for multi-tenant analytics
                            recipientId: msg.recipientId,
                            messageId: msg.messageId,
                            startedTrackingAt: Date.now()
                        }, {
                            delay: 15 * 60 * 1000,
                            removeOnComplete: true
                        });
                        trackedCount++;
                    }
                }
                if (trackedCount > 0) log(taskId, `📊 Scheduled analytics for ${trackedCount} messages`);
            } catch (aErr) {
                log(taskId, `⚠️ Analytics scheduling failed: ${aErr.message}`);
            }
        }

        // 8. Handle Expiry
        if (task.expiryHours && task.expiryHours > 0) {
            try {
                const { broadcastQueue } = require('../queues/broadcastQueue');
                const expiryDelay = task.expiryHours * 60 * 60 * 1000;
                await broadcastQueue.add('expire', { taskId }, {
                    delay: expiryDelay,
                    removeOnComplete: true
                });
            } catch (qErr) {
                log(taskId, `⚠️ Expiry scheduling failed: ${qErr.message}`);
            }
        }

        log(taskId, `✅ Finished: ${results.success} sent, ${results.failed} failed`);
        return results;

    } catch (err) {
        log(taskId, `❌ Error: ${err.message}`);
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
