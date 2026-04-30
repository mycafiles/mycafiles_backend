const prisma = require('../config/prisma');

/**
 * Document Model Wrapper (Prisma)
 */
const Document = {
    find: async (query) => {
        return await prisma.document.findMany({
            where: query
        });
    },

    findOne: async (query) => {
        return await prisma.document.findFirst({
            where: query
        });
    },

    findById: async (id) => {
        return await prisma.document.findUnique({
            where: { id }
        });
    },

    create: async (data) => {
        return await prisma.document.create({
            data
        });
    },

    findByIdAndUpdate: async (id, data) => {
        return await prisma.document.update({
            where: { id },
            data
        });
    },

    deleteMany: async (query) => {
        return await prisma.document.deleteMany({
            where: query
        });
    },

    deleteOne: async (query) => {
        const doc = await prisma.document.findFirst({ where: query });
        if (!doc) return null;
        return await prisma.document.delete({
            where: { id: doc.id }
        });
    }
};

module.exports = Document;