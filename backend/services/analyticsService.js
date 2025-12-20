const { getClient } = require('./telegramService');
const { Task } = require('../models');

/**
 * Fetch stats for a list of message IDs from a specific chat (peer)
 * @param {string|number} peerId - The chat/channel ID
 * @param {Array<number>} messageIds - Array of message IDs
 */
const getMessageStats = async (peerId, messageIds) => {
    try {
        const client = await getClient();
        if (!client.connected) await client.connect();

        const messages = await client.getMessages(peerId, { ids: messageIds });

        return messages.map(msg => ({
            id: msg.id,
            views: msg.views || 0,
            forwards: msg.forwards || 0,
            replies: msg.replies?.replies || 0,
            reactions: msg.reactions?.results?.reduce((acc, r) => acc + r.count, 0) || 0,
            date: msg.date
        }));
    } catch (err) {
        console.error(`Failed to fetch stats for peer ${peerId}:`, err.message);
        return [];
    }
};

/**
 * Get analytics for a specific task
 */
const getTaskAnalytics = async (taskId) => {
    const task = await Task.findOne({ taskId });
    if (!task) throw new Error('Task not found');

    const totalSent = task.sentMessages.length;
    const stats = {
        totalViews: 0,
        totalForwards: 0,
        totalReplies: 0,
        messages: []
    };

    // Group messages by recipient (peer) to start batch requests
    // However, for broadcast, each recipient is a different peer. 
    // We must iterate. This might be slow for large broadcasts.
    // Optimization: Telegram API limits apply.

    // For MVP, we'll fetch stats for up to 50 messages to avoid rate limits
    const limit = 50;
    const messagesToCheck = task.sentMessages.slice(0, limit);

    for (const sentMsg of messagesToCheck) {
        try {
            const [msgData] = await getMessageStats(sentMsg.recipientId, [sentMsg.messageId]);
            if (msgData) {
                stats.totalViews += msgData.views;
                stats.totalForwards += msgData.forwards;
                stats.totalReplies += msgData.replies;
                stats.messages.push({
                    recipientId: sentMsg.recipientId,
                    ...msgData
                });
            }
        } catch (e) {
            // Ignore individual fetch errors
        }
    }

    return {
        taskName: task.name,
        totalSent,
        recipientCount: task.recipientCount,
        ...stats
    };
};

/**
 * Generate CSV Data for all tasks with message-level detail
 */
const exportAnalytics = async () => {
    const tasks = await Task.find({}).sort({ createdAt: -1 });

    const headers = [
        'Task ID',
        'Task Name',
        'Chat ID',
        'Message ID',
        'Status',
        'Views',
        'Forwards',
        'Reactions',
        'Comments',
        'Last Updated'
    ];

    const rows = [];

    tasks.forEach(t => {
        if (!t.sentMessages || t.sentMessages.length === 0) {
            // Add a row for the task itself if no messages were sent or recorded yet
            rows.push([
                t.taskId,
                t.name,
                'N/A',
                'N/A',
                t.status,
                0,
                0,
                0,
                0,
                t.createdAt.toISOString()
            ]);
        } else {
            t.sentMessages.forEach(msg => {
                rows.push([
                    t.taskId,
                    t.name,
                    msg.recipientId,
                    msg.messageId,
                    'sent', // Implicitly sent if in sentMessages
                    msg.metrics?.views || 0,
                    msg.metrics?.forwards || 0,
                    msg.metrics?.reactions || 0,
                    msg.metrics?.replies || 0,
                    msg.metrics?.updatedAt ? msg.metrics.updatedAt.toISOString() : 'N/A'
                ]);
            });
        }
    });

    // Simple CSV construction with escaping
    const escapeCSV = (str) => {
        if (typeof str !== 'string') str = String(str);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(r => r.map(escapeCSV).join(','))
    ].join('\n');

    return csvContent;
};

module.exports = {
    getTaskAnalytics,
    exportAnalytics
};
