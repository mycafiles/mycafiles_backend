const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    }, // The Cloudinary secure_url
    cloudinaryId: {
        type: String,
        required: true
    }, // REQUIRED for deletion
    fileType: {
        type: String
    },
    fileSize: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: String,
        enum: ['CA', 'CUSTOMER'],
        required: true
    },
    category: {
        type: String,
        enum: ['GENERAL', 'GST'],
        default: 'GENERAL'
    }
}, { timestamps: true });

documentSchema.index({ clientId: 1 });

module.exports = mongoose.model('Document', documentSchema);