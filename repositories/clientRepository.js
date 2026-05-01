const prisma = require('../config/prisma');
const Client = require('../models/Client');

function findClientByPan(panNumber) {
    return Client.findOne({ panNumber });
}

function findLastClientByCa(caId) {
    return Client.findOne({ caId }, { sort: { fileNumber: 'desc' } });
}

function createClient(data) {
    return Client.create(data);
}

function findClientsByCa(caId) {
    return prisma.client.findMany({ where: { caId } });
}

function findCategorizedClients(where) {
    return prisma.client.findMany({
        where,
        include: {
            folders: { where: { isDeleted: false } },
            documents: { where: { isDeleted: false } }
        }
    });
}

function findClientsByGroupName(groupName) {
    return prisma.client.findMany({ where: { groupName } });
}

function findClientGroupName(clientId) {
    return prisma.client.findUnique({
        where: { id: clientId },
        select: { groupName: true }
    });
}

function findClientById(clientId) {
    return prisma.client.findUnique({ where: { id: clientId } });
}

function findClientDataById(clientId) {
    return Promise.all([
        prisma.client.findUnique({ where: { id: clientId } }),
        prisma.folder.findMany({ where: { clientId, isDeleted: false } }),
        prisma.document.findMany({ where: { clientId, isDeleted: false } })
    ]);
}

function updateClientByIdAndCa(clientId, caId, data) {
    return Client.findOneAndUpdate(
        { id: clientId, caId },
        data,
        {
            new: true,
            runValidators: true
        }
    );
}

function updateClientStatus(clientId, caId, status) {
    return prisma.client.update({
        where: {
            id: clientId,
            caId
        },
        data: { isActive: status }
    });
}

function findClientByIdAndCa(clientId, caId) {
    return Client.findOne({ id: clientId, caId });
}

function deleteDocumentsByClient(clientId) {
    return prisma.document.deleteMany({ where: { clientId } });
}

function deleteFoldersByClient(clientId) {
    return prisma.folder.deleteMany({ where: { clientId } });
}

function deleteNotificationsByClient(clientId) {
    return prisma.notification.deleteMany({ where: { clientId } });
}

function deleteActivityLogsByClient(clientId) {
    return prisma.activityLog.deleteMany({ where: { clientId } });
}

function deleteClientById(clientId) {
    return prisma.client.delete({ where: { id: clientId } });
}

function deleteClientModel(clientId) {
    return Client.deleteOne({ id: clientId });
}

function findExistingClientsByPan(caId, panNumbers) {
    return Client.find({
        caId,
        panNumber: { in: panNumbers }
    });
}

function findClientByIdAndCaForApproval(clientId, caId) {
    return Client.findOne({ id: clientId, caId });
}

function updateApprovedDevice(clientId, allowedDevices) {
    return Client.findByIdAndUpdate(clientId, {
        deviceStatus: 'APPROVED',
        allowedDevices
    });
}

module.exports = {
    findClientByPan,
    findLastClientByCa,
    createClient,
    findClientsByCa,
    findCategorizedClients,
    findClientsByGroupName,
    findClientGroupName,
    findClientById,
    findClientDataById,
    updateClientByIdAndCa,
    updateClientStatus,
    findClientByIdAndCa,
    deleteDocumentsByClient,
    deleteFoldersByClient,
    deleteNotificationsByClient,
    deleteActivityLogsByClient,
    deleteClientById,
    deleteClientModel,
    findExistingClientsByPan,
    findClientByIdAndCaForApproval,
    updateApprovedDevice
};
