const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

connection.on('connect', () => {
    console.log('✅ Redis connected');
});

connection.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
});

// Create broadcast queue
const broadcastQueue = new Queue('broadcast-queue', { connection });

module.exports = { broadcastQueue, connection };
