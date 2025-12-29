require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'debug.log');
const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, entry);
};

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Middleware (Security)
// 1. CORS (Strict Origin) - Must be first
app.use(cors()); // Allow all for debugging

// 2. Body Parser
app.use(express.json({ limit: '10kb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Security Middleware (DISABLED)
// const helmet = require('helmet');
// app.use(helmet({
//     contentSecurityPolicy: false,
//     crossOriginResourcePolicy: false,
//     crossOriginEmbedderPolicy: false
// }));

// 4. Data Sanitization (DISABLED)
// const mongoSanitize = require('express-mongo-sanitize');
// app.use(mongoSanitize());

// 5. Rate Limiting (DISABLED)
// const rateLimit = require('express-rate-limit');
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 mins
//     max: 100, // Limit each IP to 100 requests per window
//     standardHeaders: true,
//     legacyHeaders: false,
// });
// app.use('/api', limiter);

// Routes
const apiRoutes = require('./routes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes'); // [NEW]
app.use('/api', apiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes); // [NEW]


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        log('✅ MongoDB connected successfully');
    } catch (err) {
        log('❌ MongoDB connection error: ' + err.message);
        process.exit(1);
    }
};

// Start Server
const startServer = async () => {
    await connectDB();

    // Start BullMQ worker (optional - requires Redis)
    try {
        require('./queues/worker');
        require('./queues/analyticsWorker');
        log('✅ Background worker started');
    } catch (err) {
        log('⚠️ Worker not started (Redis may not be running): ' + err.message);
    }

    // Start Expiry Service (Polling - No Redis required)
    try {
        const { initExpiryService } = require('./services/expiryService');
        initExpiryService();
        log('✅ Expiry service started');
    } catch (err) {
        log('❌ Failed to start expiry service: ' + err.message);
    }

    app.listen(PORT, () => {
        log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

// Prevent crash on unhandled rejections (e.g. Redis connection failure)
process.on('unhandledRejection', (reason, promise) => {
    log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (err) => {
    log('❌ Uncaught Exception thrown:', err);
});

startServer();
