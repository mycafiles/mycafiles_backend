const mongoose = require('mongoose');

const loginRequestSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    deviceId: { type: String, required: true }, // Unique ID from App
    deviceName: { type: String }, // Human readable device name
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'], // CA controls this [cite: 57]
        default: 'PENDING'
    },
    requestDate: { type: Date, default: Date.now }
});

module.exports = mongoose.models.LoginRequest || mongoose.model('LoginRequest', loginRequestSchema);