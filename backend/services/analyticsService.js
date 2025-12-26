const { Task } = require('../models');

/**
 * Get analytics for a specific task (from Database)
 */
const getTaskAnalytics = async (taskId) => {
    const task = await Task.findOne({ taskId });
    if (!task) throw new Error('Task not found');

    const totalSent = task.sentMessages.length;
    const stats = {
        totalViews: 0,
        totalForwards: 0,
        totalReplies: 0,
        totalReactions: 0,
        messages: []
    };

    // Use stored metrics from database (populated by background worker)
    for (const sentMsg of task.sentMessages) {
        const metrics = sentMsg.metrics || {};
        const views = metrics.views || 0;
        const forwards = metrics.forwards || 0;
        const replies = metrics.replies || 0;
        const reactions = metrics.reactions || 0;

        stats.totalViews += views;
        stats.totalForwards += forwards;
        stats.totalReplies += replies;
        stats.totalReactions += reactions;

        stats.messages.push({
            recipientId: sentMsg.recipientId,
            id: sentMsg.messageId,
            views,
            forwards,
            replies,
            reactions,
            lastSyncedAt: metrics.updatedAt
        });
    }

    return {
        taskName: task.name,
        totalSent,
        recipientCount: task.recipientCount,
        ...stats,
        // Calculate averages if needed
        avgViews: totalSent > 0 ? (stats.totalViews / totalSent).toFixed(1) : 0
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
        'Voters',
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
                    msg.metrics?.voters || 0,
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
