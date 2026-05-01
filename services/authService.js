const bcrypt = require('bcryptjs');
const authRepository = require('../repositories/authRepository');

function toClientAuthPayload(client, token) {
    return {
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
        token
    };
}

async function loginCA(email, password, role) {
    const user = await authRepository.findPrismaUserByEmail(email);
    if (!user) return { ok: false, code: 401, message: 'Invalid email or password' };
    if (role && user.role !== role) return { ok: false, code: 401, message: 'Invalid email or password' };
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return { ok: false, code: 401, message: 'Invalid email or password' };
    return { ok: true, user };
}

async function loginClientByMobilePan({ mobileNumber, panNumber, deviceId, tokenFactory }) {
    const client = await authRepository.findClientByMobileAndPan(mobileNumber, panNumber);
    if (!client) return { ok: false, code: 401, message: 'Invalid Mobile Number or PAN' };
    if (!client.isActive) return { ok: false, code: 403, message: 'Account is inactive. Please contact support.' };

    if (deviceId) {
        if (!client.deviceId) {
            await authRepository.updateClient(client.id, { deviceId, deviceStatus: 'PENDING' });
            return { ok: false, code: 403, message: 'Device approval pending. Please contact your CA.' };
        }
        if (client.deviceId !== deviceId) return { ok: false, code: 403, message: 'This account is linked to another device.' };
        if (client.deviceStatus !== 'APPROVED') return { ok: false, code: 403, message: 'Device approval pending.' };
    }

    return { ok: true, payload: toClientAuthPayload(client, tokenFactory(client.id, 'CUSTOMER')) };
}

async function loginClientBasic({ mobileNumber, panNumber, tokenFactory }) {
    const client = await authRepository.findClientByMobileAndPan(mobileNumber, panNumber);
    if (!client) return { ok: false, code: 401, message: 'Invalid Mobile Number or PAN' };
    if (!client.isActive) return { ok: false, code: 403, message: 'Account is inactive. Please contact support.' };
    return {
        ok: true,
        payload: {
            _id: client.id,
            name: client.name,
            role: 'CUSTOMER',
            token: tokenFactory(client.id, 'CUSTOMER')
        }
    };
}

async function updateCaProfile(userId, body, tokenFactory) {
    const user = await authRepository.findPrismaUserById(userId);
    if (!user) return null;
    const password = body.password ? await bcrypt.hash(body.password, await bcrypt.genSalt(10)) : undefined;
    const updatedUser = await authRepository.updatePrismaUser(user.id, {
        name: body.name || user.name,
        phone: body.phone || user.phone,
        FRNno: body.FRNno || user.FRNno,
        password
    });
    return {
        _id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        FRNno: updatedUser.FRNno,
        token: tokenFactory(updatedUser.id, updatedUser.role)
    };
}

async function updateClientSelfProfile(clientId, body, tokenFactory) {
    const client = await authRepository.findClientById(clientId);
    if (!client) return null;
    const updated = await authRepository.updateClient(client.id, {
        name: body.name || client.name,
        email: body.email || client.email,
        mobileNumber: body.mobileNumber || client.mobileNumber,
        address: body.address || client.address,
        tradeName: body.tradeName || client.tradeName,
        gstNumber: body.gstNumber || client.gstNumber,
        tanNumber: body.tanNumber || client.tanNumber,
        gstId: body.gstId || client.gstId,
        gstPassword: body.gstPassword || client.gstPassword
    });
    return {
        status: 'success',
        ...toClientAuthPayload(updated, tokenFactory(updated.id, 'CUSTOMER'))
    };
}

async function getMyCa(clientId) {
    const client = await authRepository.findClientById(clientId, {
        include: {
            ca: {
                select: { id: true, name: true, email: true, phone: true, FRNno: true }
            }
        }
    });
    return client?.ca || null;
}

async function getGroupMembers(clientId) {
    const currentClient = await authRepository.findClientFirst({ id: clientId });
    if (!currentClient || !currentClient.groupName) return [];
    return authRepository.findClients({
        groupName: currentClient.groupName,
        caId: currentClient.caId,
        id: { not: currentClient.id },
        isActive: true
    }, {
        select: { id: true, name: true, type: true, fileNumber: true }
    });
}

async function switchGroupClient(clientId, targetClientId, tokenFactory) {
    const currentClient = await authRepository.findClientFirst({ id: clientId });
    if (!currentClient || !currentClient.groupName) {
        return { ok: false, code: 403, message: 'Not authorized for group switching' };
    }
    const targetClient = await authRepository.findClientFirst({
        id: targetClientId,
        groupName: currentClient.groupName,
        caId: currentClient.caId,
        isActive: true
    });
    if (!targetClient) return { ok: false, code: 404, message: 'Target client not found in your group' };
    return {
        ok: true,
        payload: {
            _id: targetClient.id,
            name: targetClient.name,
            role: 'CUSTOMER',
            type: targetClient.type,
            token: tokenFactory(targetClient.id, 'CUSTOMER')
        }
    };
}

async function checkClientExists(mobileNumber) {
    const client = await authRepository.findClientFirst({ mobileNumber });
    return client ? { exists: true, isActive: client.isActive } : { exists: false };
}

async function getCurrentUser(userId) {
    return authRepository.findPrismaUserById(userId ? userId : '');
}

module.exports = {
    loginCA,
    loginClientByMobilePan,
    loginClientBasic,
    updateCaProfile,
    updateClientSelfProfile,
    getMyCa,
    getGroupMembers,
    switchGroupClient,
    checkClientExists,
    getCurrentUser
};
