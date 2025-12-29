const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { protect } = require('../middleware/auth');
const axios = require('axios');

const PYTHON_BASE_URL = 'http://localhost:8000';

/**
 * Generate JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d'
    });
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 */
router.post('/signup', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Validate role (Admin cannot be created via signup)
        if (role === 'admin') {
            return res.status(400).json({ error: 'Admin users cannot be created via signup' });
        }

        // Create user
        const user = await User.create({
            username,
            password,
            role: role || 'viewer',
            status: role === 'moderator' ? 'pending' : 'approved'
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        console.log(`🔑 Login attempt for user: ${username}`);
        const user = await User.findOne({ username });

        if (!user) {
            console.warn(`❌ Login failed: User ${username} not found`);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        if (!(await user.comparePassword(password))) {
            console.warn(`❌ Login failed: Incorrect password for ${username}`);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        console.log(`✅ Login successful for ${username}`);

        res.json({
            token: generateToken(user._id),
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 */
router.get('/me', protect, async (req, res) => {
    try {
        const config = req.user.telegramConfig || {};
        const apiId = config.apiId || req.user.telegramApiId;
        const botToken = config.botToken || req.user.telegramBotToken;

        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                role: req.user.role,
                status: req.user.status,
                telegramConfigured: !!(apiId && botToken),
                // Include config for frontend to populate settings
                telegramConfig: req.user.telegramConfig,
                telegramApiId: req.user.telegramApiId,
                telegramApiHash: req.user.telegramApiHash,
                telegramBotToken: req.user.telegramBotToken
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   POST /api/auth/save-telegram-config (Moderator setup)
 * @desc    Save Telegram API credentials for the current user
 */
router.post('/save-telegram-config', protect, async (req, res) => {
    try {
        const { apiId, apiHash, botToken } = req.body;

        console.log(`💾 Saving Telegram config for user: ${req.user.username}`);

        // Use set() to ensure Mongoose tracks the changes to the nested object
        req.user.set('telegramConfig.apiId', apiId);
        req.user.set('telegramConfig.apiHash', apiHash);
        req.user.set('telegramConfig.botToken', botToken);

        await req.user.save();

        // Notify Python Service to setup credentials for this user
        try {
            console.log(`📣 Notifying Python service for user: ${req.user._id}`);
            await axios.post(`${PYTHON_BASE_URL}/auth/setup`,
                { api_id: apiId, api_hash: apiHash },
                { headers: { 'X-User-Id': req.user._id.toString() } }
            );
        } catch (pyErr) {
            console.error('Failed to notify Python service about credentials update:', pyErr.message);
        }

        res.json({ message: 'Telegram configuration saved' });
    } catch (err) {
        console.error('Error saving telegram config:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
