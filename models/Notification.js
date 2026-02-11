const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['FILE_UPLOAD', 'DEVICE_APPROVAL', 'GENERAL'],
        default: 'GENERAL'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    metadata: {
        docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
