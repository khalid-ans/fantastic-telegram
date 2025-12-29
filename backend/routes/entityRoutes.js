const express = require('express');
const router = express.Router();
const { Entity } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// GET all entities (user specific)
router.get('/', protect, async (req, res) => {
    try {
        const { type } = req.query;

        const filter = { userId: req.user._id };
        if (type) filter.type = type;

        const entities = await Entity.find(filter).sort({ name: 1 });

        res.json(entities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET entity by Telegram ID (user specific)
router.get('/:telegramId', protect, async (req, res) => {
    try {
        const entity = await Entity.findOne({ telegramId: req.params.telegramId, userId: req.user._id });

        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json(entity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST sync from Telegram (fetch dialogs and save) - Moderator/Admin only
router.post('/sync-telegram', protect, authorize('admin', 'moderator'), async (req, res) => {
    try {
        console.log(`📡 Syncing entities from Telegram for user ${req.user.username}...`);

        // Note: For now, this still uses the global Python server.
        // In a full implementation, we'd pass user-specific tokens to a worker or the python service.
        const axios = require('axios');
        const PYTHON_BASE_URL = 'http://localhost:8000';

        const response = await axios.get(`${PYTHON_BASE_URL}/dialogs`);
        const dialogs = response.data;

        const results = {
            synced: 0,
            deleted: 0,
            errors: []
        };

        const activeTelegramIds = dialogs.map(d => d.telegramId);

        // Save each dialog to database associated with current user
        for (const dialog of dialogs) {
            try {
                await Entity.findOneAndUpdate(
                    { telegramId: dialog.telegramId, userId: req.user._id },
                    {
                        ...dialog,
                        userId: req.user._id,
                        syncedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                results.synced++;
            } catch (err) {
                results.errors.push(`${dialog.name}: ${err.message}`);
            }
        }

        // Cleanup: Delete entities belonging to THIS user that are not in the active list
        const deleteResult = await Entity.deleteMany({
            userId: req.user._id,
            telegramId: { $nin: activeTelegramIds }
        });
        results.deleted = deleteResult.deletedCount;

        res.json({
            message: 'Sync from Telegram completed',
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST sync entities (upsert from frontend) - Moderator/Admin only
router.post('/sync', protect, authorize('admin', 'moderator'), async (req, res) => {
    try {
        const { entities } = req.body;

        if (!entities || !Array.isArray(entities)) {
            return res.status(400).json({ error: 'Entities array is required' });
        }

        const results = {
            created: 0,
            updated: 0,
            errors: []
        };

        for (const entity of entities) {
            try {
                await Entity.findOneAndUpdate(
                    { telegramId: entity.telegramId, userId: req.user._id },
                    {
                        ...entity,
                        userId: req.user._id,
                        syncedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                results.created++;
            } catch (err) {
                results.errors.push(`${entity.telegramId}: ${err.message}`);
            }
        }

        res.json({
            message: 'Sync completed',
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE entity - Moderator/Admin only
router.delete('/:telegramId', protect, authorize('admin', 'moderator'), async (req, res) => {
    try {
        const entity = await Entity.findOneAndDelete({
            telegramId: req.params.telegramId,
            userId: req.user._id
        });

        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json({ message: 'Entity deleted successfully', entity });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
