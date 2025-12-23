const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Settings } = require('../models');

const PYTHON_BASE_URL = 'http://localhost:8000';

// POST /api/auth/send-code
router.post('/send-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        console.log(`📱 Requesting code for ${phoneNumber} via Python Service...`);

        const response = await axios.post(`${PYTHON_BASE_URL}/auth/request-code`, { phone: phoneNumber });
        res.json(response.data);
    } catch (err) {
        console.error('Failed to send code:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// POST /api/auth/sign-in
router.post('/sign-in', async (req, res) => {
    try {
        console.log(`🔐 Signing in...`);
        const response = await axios.post(`${PYTHON_BASE_URL}/auth/sign-in`, req.body);

        // Save session string if returned (though Python manages session file now)
        // We might just need the user info

        res.json(response.data);
    } catch (err) {
        console.error('Sign in failed:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        console.log(`🔓 Logging out...`);
        const response = await axios.post(`${PYTHON_BASE_URL}/auth/logout`);
        res.json(response.data);
    } catch (err) {
        console.error('Logout failed:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// GET /api/auth/status
router.get('/status', async (req, res) => {
    try {
        // Check Python Service Status
        let pythonStatus = { configured: false, authorized: false };
        try {
            const pyRes = await axios.get(`${PYTHON_BASE_URL}/`);
            pythonStatus = pyRes.data;
        } catch (e) {
            console.log("Python service unreachable");
        }

        // Check DB for Settings
        const apiId = await Settings.findOne({ key: 'api_id' });

        res.json({
            connected: pythonStatus.authorized, // True if user is logged in
            configured: !!apiId || pythonStatus.configured, // True if API Keys exist
            serviceRunning: !!pythonStatus.service
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

