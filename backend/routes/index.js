const express = require('express');
const router = express.Router();

const folderRoutes = require('./folderRoutes');
const taskRoutes = require('./taskRoutes');
const entityRoutes = require('./entityRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const telegramAuthRoutes = require('./telegramAuthRoutes');

// Mount routes
router.use('/folders', folderRoutes);
router.use('/tasks', taskRoutes);
router.use('/entities', entityRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/telegram-auth', telegramAuthRoutes);

// API info
router.get('/', (req, res) => {
    res.json({
        name: 'Telegram Broadcaster API (RBAC Enabled)',
        version: '1.2.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            folders: '/api/folders',
            tasks: '/api/tasks',
            entities: '/api/entities',
            telegramAuth: '/api/telegram-auth'
        }
    });
});

module.exports = router;
