const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { protect, authorize } = require('../middleware/auth');

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

// POST /api/analytics/growth
router.post('/growth', protect, async (req, res) => {
    try {
        const { channelId, days } = req.body;
        // Proxy to Python Service
        const axios = require('axios');
        const pythonUrl = 'http://localhost:8000/analytics/growth';

        const payload = {
            channel_id: channelId,
            days: days || 30
        };

        // Include credentials for multi-tenancy
        if (req.user.telegramConfig && req.user.telegramConfig.apiId) {
            payload.api_id = req.user.telegramConfig.apiId;
            payload.api_hash = req.user.telegramConfig.apiHash;
        }

        const response = await axios.post(pythonUrl, payload, {
            headers: { 'X-User-Id': req.user._id.toString() }
        });

        res.json(response.data);
    } catch (err) {
        console.error("Growth Analytics Error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});

module.exports = router;
