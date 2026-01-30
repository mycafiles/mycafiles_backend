const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    caId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Links to specific CA
    name: { type: String, required: true },
    mobileNumber: { type: String, required: true }, // Login Credential 1 
    panNumber: { type: String, required: true },   // Login Credential 2 
    gstNumber: { type: String },
    tanNumber: { type: String },
    dob: { type: Date, required: true },
    fileNumber: { type: Number, required: true, unique: true }, // Auto-generated 1, 2, 3...
    type: {
        type: String,
        enum: ['INDIVIDUAL', 'BUSINESS'], // ITR only vs ITR+GST [cite: 27, 28]
        required: true
    },
    customFields: {
        type: Map,
        of: String
    },
    isActive: { type: Boolean, default: true },
    deviceId: { type: String },
    deviceStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED'],
        default: 'PENDING'
    },
    allowedDevices: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

// Index for faster login search
clientSchema.index({ mobileNumber: 1, panNumber: 1 });

module.exports = mongoose.models.Client || mongoose.model('Client', clientSchema);