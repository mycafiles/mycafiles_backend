const Client = require('../../../models/Client');
const LoginRequest = require('../../../models/LoginRequest');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

// @desc    Check User Exists (Step 1)
// @route   POST /api/ca_connect/auth/check-user
// @access  Public
exports.checkUser = async (req, res) => {
    try {
        const { mobileNumber, panNumber } = req.body;

        if (!mobileNumber || !panNumber) {
            return res.status(400).json({ message: 'Mobile Number and PAN are required' });
        }

        const client = await Client.findOne({ mobileNumber, panNumber });

        if (!client) {
            return res.status(404).json({ message: 'User not found. Please check your details.' });
        }

        if (!client.isActive) {
            return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
        }

        // Return basic user info for confirmation screen
        // We can generate a temporary token for the next step if we want to be stateless, 
        // or just rely on re-sending creds. For security, let's just return success 
        // and require creds again or use a short-lived temp token. 
        // For simplicity as per plan, we will re-verify or trust the flow for now.
        // Let's return a success message and the user's name.

        res.json({
            exists: true,
            name: client.name,
            message: "User found"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Login Confirm (Step 2)
// @route   POST /api/ca_connect/auth/login-confirm
// @access  Public
exports.loginConfirm = async (req, res) => {
    try {
        const { mobileNumber, panNumber, deviceId, deviceName } = req.body;

        if (!mobileNumber || !panNumber) {
            return res.status(400).json({ message: 'Mobile Number and PAN are required' });
        }

        const client = await Client.findOne({ mobileNumber, panNumber });

        if (!client) {
            return res.status(401).json({ message: 'Invalid credentials during confirmation.' });
        }

        // Device Check Logic (Preserving existing logic)
        // Device Check Logic - SIMPLIFIED: ALWAYS ALLOW & UPDATE
        if (deviceId) {
            // Just update the last used device info, or add to allowed list automatically
            if (!client.allowedDevices) {
                client.allowedDevices = [];
            }
            if (!client.allowedDevices.includes(deviceId)) {
                client.allowedDevices.push(deviceId);
            }

            // Update current device pointer
            client.deviceId = deviceId;
            client.deviceStatus = 'APPROVED'; // Auto-approve
            await client.save();
        }

        // Populate CA details
        await client.populate('caId', 'name email');

        // If we reach here, successful login
        res.json({
            _id: client._id,
            name: client.name,
            caName: client.caId ? client.caId.name : 'Unknown CA',
            caEmail: client.caId ? client.caId.email : '',
            role: 'CUSTOMER',
            token: generateToken(client._id, 'CUSTOMER'),
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
