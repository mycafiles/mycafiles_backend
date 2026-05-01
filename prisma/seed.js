const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create a Super Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mycafiles.com' },
    update: {},
    create: {
      email: 'admin@mycafiles.com',
      name: 'Super Admin',
      password: adminPassword,
      role: 'SUPERADMIN',
      status: 'active',
      uniqueId: 'ADM00001'
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // 2. Create a test client
  const client = await prisma.client.upsert({
    where: { panNumber: 'ABCDE1234F' },
    update: {},
    create: {
      name: 'Test Business Client',
      mobileNumber: '9876543210',
      panNumber: 'ABCDE1234F',
      type: 'BUSINESS',
      tradeName: 'Test Solutions Ltd',
      fileNumber: 1001,
      caId: admin.id,
      uniqueId: 'CLT00001'
    },
  });
  console.log('✅ Test client created:', client.name);

  // 3. Create basic folders for the client
  const folders = [
    { name: 'GST', category: 'GST', isPredefined: true },
    { name: 'ITR', category: 'ITR', isPredefined: true },
    { name: 'TDS', category: 'TDS', isPredefined: true },
    { name: 'KYC', category: 'KYC', isPredefined: true },
  ];

  for (const f of folders) {
    await prisma.folder.create({
      data: {
        ...f,
        clientId: client.id,
      }
    });
  }
  console.log('✅ Predefined folders created for client');

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
