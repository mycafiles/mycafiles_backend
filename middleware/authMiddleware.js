const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const protect = catchAsync(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
        logger.debug("Token extracted from query params");
    }

    if (!token || token === 'null' || token === 'undefined') {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // Verify token
    let decoded;
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    try {
        decoded = jwt.verify(token, secret);
        logger.debug("Decoded Token:", decoded);
    } catch (err) {
        logger.error(`[AUTH_ERR] Token verification failed: ${err.message}`);
        return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }

    // Check if user still exists in either User or Client table
    let currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!currentUser) {
        // Search in Client table if not found in User table
        const client = await prisma.client.findUnique({ where: { id: decoded.id } });
        if (client) {
            currentUser = { ...client, role: 'CUSTOMER' };
        }
    }

    if (!currentUser) {
        return next(
            new AppError(
                'The user/client belonging to this token no longer exists.',
                401
            )
        );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = { ...currentUser, _id: currentUser.id };
    next();
});

const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'SUPERADMIN' || req.user.role === 'CAADMIN')) {
        next();
    } else {
        return next(new AppError('Not authorized as an admin', 403));
    }
};

module.exports = { protect, admin };
