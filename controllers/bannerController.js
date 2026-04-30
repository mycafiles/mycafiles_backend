const Banner = require('../models/Banner');
const { cloudinary } = require('../middleware/uploadMiddleware');
const prisma = require('../config/prisma');

// @desc    Get all active banners (for Mobile App)
// @route   GET /api/banners
// @access  Public (or Client Auth)
exports.getBanners = async (req, res) => {
    try {
        const { caId } = req.query;
        if (!caId) {
            return res.status(400).json({ message: 'CA ID is required' });
        }
        const banners = await prisma.banner.findMany({
            where: { isActive: true, caId },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(banners.map(b => ({ ...b, _id: b.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get active banners by CA ID (Body)
// @route   POST /api/banners/fetch
// @access  Public
exports.getBannersByBody = async (req, res) => {
    try {
        const { caId } = req.body;
        if (!caId) {
            return res.status(400).json({ message: 'CA ID is required in body' });
        }
        const banners = await prisma.banner.findMany({
            where: { isActive: true, caId },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(banners.map(b => ({ ...b, _id: b.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all banners (for Admin)
// @route   GET /api/banners/admin
// @access  Private (Admin)
exports.getAllBannersAdmin = async (req, res) => {
    try {
        const caId = req.user.id;
        const banners = await prisma.banner.findMany({
            where: { caId },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(banners.map(b => ({ ...b, _id: b.id })));
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
        const caId = req.user.id;

        const banner = await prisma.banner.create({
            data: {
                title,
                imageUrl: req.file.path,
                publicId: req.file.filename,
                order: order ? parseInt(order) : 0,
                caId,
                isActive: true
            }
        });
        res.status(201).json({ ...banner, _id: banner.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private (Admin)
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await prisma.banner.findUnique({
            where: { id: req.params.id }
        });
        
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        // Delete from Cloudinary
        if (banner.publicId) {
            await cloudinary.uploader.destroy(banner.publicId);
        }

        await prisma.banner.delete({
            where: { id: req.params.id }
        });
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
        const banner = await prisma.banner.findUnique({
            where: { id: req.params.id }
        });

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        const updatedBanner = await prisma.banner.update({
            where: { id: req.params.id },
            data: {
                isActive: !banner.isActive
            }
        });

        res.json({ ...updatedBanner, _id: updatedBanner.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
