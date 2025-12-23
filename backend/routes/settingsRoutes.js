const express = require('express');
const router = express.Router();
const { Settings } = require('../models');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// PYTHON SERVICE URL
const PYTHON_AUTH_URL = 'http://localhost:8000/auth/setup';

// POST /api/settings
router.post('/', async (req, res) => {
    try {
        const { apiId, apiHash, botToken } = req.body;

        if (!apiId || !apiHash || !botToken) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // 1. Save to Database
        await Settings.findOneAndUpdate({ key: 'api_id' }, { value: apiId }, { upsert: true });
        await Settings.findOneAndUpdate({ key: 'api_hash' }, { value: apiHash }, { upsert: true });
        await Settings.findOneAndUpdate({ key: 'bot_token' }, { value: botToken }, { upsert: true });

        // 2. Update .env file (for persistence across restarts)
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = '';

        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        const updateEnvVar = (key, val) => {
            const regex = new RegExp(`^${key}=.*`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${val}`);
            } else {
                envContent += `\n${key}=${val}`;
            }
        };

        updateEnvVar('API_ID', apiId);
        updateEnvVar('API_HASH', apiHash);
        updateEnvVar('BOT_TOKEN', botToken);

        fs.writeFileSync(envPath, envContent.trim());

        // 3. Notify Python Service to reload credentials
        try {
            await axios.post(PYTHON_AUTH_URL, {
                api_id: apiId,
                api_hash: apiHash
            });
            console.log("✅ Python service credentials updated");
        } catch (pyErr) {
            console.error("⚠️ Failed to update Python service:", pyErr.message);
            // Don't fail the request, just warn (user might need to restart python manually if this fails)
        }

        res.json({ message: 'Settings saved successfully' });
    } catch (err) {
        console.error('Settings save failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const apiId = await Settings.findOne({ key: 'api_id' });
        const apiHash = await Settings.findOne({ key: 'api_hash' });
        const botToken = await Settings.findOne({ key: 'bot_token' });

        res.json({
            apiId: apiId?.value || '',
            apiHash: apiHash?.value || '',
            botToken: botToken?.value || ''
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
