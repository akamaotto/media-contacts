import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDRContacts() {
  try {
    // Count all media contacts
    const totalCount = await prisma.media_contacts.count();
    console.log(`Total media contacts in database: ${totalCount}`);
    
    // Count contacts with DRC in their countries
    const drcCount = await prisma.media_contacts.count({
      where: {
        countries: {
          some: {
            name: "Congo, Democratic Republic of the"
          }
        }
      }
    });
    
    console.log(`Media contacts in Democratic Republic of Congo: ${drcCount}`);
    
    if (drcCount > 0) {
      // Fetch and display some DRC contacts
      const drcContacts = await prisma.media_contacts.findMany({
        where: {
          countries: {
            some: {
              name: "Congo, Democratic Republic of the"
            }
          }
        },
        take: 5,
        include: {
          countries: true,
          outlets: true,
          beats: true
        }
      });
      
      console.log('\nSample DRC contacts:');
      drcContacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.name} - ${contact.title}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Outlet: ${contact.outlets.map(o => o.name).join(', ')}`);
        console.log(`   Beats: ${contact.beats.map(b => b.name).join(', ')}`);
        console.log(`   Countries: ${contact.countries.map(c => c.name).join(', ')}`);
        console.log('');
      });
    }
    
    // List all outlets in DRC
    console.log('Outlets in Democratic Republic of Congo:');
    const drcOutlets = await prisma.outlets.findMany({
      where: {
        countries: {
          some: {
            name: "Congo, Democratic Republic of the"
          }
        }
      },
      include: {
        countries: true
      }
    });
    
    drcOutlets.forEach((outlet, index) => {
      console.log(`${index + 1}. ${outlet.name}`);
    });
    
  } catch (error) {
    console.error('Error verifying DRC contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  verifyDRContacts();
}

export { verifyDRContacts };