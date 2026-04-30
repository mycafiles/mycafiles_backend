const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:FhBecVqmBBjBrejckoDlYlmxEzYrEvUy@hopper.proxy.rlwy.net:49108/railway"
        }
    }
});

async function main() {
    try {
        const count = await prisma.user.count();
        console.log('Successfully reached database. User count:', count);
    } catch (error) {
        console.error('Failed to reach database:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
