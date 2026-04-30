const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

/**
 * User Model Wrapper (Prisma)
 */
const User = {
    /**
     * Finds one user by conditions (mimicking Mongoose findOne for now but limited to unique fields or simple objects)
     */
    findOne: async (query) => {
        // Handle common query types from the controller
        if (query.email) {
            return await prisma.user.findUnique({
                where: { email: query.email }
            });
        }
        if (query.resetPasswordToken) {
            return await prisma.user.findFirst({
                where: { resetPasswordToken: query.resetPasswordToken }
            });
        }
        return await prisma.user.findFirst({ where: query });
    },

    /**
     * Finds a user by ID
     */
    findById: async (id) => {
        return await prisma.user.findUnique({
            where: { id }
        });
    },

    /**
     * Create a new user (mimicking Mongoose create)
     * Returns the created user object
     */
    create: async (data) => {
        // Hash password if not already hashed (assuming plain text is passed and we maintain Mongoose-like auto-hash)
        // Actually, it's better to hash in the controller. But to avoid breaking, we can check.
        if (data.password && !data.password.startsWith('$2a$')) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }
        
        return await prisma.user.create({
            data
        });
    },

    /**
     * Mimics Mongoose matchPassword on an instance
     * Since we are using plain objects, we'll pass the password to this function.
     */
    matchPassword: async (enteredPassword, hashedPassword) => {
        return await bcrypt.compare(enteredPassword, hashedPassword);
    },

    /**
     * Updates a user by ID
     */
    findByIdAndUpdate: async (id, data, options = {}) => {
        return await prisma.user.update({
            where: { id },
            data
        });
    },

    /**
     * Finds users by conditions
     */
    find: async (query) => {
        return await prisma.user.findMany({
            where: query
        });
    },

    /**
     * Deletes a user by ID
     */
    findByIdAndDelete: async (id) => {
        return await prisma.user.delete({
            where: { id }
        });
    }
};

module.exports = User;
