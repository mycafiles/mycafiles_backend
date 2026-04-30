const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBin() {
  const deletedFiles = await prisma.document.findMany({
    where: { isDeleted: true },
    select: { id: true, fileName: true, isDeleted: true, clientId: true, deletedAt: true }
  });
  const deletedFolders = await prisma.folder.findMany({
    where: { isDeleted: true },
    select: { id: true, name: true, isDeleted: true, clientId: true, deletedAt: true }
  });

  console.log('--- DELETED FILES ---');
  console.log(JSON.stringify(deletedFiles, null, 2));
  console.log('--- DELETED FOLDERS ---');
  console.log(JSON.stringify(deletedFolders, null, 2));
}

checkBin().catch(console.error).finally(() => prisma.$disconnect());
