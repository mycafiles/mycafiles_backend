const prisma = require('../config/prisma');

/**
 * LoginRequest Model Wrapper (Prisma)
 */
const LoginRequest = {
    findOne: async (query) => {
        return await prisma.loginRequest.findFirst({
            where: query
        });
    },

    create: async (data) => {
        return await prisma.loginRequest.create({
            data
        });
    },

    findByIdAndUpdate: async (id, data) => {
        return await prisma.loginRequest.update({
            where: { id },
            data
        });
    }
};

module.exports = LoginRequest;