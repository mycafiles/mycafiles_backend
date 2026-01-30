const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  category: {
    type: String,
    enum: ['ITR', 'GST', 'TAN', 'KYC'],
    required: true
  },
  parentFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // null means it is a Root folder (e.g., "2023-2024")
  },
  path: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
    name: String
  }],
}, { timestamps: true });

// INDEX: Speeds up "Open Folder" queries massively
folderSchema.index({ clientId: 1, parentFolderId: 1 });

module.exports = mongoose.models.Folder || mongoose.model('Folder', folderSchema);