
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      recipient: { select: { name: true, role: true } },
      clientRef: { select: { name: true } },
      sender: { select: { name: true } },
      senderUser: { select: { name: true } }
    }
  });

  console.log(JSON.stringify(notifications, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
