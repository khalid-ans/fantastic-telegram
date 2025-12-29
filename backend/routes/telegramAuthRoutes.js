const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');

const PYTHON_BASE_URL = 'http://localhost:8000';

/**
 * Helper to make requests to Python service with User ID header and credentials
 */
const pyRequest = async (method, url, data = null, req) => {
    const headers = {
        'X-User-Id': req.user._id.toString()
    };

    // Include API credentials if available in user object (check nested and root for compatibility)
    const payload = data || {};
    const apiId = req.user.telegramConfig?.apiId || req.user.telegramApiId;
    const apiHash = req.user.telegramConfig?.apiHash || req.user.telegramApiHash;

    if (apiId && apiHash) {
        payload.api_id = apiId;
        payload.api_hash = apiHash;
    }

    return await axios({
        method,
        url: `${PYTHON_BASE_URL}${url}`,
        data: method === 'GET' ? null : payload,
        params: method === 'GET' ? payload : null,
        headers
    });
};

// POST /api/telegram-auth/send-code
router.post('/send-code', protect, async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        console.log(`📱 [User:${req.user.username}] Requesting code for ${phoneNumber} via Python Service...`);

        const response = await pyRequest('POST', '/auth/request-code', { phone: phoneNumber }, req);
        res.json(response.data);
    } catch (err) {
        console.error('Failed to send code:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// POST /api/telegram-auth/sign-in
router.post('/sign-in', protect, async (req, res) => {
    try {
        console.log(`🔐 [User:${req.user.username}] Signing in to Telegram...`);
        const { phone, code, phoneCodeHash } = req.body;

        const payload = {
            phone,
            code,
            phone_code_hash: phoneCodeHash
        };

        const response = await pyRequest('POST', '/auth/sign-in', payload, req);
        res.json(response.data);
    } catch (err) {
        console.error('Sign in failed:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// POST /api/telegram-auth/logout
router.post('/logout', protect, async (req, res) => {
    try {
        console.log(`🔓 [User:${req.user.username}] Logging out of Telegram...`);
        const response = await pyRequest('POST', '/auth/logout', null, req);
        res.json(response.data);
    } catch (err) {
        console.error('Logout failed:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// GET /api/telegram-auth/status
router.get('/status', protect, async (req, res) => {
    try {
        // Check Python Service Status for THIS user
        let pythonStatus = { configured: false, authorized: false };
        try {
            const pyRes = await pyRequest('GET', '/', null, req);
            pythonStatus = pyRes.data;
        } catch (e) {
            console.log(`Python service unreachable or not init for ${req.user.username}`);
        }

        const config = req.user.telegramConfig || {};
        const apiId = config.apiId || req.user.telegramApiId;
        const apiHash = config.apiHash || req.user.telegramApiHash;

        res.json({
            connected: pythonStatus.authorized, // True if user is logged in
            configured: !!(apiId && apiHash),
            serviceRunning: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

