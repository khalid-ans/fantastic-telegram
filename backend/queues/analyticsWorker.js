const { Worker } = require('bullmq');
const axios = require('axios');
const { connection, analyticsQueue } = require('./analyticsQueue');
const { Task } = require('../models');

const PYTHON_SERVICE_URL = 'http://localhost:8000/analytics';
const TRACKING_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const analyticsWorker = new Worker('analytics-queue', async (job) => {
    const { taskId, recipientId, chatId, messageId, startedTrackingAt } = job.data;

    try {
        console.log(`🔍 Syncing analytics for Msg ${messageId} (Task ${taskId})`);

        // 1. Fetch from Python Service
        const response = await axios.get(PYTHON_SERVICE_URL, {
            params: { chat_id: chatId, message_id: messageId }
        });

        const stats = response.data;
        // Expected: { views, forwards, replies, reactions }

        // 2. Update Database
        await Task.updateOne(
            { taskId: taskId, "sentMessages.recipientId": recipientId },
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

        console.log(`✅ Updated stats for Msg ${messageId}: Views=${stats.views}`);

        // 3. Reschedule if within window
        const now = Date.now();
        const timeElapsed = now - (startedTrackingAt || now);

        if (timeElapsed < TRACKING_DURATION_MS) {
            await analyticsQueue.add('track-message', job.data, {
                delay: SYNC_INTERVAL_MS
            });
            console.log(`⏳ Rescheduled next sync in 30m`);
        } else {
            console.log(`🛑 Tracking finished for Msg ${messageId} (48h limit)`);
        }

    } catch (error) {
        console.error(`❌ Analytics sync failed for Msg ${messageId}:`, error.message);
        // Fail silently/softly as per requirement (don't crash system, maybe retry handled by BullMQ default?)
        // BullMQ will retry if we throw. Let's throw to allow retries for temporary network glitches,
        // but maybe limit retries in Queue settings.
        // For 'Channel not found' (404), maybe strictly stop?
        if (error.response && error.response.status === 404) {
            console.error("⚠️ Message/Channel not found. Stopping tracking.");
            return;
        }
        throw error;
    }
}, {
    connection,
    limiter: {
        max: 10, // Avoid spamming Telethon
        duration: 1000
    }
});

analyticsWorker.on('failed', (job, err) => {
    console.error(`🔥 Analytics Job ${job.id} failed: ${err.message}`);
});

module.exports = analyticsWorker;
