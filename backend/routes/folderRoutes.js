const express = require('express');
const router = express.Router();
const { Folder, Entity } = require('../models');

// GET all folders
router.get('/', async (req, res) => {
    try {
        const folders = await Folder.find().sort({ createdAt: -1 });
        res.json(folders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single folder by ID
router.get('/:id', async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        res.json(folder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create new folder
router.post('/', async (req, res) => {
    try {
        const { name, description, entityIds } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Folder name is required' });
        }

        const folder = new Folder({
            name,
            description: description || '',
            entityIds: entityIds || []
        });

        await folder.save();
        res.status(201).json(folder);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Folder name already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT update folder
router.put('/:id', async (req, res) => {
    try {
        const { name, description, entityIds } = req.body;

        const folder = await Folder.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                entityIds,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        res.json(folder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE folder
router.delete('/:id', async (req, res) => {
    try {
        const folder = await Folder.findByIdAndDelete(req.params.id);

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        res.json({ message: 'Folder deleted successfully', folder });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET entities in a folder
router.get('/:id/entities', async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const entities = await Entity.find({
            telegramId: { $in: folder.entityIds }
        });

        res.json(entities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
