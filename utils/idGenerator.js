const prisma = require('../config/prisma');

async function generate8DigitUniqueId(modelName) {
    let isUnique = false;
    let uniqueId = '';

    while (!isUnique) {
        uniqueId = Math.floor(10000000 + Math.random() * 90000000).toString();

        let existing;
        if (modelName === 'user') {
            existing = await prisma.user.findUnique({ where: { uniqueId } });
        } else if (modelName === 'client') {
            existing = await prisma.client.findUnique({ where: { uniqueId } });
        }

        if (!existing) {
            isUnique = true;
        }
    }

    return uniqueId;
}

module.exports = { generate8DigitUniqueId };
