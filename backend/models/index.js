const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============================================
// User Schema (RBAC and Multi-tenancy)
// ============================================
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'moderator', 'viewer'],
        default: 'viewer'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // Telegram Configuration per User (Nested - New)
    telegramConfig: {
        apiId: { type: String, default: '' },
        apiHash: { type: String, default: '' },
        botToken: { type: String, default: '' },
        sessionString: { type: String, default: '' }
    },
    // Legacy support for root-level fields
    telegramApiId: { type: String },
    telegramApiHash: { type: String },
    telegramBotToken: { type: String },
    telegramSession: { type: String },
    phoneNumber: { type: String },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// ============================================
// Entity Schema (Telegram contacts/groups/channels)
// ============================================
const EntitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    telegramId: {
        type: String,
        required: true
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

// Compound index to ensure telegramId is unique per user
EntitySchema.index({ telegramId: 1, userId: 1 }, { unique: true });

// ============================================
// Folder Schema (Collections of entities)
// ============================================
const FolderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
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

// Compound index to ensure folder names are unique per user
FolderSchema.index({ name: 1, userId: 1 }, { unique: true });

// ============================================
// Task Schema (Broadcast jobs)
// ============================================
const TaskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sentByUsername: {
        type: String,
        required: true
    },
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
// Settings Schema (Global configuration - Optional)
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
const User = mongoose.model('User', UserSchema);
const Entity = mongoose.model('Entity', EntitySchema);
const Folder = mongoose.model('Folder', FolderSchema);
const Task = mongoose.model('Task', TaskSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

module.exports = { User, Entity, Folder, Task, Settings };
