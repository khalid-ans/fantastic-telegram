const { Task } = require('../models');
const telegramService = require('./telegramService');

/**
 * Periodically checks for expired tasks and triggers message deletion
 * This replaces BullMQ/Redis for expiry handling
 */
const initExpiryService = () => {
    console.log('⏳ Expiry Service Initialized (Polling every 60s)');

    setInterval(async () => {
        try {
            const now = new Date();

            // Find tasks that:
            // 1. Are completed or partially_completed
            // 2. Have an expiry set (> 0)
            // 3. Are NOT already 'undone'
            // 4. Have passed their expiry time

            // Note: We need to calculate cutoff time in JS or use aggregation if we want precise calculation
            // Since expiry is in hours added to completedAt

            // We fetch candidate tasks first
            const candidateTasks = await Task.find({
                status: { $in: ['completed', 'partially_completed'] },
                expiryHours: { $gt: 0 },
                completedAt: { $exists: true, $ne: null }
            });

            for (const task of candidateTasks) {
                const completedAt = new Date(task.completedAt);
                const expiryMs = task.expiryHours * 60 * 60 * 1000;
                const expiresAt = new Date(completedAt.getTime() + expiryMs);

                if (now >= expiresAt) {
                    console.log(`🗑️ Processing expiry for Task ${task.taskId} (Expired at ${expiresAt.toISOString()})`);

                    if (task.sentMessages && task.sentMessages.length > 0) {
                        const results = await telegramService.deleteMessages(task.sentMessages);

                        // Update status to undone
                        task.status = 'undone';
                        // Save deletion results if needed, or just log
                        console.log(`✅ Task ${task.taskId} messages deleted: ${results.success} success, ${results.failed} failed`);
                        await task.save();
                    } else {
                        // Mark as undone even if no messages (just to stop checking it)
                        task.status = 'undone';
                        await task.save();
                    }
                }
            }

        } catch (err) {
            console.error('⚠️ Expiry Service Error:', err.message);
        }
    }, 60 * 1000); // Check every minute
};

module.exports = { initExpiryService };
