const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateClientFolders } = require('../services/folderService');
const { createBucket } = require('../services/storageService');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seed Script ---');

  const password = await bcrypt.hash('123456', 10);

  // 1. Create Superadmin
  console.log('Creating Superadmin...');
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@gmail.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      password: password,
      role: 'SUPERADMIN',
      status: 'active'
    }
  });
  console.log(`Superadmin created: ${superadmin.email}`);

  // 2. Create CA Admin
  console.log('Creating CA Admin...');
  const ca = await prisma.user.upsert({
    where: { email: 'caadmin@gmail.com' },
    update: {},
    create: {
      name: 'CA Admin',
      email: 'caadmin@gmail.com',
      password: password,
      role: 'CAADMIN',
      status: 'active'
    }
  });
  console.log(`CA Admin created: ${ca.email}`);

  // 3. Create Storage Bucket for CA
  console.log(`Creating MinIO bucket for CA: ca-${ca.id}...`);
  try {
    await createBucket(`ca-${ca.id}`);
    console.log('Bucket created successfully.');
  } catch (err) {
    console.log('Bucket already exists or creation failed (check MinIO connection).');
  }

  // 4. Create Client
  console.log('Creating Client...');
  const client = await prisma.client.upsert({
    where: { panNumber: 'ABCDE1234F' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      email: 'rahul@gmail.com',
      mobileNumber: '9876543210',
      panNumber: 'ABCDE1234F',
      type: 'BUSINESS',
      gstNumber: '22ABCDE1234F1Z5',
      fileNumber: 1,
      caId: ca.id,
      isActive: true,
      deviceStatus: 'APPROVED',
      allowedDevices: ['test-device-id'] // Useful for testing
    }
  });
  console.log(`Client created: ${client.name} (${client.panNumber})`);

  // 5. Generate Standard Folders for the Client
  console.log('Generating predefined folders for Client...');
  try {
    await generateClientFolders(client.id, client);
    console.log('Folders generated successfully.');
  } catch (err) {
    console.error('Folder generation failed:', err.message);
  }

  console.log('--- Seed Script Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
