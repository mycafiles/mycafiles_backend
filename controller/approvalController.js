const LoginRequest = require('../models/LoginRequest');
const Client = require('../models/Client');
const { logActivity } = require('../services/activityService');
const prisma = require('../config/prisma');

// @desc    Get all pending login requests
// @route   GET /api/approvals
// @access  Private/CA
exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await prisma.loginRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        mobileNumber: true,
                        panNumber: true
                    }
                }
            },
            orderBy: { requestDate: 'desc' }
        });

        // Map for frontend compatibility
        const formattedRequests = requests.map(r => ({
            ...r,
            _id: r.id,
            clientId: r.client ? { ...r.client, _id: r.client.id } : r.clientId
        }));

        res.json(formattedRequests);
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

        const loginRequest = await prisma.loginRequest.findUnique({
            where: { id: requestId },
            include: { client: true }
        });

        if (!loginRequest) {
            return res.status(404).json({ message: 'Login request not found' });
        }

        if (loginRequest.status !== 'PENDING') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        const updatedRequest = await prisma.loginRequest.update({
            where: { id: requestId },
            data: { status }
        });

        if (status === 'APPROVED') {
            const client = await prisma.client.findUnique({
                where: { id: loginRequest.clientId }
            });

            if (client) {
                // Add deviceId to allowedDevices if not already there
                const updatedAllowedDevices = client.allowedDevices || [];
                if (!updatedAllowedDevices.includes(loginRequest.deviceId)) {
                    updatedAllowedDevices.push(loginRequest.deviceId);
                    await prisma.client.update({
                        where: { id: client.id },
                        data: { allowedDevices: updatedAllowedDevices }
                    });
                }
            }
        }

        await logActivity({
            caId: req.user.id,
            action: status === 'APPROVED' ? 'APPROVE_DEVICE' : 'REJECT_DEVICE',
            details: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} device login request for client: ${loginRequest.client?.name || 'Unknown'}`,
            clientId: loginRequest.clientId
        });

        res.json({ 
            message: `Request ${status.toLowerCase()} successfully`, 
            loginRequest: { ...updatedRequest, _id: updatedRequest.id } 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
