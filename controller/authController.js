const User = require('../models/User');
const Client = require('../models/Client');
const LoginRequest = require('../models/LoginRequest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

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

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
    // Standard logout: client just discards the token. 
    // If using blacklisting, logic goes here.
    res.json({ message: 'Logged out successfully' });
};
