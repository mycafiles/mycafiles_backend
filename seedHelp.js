const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Help & Support data...');

  // CA Articles
  await prisma.helpArticle.createMany({
    data: [
      {
        title: 'GST Filing Guide',
        content: '<h2>GST Filing Process</h2><p>Step-by-step guide to filing GSTR-1 and GSTR-3B for your clients directly from MyCAFiles. Ensure all invoices are uploaded before the 10th of the month.</p>',
        category: 'GST & Returns',
        audience: 'ca'
      },
      {
        title: 'Income Tax E-Filing',
        content: '<h2>ITR E-Filing</h2><p>Our integrated portal allows you to upload XMLs directly to the IT portal. Track the status of every filing in real-time from your dashboard.</p>',
        category: 'ITR Filing Help',
        audience: 'ca'
      },
      {
        title: 'Bulk Onboarding',
        content: '<h2>Import Clients in Bulk</h2><p>Save time by importing all your clients using our CSV template. Map your existing database fields to our portal effortlessly.</p>',
        category: 'Client Management',
        audience: 'ca'
      }
    ]
  });

  // Client Articles
  await prisma.helpArticle.createMany({
    data: [
      {
        title: 'Understanding your GST Summary',
        content: '<h2>Your Monthly Summary</h2><p>How to read the monthly GST summary provided by your CA. Understand your input tax credit and tax payable at a glance.</p>',
        category: 'GST & Returns',
        audience: 'client'
      },
      {
        title: 'Uploading Docs for ITR',
        content: '<h2>Preparing for Tax Season</h2><p>Upload your Form 16, bank statements, and investment proofs into the ITR folder. Your CA will be notified instantly.</p>',
        category: 'ITR Filing Help',
        audience: 'client'
      }
    ]
  });

  // CA FAQs
  await prisma.fAQ.createMany({
    data: [
      {
        question: 'How to reset a client\'s password?',
        answer: 'Go to Client Management, select the client, and click \'Reset\' in the Security tab. They will receive a link via email.',
        audience: 'ca',
        order: 1
      },
      {
        question: 'What is the maximum file size for uploads?',
        answer: 'You can upload files up to 100MB each. For larger files, please contact support.',
        audience: 'ca',
        order: 2
      }
    ]
  });

  // Client FAQs
  await prisma.fAQ.createMany({
    data: [
      {
        question: 'How do I know my taxes are filed?',
        answer: 'You\'ll receive an automated notification and the acknowledgement PDF will be available in your \'Tax Returns\' folder.',
        audience: 'client',
        order: 1
      },
      {
        question: 'Can I upload docs from my mobile?',
        answer: 'Yes! Our site is mobile-responsive. You can snap a photo of a document or upload a PDF directly from your phone.',
        audience: 'client',
        order: 2
      }
    ]
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
