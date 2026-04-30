const prisma = require('../config/prisma');

/**
 * Client Model Wrapper (Prisma)
 */
const Client = {
    findOne: async (query, options = {}) => {
        return await prisma.client.findFirst({
            where: query,
            orderBy: options.sort || undefined
        });
    },

    findById: async (id) => {
        return await prisma.client.findUnique({
            where: { id }
        });
    },

    create: async (data) => {
        return await prisma.client.create({
            data
        });
    },

    insertMany: async (data) => {
        return await prisma.client.createMany({
            data,
            skipDuplicates: true
        });
    },

    findOneAndUpdate: async (query, data, options = {}) => {
        // First find the ID if not provided in query
        const client = await prisma.client.findFirst({ where: query });
        if (!client) return null;
        
        return await prisma.client.update({
            where: { id: client.id },
            data
        });
    },

    findByIdAndUpdate: async (id, data) => {
        return await prisma.client.update({
            where: { id },
            data
        });
    },

    find: async (query) => {
        return await prisma.client.findMany({
            where: query
        });
    },

    deleteOne: async (query) => {
        const client = await prisma.client.findFirst({ where: query });
        if (!client) return null;
        return await prisma.client.delete({
            where: { id: client.id }
        });
    }
};

module.exports = Client;