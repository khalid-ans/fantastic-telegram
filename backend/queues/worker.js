const { Worker } = require('bullmq');
const { connection } = require('./broadcastQueue');
const { Task, User } = require('../models');
const telegramService = require('../services/telegramService');
const { processTask } = require('../services/taskProcessor');

// Create worker
const broadcastWorker = new Worker('broadcast-queue', async (job) => {
    const { taskId } = job.data;

    if (job.name === 'expire') {
        console.log(`⏳ [Task:${taskId}] Processing expiry...`);
        const task = await Task.findOne({ taskId });
        if (task && task.sentMessages && task.sentMessages.length > 0) {
            const user = await User.findById(task.userId);
            if (!user) throw new Error('User not found for expiring task');

            const config = {
                apiId: user.telegramConfig.apiId,
                apiHash: user.telegramConfig.apiHash,
                botToken: user.telegramConfig.botToken,
                session: user.telegramConfig.sessionString
            };

            return await telegramService.deleteMessages(task.sentMessages, config);
        }
        return { message: 'No messages to expire' };
    }

    return await processTask(taskId);
}, {
    connection,
    concurrency: 1
});

broadcastWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
});

broadcastWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
});

module.exports = { broadcastWorker };
