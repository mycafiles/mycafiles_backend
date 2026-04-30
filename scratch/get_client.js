const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const client = await prisma.client.findFirst({
        where: { caId: 'cmnlv8py00000q7u34vq3kjzz' }
    });
    console.log(JSON.stringify(client, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
