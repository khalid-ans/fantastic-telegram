const express = require('express');
const router = express.Router();
const { Folder, Entity } = require('../models');
const { protect } = require('../middleware/auth');

// GET all folders (user specific)
router.get('/', protect, async (req, res) => {
    try {
        const folders = await Folder.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(folders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single folder by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        res.json(folder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create new folder
router.post('/', protect, async (req, res) => {
    try {
        const { name, description, entityIds } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Folder name is required' });
        }

        const folder = new Folder({
            name,
            description: description || '',
            entityIds: entityIds || [],
            userId: req.user._id
        });

        await folder.save();
        res.status(201).json(folder);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Folder name already exists for this account' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT update folder
router.put('/:id', protect, async (req, res) => {
    try {
        const { name, description, entityIds } = req.body;

        const folder = await Folder.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
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
router.delete('/:id', protect, async (req, res) => {
    try {
        const folder = await Folder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        res.json({ message: 'Folder deleted successfully', folder });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET entities in a folder
router.get('/:id/entities', protect, async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const entities = await Entity.find({
            telegramId: { $in: folder.entityIds },
            userId: req.user._id
        });

        res.json(entities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
