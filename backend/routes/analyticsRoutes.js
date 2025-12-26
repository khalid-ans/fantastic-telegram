const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

// GET /api/analytics/export
router.get('/export', async (req, res) => {
    try {
        const csv = await analyticsService.exportAnalytics();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=broadcast-analytics.csv');
        // Add BOM for Excel compatibility
        res.send('\uFEFF' + csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/:taskId
router.get('/:taskId', async (req, res) => {
    try {
        const data = await analyticsService.getTaskAnalytics(req.params.taskId);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
