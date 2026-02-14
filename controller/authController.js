const User = require('../models/User');
const Client = require('../models/Client');
const LoginRequest = require('../models/LoginRequest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');
const sendEmail = require('../services/emailService');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

const { createBucket } = require('../services/storageService');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = await User.create({
            name,
            email,
            password,
            role: 'SUPERADMIN',
        });

        // MinIO: Create Bucket for new CA
        await createBucket(`ca-${newUser._id}`);

        await logActivity({
            caId: newUser._id,
            action: 'CA_REGISTER',
            details: `New CA registered: ${newUser.name} (${newUser.email})`
        });

        token = generateToken(newUser._id, newUser.role)

        res.status(201).json({
            _id: newUser._id,
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

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
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

        const user = await User.findOne({ email });
        console.log("user", user);

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.role !== role) {
            logger.info(`User ${user.email} is not a ${role}`)
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
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
    try {
        const { mobileNumber, panNumber } = req.body;
        const deviceId = req.headers['x-device-id'];

        if (!mobileNumber || !panNumber) {
            return res.status(400).json({ message: 'Mobile Number and PAN are required' });
        }

        const client = await Client.findOne({ mobileNumber, panNumber });

        if (!client) {
            return res.status(401).json({ message: 'Invalid Mobile Number or PAN' });
        }

        if (!client.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
        }

        // Handle Device ID logic if provided
        if (deviceId) {
            if (!client.deviceId) {
                client.deviceId = deviceId;
                client.deviceStatus = 'PENDING';
                await client.save();
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
            _id: client._id,
            name: client.name,
            role: 'CUSTOMER',
            token: generateToken(client._id, 'CUSTOMER'),
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
        const { mobileNumber, panNumber, deviceId, deviceName } = req.body;

        if (!mobileNumber || !panNumber || !deviceId) {
            return res.status(400).json({ message: 'Mobile Number, PAN, and Device ID are required' });
        }

        const client = await Client.findOne({ mobileNumber, panNumber });

        if (!client) {
            return res.status(401).json({ message: 'Invalid Mobile Number or PAN' });
        }

        // Check if device is allowed
        if (client.allowedDevices && client.allowedDevices.includes(deviceId)) {
            return res.json({
                _id: client._id,
                name: client.name,
                role: 'CUSTOMER',
                token: generateToken(client._id, 'CUSTOMER'),
            });
        }

        // Device not allowed, check for existing pending request
        let loginRequest = await LoginRequest.findOne({
            clientId: client._id,
            deviceId: deviceId,
            status: 'PENDING'
        });

        if (!loginRequest) {
            // Create new request
            loginRequest = await LoginRequest.create({
                clientId: client._id,
                deviceId: deviceId,
                deviceName: deviceName || 'Unknown Device',
                status: 'PENDING'
            });

            // Trigger notification to CA Admin
            if (client && client.caId) {
                await sendNotification(
                    'Device Approval Required',
                    `New device login request from: ${client.name} (${deviceName || 'Unknown Device'})`,
                    client.caId,
                    {
                        saveToDb: true,
                        senderId: client._id,
                        type: 'DEVICE_APPROVAL',
                        metadata: {
                            clientId: client._id,
                            requestId: loginRequest._id
                        }
                    }
                );
            }
        }

        res.status(403).json({
            message: 'New device detected. Approval request sent to CA.',
            requestId: loginRequest._id
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
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.FRNno = req.body.FRNno || user.FRNno;

            if (req.body.password) {
                // Check if password and confirmPassword match if needed, but assuming simple update here
                // Mongoose pre-save hook will hash it
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                FRNno: updatedUser.FRNno,
                token: generateToken(updatedUser._id, updatedUser.role),
            });

            await logActivity({
                caId: updatedUser._id,
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
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (1 hour)
        user.resetPasswordExpire = Date.now() + 3600000;

        await user.save();

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
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

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

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Password reset successful',
            token: generateToken(user._id, user.role)
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
