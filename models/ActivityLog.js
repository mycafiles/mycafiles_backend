const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    caId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'CREATE_CLIENT',
            'UPDATE_CLIENT',
            'DELETE_CLIENT',
            'GENERATE_FOLDERS',
            'UPLOAD_FILE',
            'DELETE_FILE',
            'RESTORE_FILE',
            'PERMANENT_DELETE_FILE',
            'CREATE_FOLDER',
            'DELETE_FOLDER',
            'RESTORE_FOLDER',
            'PERMANENT_DELETE_FOLDER',
            'LOGIN',
            'CA_REGISTER',
            'UPDATE_PROFILE',
            'APPROVE_DEVICE',
            'REJECT_DEVICE'
        ]
    },
    details: {
        type: String,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    clientName: {
        type: String
    },
    docId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    },
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    },
    ipAddress: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for faster queries
activityLogSchema.index({ caId: 1, timestamp: -1 });

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
