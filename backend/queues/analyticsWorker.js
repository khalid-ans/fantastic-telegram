const { Worker } = require('bullmq');
const axios = require('axios');
const { connection, analyticsQueue } = require('./analyticsQueue');
const { Task } = require('../models');

const PYTHON_SERVICE_URL = 'http://localhost:8000/analytics';
const TRACKING_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const analyticsWorker = new Worker('analytics-queue', async (job) => {
    const { taskId, userId, recipientId, chatId, messageId, startedTrackingAt } = job.data;

    try {
        console.log(`🔍 [User:${userId}] Syncing analytics for Msg ${messageId} (Task ${taskId})`);

        // Fetch user config for credentials
        const { User } = require('../models');
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const params = {
            chat_id: recipientId || chatId,
            message_id: messageId
        };

        // Include credentials for multi-tenancy
        if (user.telegramConfig && user.telegramConfig.apiId) {
            params.api_id = user.telegramConfig.apiId;
            params.api_hash = user.telegramConfig.apiHash;
        }

        // 1. Fetch from Python Service with User header and credentials
        const response = await axios.get(PYTHON_SERVICE_URL, {
            params,
            headers: { 'X-User-Id': userId.toString() }
        });

        const stats = response.data;

        // 2. Update Database
        await Task.updateOne(
            { taskId: taskId, "sentMessages.recipientId": recipientId || chatId },
            {
                $set: {
                    "sentMessages.$.metrics.views": stats.views,
                    "sentMessages.$.metrics.forwards": stats.forwards,
                    "sentMessages.$.metrics.replies": stats.replies,
                    "sentMessages.$.metrics.reactions": stats.reactions,
                    "sentMessages.$.metrics.updatedAt": new Date()
                }
            }
        );

        console.log(`✅ [User:${userId}] Updated stats for Msg ${messageId}`);

        // 3. Reschedule if within window
        const now = Date.now();
        const timeElapsed = now - (startedTrackingAt || now);

        if (timeElapsed < TRACKING_DURATION_MS) {
            await analyticsQueue.add('track-message', job.data, {
                delay: SYNC_INTERVAL_MS
            });
        }

    } catch (error) {
        console.error(`❌ Analytics sync failed for Msg ${messageId}:`, error.message);
        if (error.response && error.response.status === 404) {
            return;
        }
        throw error;
    }
}, {
    connection,
    limiter: {
        max: 10,
        duration: 1000
    }
});

analyticsWorker.on('failed', (job, err) => {
    console.error(`🔥 Analytics Job ${job.id} failed: ${err.message}`);
});

module.exports = analyticsWorker;
