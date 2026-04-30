const User = require('../models/User');
const prisma = require('../config/prisma');
const admin = require('../config/firebase');

const Client = require('../models/Client');
const LoginRequest = require('../models/LoginRequest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');
const sendEmail = require('../services/emailService');
const { createBucket } = require('../services/storageService');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const { generate8DigitUniqueId } = require('../utils/idGenerator');
        const uniqueId = await generate8DigitUniqueId('user');

        const newUser = await User.create({
            name,
            email,
            password,
            role: 'SUPERADMIN',
            uniqueId
        });

        // MinIO: Create Bucket for new CA
        await createBucket(`ca-${newUser.id}`);

        await logActivity({
            caId: newUser.id,
            action: 'CA_REGISTER',
            details: `New CA registered: ${newUser.name} (${newUser.email})`
        });

        const token = generateToken(newUser.id, newUser.role)

        res.status(201).json({
            _id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    CA / Admin Login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await User.matchPassword(password, user.password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    CA / Admin Login
// @route   POST /api/auth/ca-login
// @access  Public
exports.caLogin = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log(email, password, role);

        const user = await prisma.user.findUnique({ where: { email } });
        console.log("user", user);

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.role !== role) {
            logger.info(`User ${user.email} is not a ${role}`);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (user && isMatch) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Client App Login (Phone + PAN)
// @route   POST /api/auth/client-login
// @access  Public
exports.clientLogin = async (req, res) => {
    console.log("req.body", req.body);
    try {
        const { mobileNumber, panNumber } = req.body;
        const deviceId = req.headers['x-device-id'];

        if (!mobileNumber || !panNumber) {
            return res.status(400).json({ message: 'Mobile Number and PAN are required' });
        }

        const client = await prisma.client.findFirst({
            where: {
                mobileNumber,
                panNumber
            }
        });

        if (!client) {
            return res.status(401).json({ message: 'Invalid Mobile Number or PAN' });
        }

        if (!client.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
        }

        // Handle Device ID logic if provided
        if (deviceId) {
            if (!client.deviceId) {
                await prisma.client.update({
                    where: { id: client.id },
                    data: { deviceId, deviceStatus: 'PENDING' }
                });
                return res.status(403).json({ message: 'Device approval pending. Please contact your CA.' });
            }

            if (client.deviceId !== deviceId) {
                return res.status(403).json({ message: 'This account is linked to another device.' });
            }

            if (client.deviceStatus !== 'APPROVED') {
                return res.status(403).json({ message: 'Device approval pending.' });
            }
        }

        res.json({
            _id: client.id,
            name: client.name,
            email: client.email,
            mobileNumber: client.mobileNumber,
            panNumber: client.panNumber,
            address: client.address,
            tradeName: client.tradeName,
            gstNumber: client.gstNumber,
            tanNumber: client.tanNumber,
            gstId: client.gstId,
            gstPassword: client.gstPassword,
            role: 'CUSTOMER',
            type: client.type,
            token: generateToken(client.id, 'CUSTOMER'),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mobile Login with Device Check
// @route   POST /api/auth/mobile-login
// @access  Public
exports.mobileLogin = async (req, res) => {
    try {
        const { mobileNumber, panNumber } = req.body;

        if (!mobileNumber || !panNumber) {
            return res.status(400).json({ message: 'Mobile Number and PAN are required' });
        }

        const client = await prisma.client.findFirst({
            where: {
                mobileNumber,
                panNumber
            }
        });

        if (!client) {
            return res.status(401).json({ message: 'Invalid Mobile Number or PAN' });
        }

        if (!client.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
        }

        res.json({
            _id: client.id,
            name: client.name,
            role: 'CUSTOMER',
            token: generateToken(client.id, 'CUSTOMER'),
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Device Verification
// @route   POST /api/auth/device-check
// @access  Public
exports.deviceCheck = async (req, res) => {
    try {
        const deviceId = req.headers['x-device-id'];
        const { mobileNumber, panNumber } = req.body;

        if (!deviceId) {
            return res.status(400).json({ message: 'Device ID header missing' });
        }

        const client = await Client.findOne({ mobileNumber, panNumber });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        if (client.deviceId === deviceId && client.deviceStatus === 'APPROVED') {
            return res.json({ status: 'APPROVED' });
        }

        res.json({ status: 'PENDING' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update User Profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (user) {
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: req.body.name || user.name,
                    phone: req.body.phone || user.phone,
                    FRNno: req.body.FRNno || user.FRNno,
                    password: req.body.password ? await bcrypt.hash(req.body.password, await bcrypt.genSalt(10)) : undefined
                }
            });

            res.json({
                _id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                FRNno: updatedUser.FRNno,
                token: generateToken(updatedUser.id, updatedUser.role),
            });

            await logActivity({
                caId: updatedUser.id,
                action: 'UPDATE_PROFILE',
                details: `Profile updated for CA: ${updatedUser.name}`
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Client Profile (Self)
// @route   PUT /api/auth/client-profile
// @access  Private (Client)
exports.updateClientProfileMe = async (req, res) => {
    try {
        if (req.user.role !== 'CUSTOMER') {
            return res.status(403).json({ message: 'Only clients can use this endpoint' });
        }

        const client = await prisma.client.findUnique({ where: { id: req.user.id } });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const updatedClient = await prisma.client.update({
            where: { id: client.id },
            data: {
                name: req.body.name || client.name,
                email: req.body.email || client.email,
                mobileNumber: req.body.mobileNumber || client.mobileNumber,
                address: req.body.address || client.address,
                tradeName: req.body.tradeName || client.tradeName,
                gstNumber: req.body.gstNumber || client.gstNumber,
                tanNumber: req.body.tanNumber || client.tanNumber,
                gstId: req.body.gstId || client.gstId,
                gstPassword: req.body.gstPassword || client.gstPassword,
            }
        });

        res.json({
            status: 'success',
            _id: updatedClient.id,
            name: updatedClient.name,
            email: updatedClient.email,
            mobileNumber: updatedClient.mobileNumber,
            panNumber: updatedClient.panNumber,
            address: updatedClient.address,
            tradeName: updatedClient.tradeName,
            gstNumber: updatedClient.gstNumber,
            tanNumber: updatedClient.tanNumber,
            gstId: updatedClient.gstId,
            gstPassword: updatedClient.gstPassword,
            role: 'CUSTOMER',
            type: updatedClient.type,
            token: generateToken(updatedClient.id, 'CUSTOMER'),
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash and set to resetPasswordToken field
        await User.findByIdAndUpdate(user.id, {
            resetPasswordToken: crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex'),
            resetPasswordExpire: new Date(Date.now() + 3600000)
        });

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a put request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Token',
                message,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #1a73e8; text-align: center;">Password Reset Request</h2>
                        <p>Hi ${user.name},</p>
                        <p>We received a request to reset your password. Click the button below to choose a new one:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                        </div>
                        <p>If you didn't request this, please ignore this email.</p>
                        <p>This link will expire in 1 hour.</p>
                        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #777; text-align: center;">&copy; ${new Date().getFullYear()} CA Admin. All rights reserved.</p>
                    </div>
                `
            });

            res.status(200).json({ status: 'success', message: 'Email sent' });
        } catch (error) {
            console.log(error);
            await User.findByIdAndUpdate(user.id, {
                resetPasswordToken: null,
                resetPasswordExpire: null
            });

            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        // Hash token from URL
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken,
                resetPasswordExpire: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Set new password
        const hashedPassword = await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
        await User.findByIdAndUpdate(user.id, {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpire: null
        });

        res.status(200).json({
            status: 'success',
            message: 'Password reset successful',
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Client's CA Details
// @route   GET /api/auth/my-ca
// @access  Private (Client)
exports.getMyCA = async (req, res) => {
    try {
        if (req.user.role !== 'CUSTOMER') {
            return res.status(403).json({ message: 'Only clients can fetch their CA details' });
        }

        const client = await prisma.client.findUnique({
            where: { id: req.user.id },
            include: {
                ca: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        FRNno: true
                    }
                }
            }
        });

        if (!client || !client.ca) {
            return res.status(404).json({ message: 'CA details not found' });
        }

        res.json({
            status: 'success',
            data: client.ca
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
    // Standard logout: client just discards the token. 
    // If using blacklisting, logic goes here.
    res.json({ message: 'Logged out successfully' });
};

// @desc    Get Group Members for Client
// @route   GET /api/auth/group-members
// @access  Private (Client only)
exports.getGroupMembers = async (req, res) => {
    try {
        const currentClient = await prisma.client.findFirst({
            where: { id: req.user.id }
        });

        console.log("currentClient", currentClient);

        if (!currentClient || !currentClient.groupName) {
            return res.json([]);
        }

        const members = await prisma.client.findMany({
            where: {
                groupName: currentClient.groupName,
                caId: currentClient.caId,
                id: { not: currentClient.id },
                isActive: true
            },
            select: {
                id: true,
                name: true,
                type: true,
                fileNumber: true
            }
        });

        console.log("members", members);
        return res.status(200).json({
            success: true,
            data: members
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Switch to another client in the same group
// @route   POST /api/auth/switch-client
// @access  Private (Client only)
exports.switchClient = async (req, res) => {
    try {
        const { targetClientId } = req.body;
        const currentClient = await prisma.client.findFirst({
            where: { id: req.user.id }
        });

        if (!currentClient || !currentClient.groupName) {
            return res.status(403).json({ message: 'Not authorized for group switching' });
        }

        const targetClient = await prisma.client.findFirst({
            where: {
                id: targetClientId,
                groupName: currentClient.groupName,
                caId: currentClient.caId,
                isActive: true
            }
        });

        if (!targetClient) {
            return res.status(404).json({ message: 'Target client not found in your group' });
        }

        res.json({
            _id: targetClient.id,
            name: targetClient.name,
            role: 'CUSTOMER',
            type: targetClient.type,
            token: generateToken(targetClient.id, 'CUSTOMER'),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users (No protection)
// @route   GET /api/auth/all-users
// @access  Public
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                phone: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if mobile number exists
// @route   POST /api/auth/mobile-v2/check-client
// @access  Public
exports.checkClientExists = async (req, res) => {
    try {
        const { mobileNumber } = req.body;
        if (!mobileNumber) {
            return res.status(400).json({ message: 'Mobile Number is required' });
        }

        const client = await prisma.client.findFirst({
            where: {
                mobileNumber
            }
        });

        if (client) {
            return res.json({ exists: true, isActive: client.isActive });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Firebase OTP Mobile Login Check
// @route   POST /api/auth/mobile-v2/firebase-login
// @access  Public
exports.firebaseMobileLogin = async (req, res) => {
    try {
        const { firebaseToken, deviceId, deviceName } = req.body;

        if (!firebaseToken || !deviceId) {
            return res.status(400).json({ message: 'Firebase Token and Device ID are required' });
        }

        if (!admin.apps.length) {
            return res.status(500).json({ message: 'Firebase Admin not configured on server' });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        } catch (e) {
            console.log("Firebase Auth failed", e);
            return res.status(401).json({ message: 'Invalid Firebase Auth Token' });
        }

        const fullPhoneNumber = decodedToken.phone_number; // e.g. +91XXXXXXXXXX
        if (!fullPhoneNumber) {
            return res.status(400).json({ message: 'Phone number missing in Firebase Token' });
        }

        // Strip out country code for India (+91)
        const mobileNumber = fullPhoneNumber.replace(/^\+91/, '');

        const client = await prisma.client.findFirst({
            where: {
                mobileNumber
            }
        });

        if (!client) {
            return res.status(401).json({ message: 'Account not found for this number' });
        }

        if (!client.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
        }

        res.json({
            _id: client.id,
            name: client.name,
            email: client.email,
            mobileNumber: client.mobileNumber,
            panNumber: client.panNumber,
            address: client.address,
            tradeName: client.tradeName,
            gstNumber: client.gstNumber,
            tanNumber: client.tanNumber,
            gstId: client.gstId,
            gstPassword: client.gstPassword,
            role: 'CUSTOMER',
            type: client.type,
            token: generateToken(client.id, 'CUSTOMER'),
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Redirect to Google OAuth
// @route   GET /api/auth/google
// @access  Public
exports.googleAuth = (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
        redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        client_id: process.env.CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
    };

    const qs = new URLSearchParams(options);
    res.redirect(`${rootUrl}?${qs.toString()}`);
};

// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
            code,
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
            grant_type: "authorization_code",
        });

        const { access_token } = tokenResponse.data;

        // Fetch user profile
        const googleUser = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`
        );

        const { email, name } = googleUser.data;

        // Find or create user
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const { generate8DigitUniqueId } = require('../utils/idGenerator');
            const uniqueId = await generate8DigitUniqueId('user');

            // Create new CAADMIN user for Google signup
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    role: 'CAADMIN',
                    uniqueId,
                    password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), // Random password for security
                    status: 'active'
                }
            });

            // Create bucket for the new user
            await createBucket(`ca-${user.id}`);

            await logActivity({
                caId: user.id,
                action: 'CA_REGISTER',
                details: `New CA registered via Google: ${user.name} (${user.email})`
            });
        }

        const token = generateToken(user.id, user.role);

        // Redirect back to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/login?token=${token}`);

    } catch (error) {
        console.error("Google Auth Error", error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                FRNno: true,
                uniqueId: true,
                status: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
