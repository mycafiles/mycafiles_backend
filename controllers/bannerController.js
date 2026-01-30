const Banner = require('../models/Banner');
const { cloudinary } = require('../middleware/uploadMiddleware');

// @desc    Get all active banners (for Mobile App)
// @route   GET /api/banners
// @access  Public (or Client Auth)
exports.getBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all banners (for Admin)
// @route   GET /api/banners/admin
// @access  Private (Admin)
exports.getAllBannersAdmin = async (req, res) => {
    try {
        const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new banner
// @route   POST /api/banners
// @access  Private (Admin)
exports.createBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        const { title, order } = req.body;
        const banner = await Banner.create({
            title,
            imageUrl: req.file.path,
            publicId: req.file.filename,
            order: order || 0
        });
        res.status(201).json(banner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private (Admin)
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        // Delete from Cloudinary
        if (banner.publicId) {
            await cloudinary.uploader.destroy(banner.publicId);
        }

        await banner.deleteOne();
        res.json({ message: 'Banner removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle banner status
// @route   PATCH /api/banners/:id/toggle
// @access  Private (Admin)
exports.toggleBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        banner.isActive = !banner.isActive;
        await banner.save();
        res.json(banner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
