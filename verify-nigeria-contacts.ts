import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyNigeriaContacts() {
  try {
    // Count all media contacts
    const totalCount = await prisma.media_contacts.count();
    console.log(`Total media contacts in database: ${totalCount}`);
    
    // Count contacts with Nigeria in their countries
    const nigeriaCount = await prisma.media_contacts.count({
      where: {
        countries: {
          some: {
            name: 'Nigeria'
          }
        }
      }
    });
    
    console.log(`Media contacts in Nigeria: ${nigeriaCount}`);
    
    // Fetch and display some Nigerian contacts
    const nigeriaContacts = await prisma.media_contacts.findMany({
      where: {
        countries: {
          some: {
            name: 'Nigeria'
          }
        }
      },
      take: 5,
      include: {
        countries: true
      }
    });
    
    console.log('\nSample Nigerian contacts:');
    nigeriaContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.name} - ${contact.title}`);
      console.log(`   Email: ${contact.email}`);
      console.log(`   Countries: ${contact.countries.map(c => c.name).join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error verifying Nigerian contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  verifyNigeriaContacts();
}

export { verifyNigeriaContacts };