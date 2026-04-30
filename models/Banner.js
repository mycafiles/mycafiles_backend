const prisma = require('../config/prisma');

/**
 * Banner Model Wrapper (Prisma)
 */
const Banner = {
    find: async (query) => {
        return await prisma.banner.findMany({
            where: query,
            orderBy: { order: 'asc' }
        });
    },

    create: async (data) => {
        return await prisma.banner.create({
            data
        });
    },

    findByIdAndDelete: async (id) => {
        return await prisma.banner.delete({
            where: { id }
        });
    }
};

module.exports = Banner;
