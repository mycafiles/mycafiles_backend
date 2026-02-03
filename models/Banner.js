const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    publicId: { type: String, required: true }, // For deletion
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    caId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banner', bannerSchema);
