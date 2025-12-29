const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

/**
 * Get Telegram client for a specific user config
 * @param {Object} config { apiId, apiHash, botToken, session }
 */
const getClient = async (config) => {
    const { apiId, apiHash, botToken, session } = config;

    if (!apiId || !apiHash) {
        throw new Error("Telegram API ID and Hash are required. Please configure them in Settings.");
    }

    // Case A: Establish User Client (Prioritized for Analytics/Dialogs)
    if (session) {
        const client = new TelegramClient(new StringSession(session), parseInt(apiId), apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
        return client;
    }

    // Case B: Establish Bot Client (Fallback)
    if (botToken) {
        const client = new TelegramClient(new StringSession(""), parseInt(apiId), apiHash, {
            connectionRetries: 5,
        });
        await client.start({
            botAuthToken: botToken.trim(),
        });
        return client;
    }

    // Case C: Empty client
    const client = new TelegramClient(new StringSession(""), parseInt(apiId), apiHash, {
        connectionRetries: 5,
    });
    return client;
};

/**
 * Send broadcast messages or polls via Bot API
 */
const sendBroadcast = async (recipientIds, type, content, config) => {
    const { botToken } = config;
    const results = {
        success: 0,
        failed: 0,
        errors: [],
        sentMessages: []
    };

    if (!botToken) {
        throw new Error("Bot Token is missing for this user. Please configure it in Settings.");
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
                    const relativeMediaUrl = content.mediaUrl.startsWith('/') ? content.mediaUrl.slice(1) : content.mediaUrl;
                    const filePath = path.join(__dirname, '..', relativeMediaUrl);

                    if (fs.existsSync(filePath)) {
                        const ext = path.extname(filePath).toLowerCase();
                        let mediaType = 'document';
                        let fieldName = 'document';

                        const stats = fs.statSync(filePath);
                        const fileSizeInBytes = stats.size;

                        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) && fileSizeInBytes < 10 * 1024 * 1024) {
                            mediaType = 'photo';
                            fieldName = 'photo';
                        } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
                            mediaType = 'video';
                            fieldName = 'video';
                        }

                        endpoint = `${baseUrl}/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;

                        formData = new FormData();
                        formData.append('chat_id', recipientId);
                        formData.append('caption', content.text || '');
                        formData.append('parse_mode', 'HTML');

                        const blob = await fs.openAsBlob(filePath);
                        formData.append(fieldName, blob, path.basename(filePath));
                        isMultipart = true;
                    } else {
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

            let res;
            if (isMultipart) {
                res = await fetch(endpoint, { method: 'POST', body: formData });
            } else {
                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await res.json();

            if (data.ok) {
                results.success++;
                results.sentMessages.push({
                    recipientId: recipientId.toString(),
                    messageId: data.result.message_id
                });
            } else {
                throw new Error(data.description || "Unknown Bot API error");
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (err) {
            results.failed++;
            results.errors.push(err.message);
        }
    }
    return results;
};

/**
 * Delete specific messages (Undo/Expiry)
 */
const deleteMessages = async (messages, config) => {
    const client = await getClient(config);
    if (!client.connected) await client.connect();

    const results = { success: 0, failed: 0, errors: [] };

    for (const msg of messages) {
        try {
            const peer = await client.getInputEntity(msg.recipientId);

            if (peer.className === 'InputPeerChannel') {
                await client.invoke(
                    new Api.channels.DeleteMessages({
                        channel: peer,
                        id: [msg.messageId]
                    })
                );
            } else {
                await client.invoke(
                    new Api.messages.DeleteMessages({
                        id: [msg.messageId],
                        revoke: true
                    })
                );
            }
            results.success++;
        } catch (err) {
            results.failed++;
            results.errors.push(err.message);
        }
    }
    await client.disconnect();
    return results;
};

/**
 * Fetch and update engagement metrics using Python Service
 */
const updateMetrics = async (taskId, userId) => {
    try {
        const { Task, User } = require('../models');
        const task = await Task.findOne({ taskId });
        if (!task || !task.sentMessages.length) return { success: false, error: "Task not found" };

        const user = await User.findById(userId || task.userId);
        if (!user) return { success: false, error: "User not found" };

        const payload = {
            items: task.sentMessages.map(msg => ({
                recipientId: msg.recipientId,
                messageId: msg.messageId
            }))
        };

        // Include credentials for multi-tenancy
        if (user.telegramConfig && user.telegramConfig.apiId) {
            payload.api_id = user.telegramConfig.apiId;
            payload.api_hash = user.telegramConfig.apiHash;
        }

        const response = await fetch('http://localhost:8000/analytics/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': user._id.toString()
            },
            body: JSON.stringify(payload)
        });
        const batchData = await response.json();

        let updatedCount = 0;
        for (const msg of task.sentMessages) {
            const metrics = batchData[msg.messageId.toString()];
            if (metrics) {
                msg.metrics.views = metrics.views;
                msg.metrics.forwards = metrics.forwards;
                msg.metrics.replies = metrics.replies;
                msg.metrics.reactions = metrics.reactions;
                msg.metrics.voters = metrics.voters;
                msg.metrics.updatedAt = new Date();
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            task.markModified('sentMessages');
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
    sendBroadcast,
    deleteMessages,
    updateMetrics
};
