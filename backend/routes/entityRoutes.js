const express = require('express');
const router = express.Router();
const { Entity } = require('../models');
const telegramService = require('../services/telegramService');

// GET all entities
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;

        const filter = type ? { type } : {};
        const entities = await Entity.find(filter).sort({ name: 1 });

        res.json(entities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET entity by Telegram ID
router.get('/:telegramId', async (req, res) => {
    try {
        const entity = await Entity.findOne({ telegramId: req.params.telegramId });

        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json(entity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST sync from Telegram (fetch dialogs and save)
router.post('/sync-telegram', async (req, res) => {
    try {
        console.log('📡 Syncing entities from Telegram...');

        // Fetch dialogs from Telegram
        const dialogs = await telegramService.fetchDialogs();

        const results = {
            synced: 0,
            errors: []
        };

        // Save each dialog to database
        for (const dialog of dialogs) {
            try {
                await Entity.findOneAndUpdate(
                    { telegramId: dialog.telegramId },
                    {
                        ...dialog,
                        syncedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                results.synced++;
            } catch (err) {
                results.errors.push(`${dialog.name}: ${err.message}`);
            }
        }

        console.log(`✅ Synced ${results.synced} entities from Telegram`);

        res.json({
            message: 'Sync from Telegram completed',
            results
        });
    } catch (err) {
        console.error('❌ Telegram sync error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST sync entities (upsert from frontend)
router.post('/sync', async (req, res) => {
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
                    { telegramId: entity.telegramId },
                    {
                        ...entity,
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

// DELETE entity
router.delete('/:telegramId', async (req, res) => {
    try {
        const entity = await Entity.findOneAndDelete({
            telegramId: req.params.telegramId
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
