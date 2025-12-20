const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Settings } = require('../models');

// Configuration
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const botToken = process.env.BOT_TOKEN;

// Session storage (In memory for now, session string will be persisted to database)
let sessionString = null; // Initialize as null to force DB check
let client = null;

/**
 * Get or create Telegram client
 * @param {string} customSession Optional session string to override
 */
const getClient = async (customSession = null) => {
    // 1. Try to load session from Source of Truth (Database or Memory)
    if (!customSession && !sessionString) {
        const dbSession = await Settings.findOne({ key: 'telegram_session' });
        if (dbSession && dbSession.value) {
            sessionString = dbSession.value;
            console.log('📦 Loaded Telegram User session from database');
        } else if (process.env.TELEGRAM_SESSION) {
            sessionString = process.env.TELEGRAM_SESSION;
            console.log('📦 Loaded Telegram User session from .env');
        }
    }

    const activeSession = customSession || sessionString;

    // 2. If we have an active client already, reuse it
    if (client && client.connected && !customSession) {
        return client;
    }

    // 3. Disconnect old client if we are establishing a new one
    if (client) {
        try { await client.disconnect(); } catch (e) { }
    }

    // 4. Case A: Establish User Client (Prioritized for Analytics/Dialogs)
    if (activeSession) {
        client = new TelegramClient(new StringSession(activeSession), apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
        return client;
    }

    // 5. Case B: Establish Bot Client (Fallback for basic metadata if no user logged in)
    if (botToken) {
        client = new TelegramClient(new StringSession(""), apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.start({
            botAuthToken: botToken.trim(),
        });
        return client;
    }

    // 6. Case C: Empty client
    client = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 5,
    });
    return client;
};

/**
 * Step 1: Send verification code to phone number
 */
const sendCode = async (phoneNumber) => {
    // ... existing implementation ...
    const tempClient = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 5,
    });
    await tempClient.connect();

    const { phoneCodeHash } = await tempClient.sendCode(
        { apiId, apiHash },
        phoneNumber
    );

    client = tempClient;
    return phoneCodeHash;
};

/**
 * Step 2: Sign in with the verification code
 */
const signIn = async (phoneNumber, phoneCodeHash, phoneCode) => {
    if (!client) {
        // Should rely on temp client from sendCode, or create new one
        client = new TelegramClient(new StringSession(""), apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
    }

    try {
        await client.invoke(new Api.auth.SignIn({
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: phoneCode,
        }));

        // Save session
        sessionString = client.session.save();

        // Persist to DB
        await Settings.findOneAndUpdate(
            { key: 'telegram_session' },
            { value: sessionString },
            { upsert: true, new: true }
        );

        console.log('✅ User signed in successfully');
        return sessionString;
    } catch (err) {
        console.error('Sign in error:', err);
        throw err;
    }
};

/**
 * Check connection status and return user/bot info
 */
const getStatus = async () => {
    try {
        const client = await getClient();
        if (!client && !botToken) return { connected: false, error: "No session or token found" };

        if (client && !client.connected) await client.connect();

        const me = await client.getMe();
        const isUserSession = !!sessionString || !!process.env.TELEGRAM_SESSION;

        if (!me) {
            return {
                connected: false,
                mode: isUserSession ? 'User (Session present but invalid)' : 'Anonymous',
                botApiStatus: !!botToken ? 'Configured' : 'Missing'
            };
        }

        return {
            connected: true,
            user: {
                firstName: me.firstName,
                lastName: me.lastName,
                username: me.username,
                phone: me.phone,
                id: me.id.toString(),
                isBot: me.bot || false
            },
            mode: isUserSession ? 'User (Permanent)' : 'Bot (Limited)',
            botApiStatus: !!botToken ? 'Configured' : 'Missing'
        };
    } catch (err) {
        console.error('Status check failed:', err.message);
        return { connected: false, error: err.message };
    }
};

/**
 * Send broadcast messages or polls via Bot API (more reliable for groups)
 */
const sendBroadcast = async (recipientIds, type, content) => {
    const results = {
        success: 0,
        failed: 0,
        errors: [],
        sentMessages: []
    };

    if (!botToken) {
        throw new Error("BOT_TOKEN is missing. Bot API sending requires a token.");
    }

    const trimmedToken = botToken.trim();
    const baseUrl = `https://api.telegram.org/bot${trimmedToken}`;
    const fs = require('fs');
    const path = require('path');

    for (const recipientId of recipientIds) {
        try {
            let endpoint;
            let payload = {
                chat_id: recipientId,
                parse_mode: 'HTML'
            };
            let isMultipart = false;
            let formData = null;

            if (type === 'message') {
                if (content.mediaUrl) {
                    // Remove leading slash if present to avoid absolute path issues on Windows
                    const relativeMediaUrl = content.mediaUrl.startsWith('/') ? content.mediaUrl.slice(1) : content.mediaUrl;
                    const filePath = path.join(__dirname, '..', relativeMediaUrl);

                    if (fs.existsSync(filePath)) {
                        const ext = path.extname(filePath).toLowerCase();
                        let mediaType = 'document'; // Default to document
                        let fieldName = 'document';

                        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                            mediaType = 'photo';
                            fieldName = 'photo';
                        } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
                            mediaType = 'video';
                            fieldName = 'video';
                        }

                        endpoint = `${baseUrl}/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;

                        // Use global FormData (Node 18+)
                        formData = new FormData();
                        formData.append('chat_id', recipientId);
                        formData.append('caption', content.text || '');
                        formData.append('parse_mode', 'HTML');

                        const blob = await fs.openAsBlob(filePath);
                        formData.append(fieldName, blob, path.basename(filePath));
                        isMultipart = true;
                    } else {
                        // Fallback to text if file missing
                        endpoint = `${baseUrl}/sendMessage`;
                        payload.text = (content.text || '') + "\n\n(Error: Media file not found)";
                    }
                } else {
                    endpoint = `${baseUrl}/sendMessage`;
                    payload.text = content.text || '';
                }
            } else if (type === 'poll') {
                endpoint = `${baseUrl}/sendPoll`;
                payload.question = content.pollQuestion;
                payload.options = JSON.stringify(content.pollOptions);
                payload.is_anonymous = true;
                payload.type = 'quiz';
                payload.correct_option_id = content.correctOption;
                payload.explanation = content.pollExplanation || "";
            }

            console.log(`📡 Bot API: Sending ${type} to ${recipientId}...`);

            let res;
            if (isMultipart) {
                res = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });
            } else {
                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await res.json();

            if (data.ok) {
                console.log(`✅ Bot API Success: ${recipientId}, msgId: ${data.result.message_id}`);
                results.success++;
                results.sentMessages.push({
                    recipientId: recipientId.toString(),
                    messageId: data.result.message_id
                });
            } else {
                const errorDescription = data.description || "Unknown Bot API error";
                const errorCode = data.error_code || "N/A";
                console.error(`❌ Bot API Error for ${recipientId}: [${errorCode}] ${errorDescription}`);
                throw new Error(errorDescription);
            }

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (err) {
            results.failed++;
            const errorMsg = `Failed to send to ${recipientId} via Bot API: ${err.message}`;
            results.errors.push(errorMsg);
            console.error(errorMsg);
        }
    }
    return results;
};

/**
 * Delete specific messages (Undo/Expiry)
 */
const deleteMessages = async (messages) => {
    const client = await getClient();
    if (!client.connected) await client.connect();

    const results = { success: 0, failed: 0, errors: [] };

    for (const msg of messages) {
        try {
            // Resolve proper Telegram peer for the stored recipient id
            // This is more robust than passing the raw string/id directly.
            const peer = await client.getInputEntity(msg.recipientId);

            // deleteMessages takes (peer, [messageIds], { revoke: true })
            await client.deleteMessages(peer, [msg.messageId], { revoke: true });
            results.success++;
        } catch (err) {
            const errorMsg = `Failed to delete message ${msg.messageId} for ${msg.recipientId}: ${err.message}`;
            console.error(errorMsg);
            results.failed++;
            results.errors.push(errorMsg);
        }
    }
    return results;
};

/**
 * Fetch all dialogs (contacts, groups, channels)
 */
const fetchDialogs = async () => {
    try {
        const client = await getClient();
        if (!client.connected) await client.connect();

        const dialogs = await client.getDialogs();

        return dialogs.map(dialog => ({
            telegramId: dialog.id.toString(),
            name: dialog.title || dialog.name || 'Unknown',
            username: dialog.entity?.username || null,
            type: dialog.isChannel ? 'channel' : dialog.isGroup ? 'group' : 'user',
            accessHash: dialog.entity?.accessHash?.toString() || null
        }));
    } catch (err) {
        console.error('Failed to fetch dialogs:', err.message);
        return [];
    }
};

/**
 * Fetch and update engagement metrics for a task using MTProto user client
 */
const updateMetrics = async (taskId) => {
    try {
        const { Task } = require('../models');
        const task = await Task.findOne({ taskId });
        if (!task || !task.sentMessages.length) return { success: false, error: "Task or messages not found" };

        const client = await getClient();
        if (!client.connected) await client.connect();

        let updatedCount = 0;

        for (const msg of task.sentMessages) {
            try {
                // Get fresh message data
                const messages = await client.getMessages(msg.recipientId, {
                    ids: [msg.messageId]
                });

                if (messages && messages[0]) {
                    const m = messages[0];

                    // Views & Forwards are directly on the message object
                    msg.metrics.views = m.views || 0;
                    msg.metrics.forwards = m.forwards || 0;

                    // Replies count
                    msg.metrics.replies = m.replies?.replies || 0;

                    // Reactions count (sum of all interaction counts)
                    if (m.reactions && m.reactions.results) {
                        msg.metrics.reactions = m.reactions.results.reduce((sum, r) => sum + r.count, 0);
                    } else {
                        msg.metrics.reactions = 0;
                    }

                    msg.metrics.updatedAt = new Date();
                    updatedCount++;
                }
            } catch (err) {
                console.error(`Failed to update metrics for msg ${msg.messageId}: ${err.message}`);
            }
        }

        if (updatedCount > 0) {
            await task.save();
        }

        return { success: true, updatedCount };
    } catch (err) {
        console.error('Metrics update failed:', err);
        throw err;
    }
};

module.exports = {
    getClient,
    sendCode,
    signIn,
    getStatus,
    sendBroadcast,
    fetchDialogs,
    deleteMessages,
    updateMetrics
};
