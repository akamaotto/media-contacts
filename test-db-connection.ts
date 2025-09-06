import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Test the connection by counting media contacts
    const count = await prisma.media_contacts.count();
    console.log(`Database connection successful. Current media contacts count: ${count}`);
    
    // Try to fetch one contact if exists
    const contact = await prisma.media_contacts.findFirst();
    if (contact) {
      console.log('Sample contact found:', contact.name);
    } else {
      console.log('No contacts found in database');
    }
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();