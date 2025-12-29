const express = require('express');
const router = express.Router();
const { User, Task, Folder, Entity } = require('../models');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 */
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Approve or reject a moderator (Admin only)
 */
router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.status = status;
        await user.save();

        res.json({ message: `User status updated to ${status}`, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   GET /api/users/:id/stats
 * @desc    Get detailed stats for a specific user (Admin only)
 */
router.get('/:id/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const taskCount = await Task.countDocuments({ userId });
        const folderCount = await Folder.countDocuments({ userId });
        const entityCount = await Entity.countDocuments({ userId });

        const latestTasks = await Task.find({ userId }).sort({ createdAt: -1 }).limit(5);

        res.json({
            taskCount,
            folderCount,
            entityCount,
            latestTasks
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user and their data (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const userId = req.params.id;

        // Delete user's data
        await Task.deleteMany({ userId });
        await Folder.deleteMany({ userId });
        await Entity.deleteMany({ userId });

        // Delete user
        await User.findByIdAndDelete(userId);

        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
