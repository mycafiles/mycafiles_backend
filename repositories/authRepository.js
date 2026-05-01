const prisma = require('../config/prisma');
const User = require('../models/User');
const Client = require('../models/Client');

function findUserByEmailModel(email) {
    return User.findOne({ email });
}

function createUserModel(data) {
    return User.create(data);
}

function matchUserPassword(plain, hashed) {
    return User.matchPassword(plain, hashed);
}

function findPrismaUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
}

function findPrismaUserById(id) {
    return prisma.user.findUnique({ where: { id } });
}

function updatePrismaUser(id, data) {
    return prisma.user.update({ where: { id }, data });
}

function findClientByMobileAndPan(mobileNumber, panNumber) {
    return prisma.client.findFirst({ where: { mobileNumber, panNumber } });
}

function updateClient(id, data) {
    return prisma.client.update({ where: { id }, data });
}

function findClientById(id, options = {}) {
    return prisma.client.findUnique({ where: { id }, ...options });
}

function findClientFirst(where, options = {}) {
    return prisma.client.findFirst({ where, ...options });
}

function findClients(where, options = {}) {
    return prisma.client.findMany({ where, ...options });
}

function findUsers(options = {}) {
    return prisma.user.findMany(options);
}

module.exports = {
    findUserByEmailModel,
    createUserModel,
    matchUserPassword,
    findPrismaUserByEmail,
    findPrismaUserById,
    updatePrismaUser,
    findClientByMobileAndPan,
    updateClient,
    findClientById,
    findClientFirst,
    findClients,
    findUsers,
    Client
};
