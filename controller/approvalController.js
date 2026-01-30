const LoginRequest = require('../models/LoginRequest');
const Client = require('../models/Client');

// @desc    Get all pending login requests
// @route   GET /api/approvals
// @access  Private/CA
exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await LoginRequest.find({ status: 'PENDING' })
            .populate('clientId', 'name mobileNumber panNumber')
            .sort({ requestDate: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve or Reject a login request
// @route   PUT /api/approvals/:id
// @access  Private/CA
exports.handleApproval = async (req, res) => {
    try {
        const { status } = req.body; // 'APPROVED' or 'REJECTED'
        const requestId = req.params.id;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be APPROVED or REJECTED' });
        }

        const loginRequest = await LoginRequest.findById(requestId);

        if (!loginRequest) {
            return res.status(404).json({ message: 'Login request not found' });
        }

        if (loginRequest.status !== 'PENDING') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        loginRequest.status = status;
        await loginRequest.save();

        if (status === 'APPROVED') {
            const client = await Client.findById(loginRequest.clientId);
            if (client) {
                // Add deviceId to allowedDevices if not already there
                if (!client.allowedDevices.includes(loginRequest.deviceId)) {
                    client.allowedDevices.push(loginRequest.deviceId);
                    await client.save();
                }
            }
        }

        res.json({ message: `Request ${status.toLowerCase()} successfully`, loginRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
