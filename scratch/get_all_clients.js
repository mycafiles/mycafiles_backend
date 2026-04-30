const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clients = await prisma.client.findMany({ select: { id: true, name: true, caId: true } });
    console.log(JSON.stringify(clients, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
