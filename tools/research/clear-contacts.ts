import { PrismaClient } from '@prisma/client';

async function clearContacts() {
  const prisma = new PrismaClient();
  
  try {
    // Delete all media contacts
    const deleted = await prisma.media_contacts.deleteMany();
    console.log(`Deleted ${deleted.count} contacts`);
    
    // Delete all outlets
    const deletedOutlets = await prisma.outlets.deleteMany();
    console.log(`Deleted ${deletedOutlets.count} outlets`);
  } catch (error) {
    console.error('Error clearing contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearContacts();