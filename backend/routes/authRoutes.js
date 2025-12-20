const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');

// Memory storage for phoneCodeHash (in production, use Redis or session)
let currentPhoneCodeHash = null;
let currentPhoneNumber = null;

// POST /api/auth/send-code
router.post('/send-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        console.log(`📱 Sending code to ${phoneNumber}...`);
        const phoneCodeHash = await telegramService.sendCode(phoneNumber);

        currentPhoneNumber = phoneNumber;
        currentPhoneCodeHash = phoneCodeHash;

        res.json({ message: 'Code sent successfully', phoneCodeHash });
    } catch (err) {
        console.error('Failed to send code:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/sign-in
router.post('/sign-in', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        if (!currentPhoneNumber || !currentPhoneCodeHash) {
            return res.status(400).json({ error: 'No active login session. Send code first.' });
        }

        console.log(`🔐 Signing in with code for ${currentPhoneNumber}...`);
        const sessionString = await telegramService.signIn(
            currentPhoneNumber,
            currentPhoneCodeHash,
            code
        );

        // Reset temporary storage
        currentPhoneNumber = null;
        currentPhoneCodeHash = null;

        res.json({
            message: 'Signed in successfully',
            session: sessionString
        });
    } catch (err) {
        console.error('Sign in failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/status
router.get('/status', async (req, res) => {
    try {
        const status = await telegramService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
