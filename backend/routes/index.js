const express = require('express');
const router = express.Router();

const folderRoutes = require('./folderRoutes');
const taskRoutes = require('./taskRoutes');
const entityRoutes = require('./entityRoutes');
const authRoutes = require('./authRoutes');

// Mount routes
router.use('/folders', folderRoutes);
router.use('/tasks', taskRoutes);
router.use('/entities', entityRoutes);
router.use('/auth', authRoutes);

// API info
router.get('/', (req, res) => {
    res.json({
        name: 'Telegram Broadcaster API',
        version: '1.0.0',
        endpoints: {
            folders: '/api/folders',
            tasks: '/api/tasks',
            entities: '/api/entities',
            auth: '/api/auth'
        }
    });
});

module.exports = router;
