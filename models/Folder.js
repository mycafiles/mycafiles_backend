const prisma = require('../config/prisma');

/**
 * Folder Model Wrapper (Prisma)
 */
const Folder = {
    find: async (query) => {
        return await prisma.folder.findMany({
            where: query
        });
    },

    findOne: async (query) => {
        return await prisma.folder.findFirst({
            where: query
        });
    },

    findById: async (id) => {
        return await prisma.folder.findUnique({
            where: { id }
        });
    },

    create: async (data) => {
        return await prisma.folder.create({
            data
        });
    },

    findByIdAndUpdate: async (id, data) => {
        return await prisma.folder.update({
            where: { id },
            data
        });
    },

    deleteMany: async (query) => {
        return await prisma.folder.deleteMany({
            where: query
        });
    },

    deleteOne: async (query) => {
        const folder = await prisma.folder.findFirst({ where: query });
        if (!folder) return null;
        return await prisma.folder.delete({
            where: { id: folder.id }
        });
    }
};

module.exports = Folder;