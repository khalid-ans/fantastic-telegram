const mongoose = require('mongoose');

// ============================================
// Entity Schema (Telegram contacts/groups/channels)
// ============================================
const EntitySchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['user', 'group', 'channel'],
        required: true
    },
    accessHash: {
        type: String,
        default: null
    },
    syncedAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// Folder Schema (Collections of entities)
// ============================================
const FolderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    entityIds: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// Task Schema (Broadcast jobs)
// ============================================
const TaskSchema = new mongoose.Schema({
    taskId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['message', 'poll'],
        required: true
    },
    content: {
        text: String,
        mediaUrl: String,
        pollQuestion: String,
        pollOptions: [String],
        correctOption: Number,
        pollExplanation: String
    },
    folders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    }],
    recipientCount: {
        type: Number,
        default: 0
    },
    scheduledAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'undone', 'partially_completed'],
        default: 'pending'
    },
    results: {
        success: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        errors: [String]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    expiryHours: {
        type: Number,
        default: null
    },
    sentMessages: [{
        recipientId: String,
        messageId: Number,
        metrics: {
            views: { type: Number, default: 0 },
            forwards: { type: Number, default: 0 },
            replies: { type: Number, default: 0 },
            reactions: { type: Number, default: 0 },
            voters: { type: Number, default: 0 },
            updatedAt: { type: Date, default: Date.now }
        }
    }]
});

// ============================================
// Settings Schema (Global configuration)
// ============================================
const SettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create models
const Entity = mongoose.model('Entity', EntitySchema);
const Folder = mongoose.model('Folder', FolderSchema);
const Task = mongoose.model('Task', TaskSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

module.exports = { Entity, Folder, Task, Settings };
