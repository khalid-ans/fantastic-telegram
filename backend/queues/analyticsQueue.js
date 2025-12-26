const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

const analyticsQueue = new Queue('analytics-queue', { connection });

module.exports = { analyticsQueue, connection };
