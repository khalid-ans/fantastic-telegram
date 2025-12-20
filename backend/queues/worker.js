const { Worker } = require('bullmq');
const { connection } = require('./broadcastQueue');
const { Task, Folder, Entity } = require('../models');
const telegramService = require('../services/telegramService');

const { processTask } = require('../services/taskProcessor');

// Create worker
const broadcastWorker = new Worker('broadcast-queue', async (job) => {
    const { taskId } = job.data;

    if (job.name === 'expire') {
        console.log(`⏳ Processing expiry for task: ${taskId}`);
        const task = await Task.findOne({ taskId });
        if (task && task.sentMessages && task.sentMessages.length > 0) {
            return await telegramService.deleteMessages(task.sentMessages);
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
