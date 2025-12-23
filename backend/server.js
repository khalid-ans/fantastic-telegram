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
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const apiRoutes = require('./routes');
const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api', apiRoutes);
app.use('/api/analytics', analyticsRoutes);

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

    app.listen(PORT, () => {
        log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

startServer();
