import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEthiopiaContacts() {
  try {
    // Check if Ethiopia exists in the database
    const ethiopia = await prisma.countries.findFirst({
      where: {
        name: "Ethiopia"
      }
    });
    
    if (!ethiopia) {
      console.log("Ethiopia not found in the database");
      return;
    }
    
    console.log(`Ethiopia found: ${ethiopia.name} (${ethiopia.code})`);
    
    // Count contacts with Ethiopia in their countries
    const ethiopiaCount = await prisma.media_contacts.count({
      where: {
        countries: {
          some: {
            name: "Ethiopia"
          }
        }
      }
    });
    
    console.log(`Media contacts in Ethiopia: ${ethiopiaCount}`);
    
    if (ethiopiaCount > 0) {
      // Fetch and display some Ethiopian contacts
      const ethiopiaContacts = await prisma.media_contacts.findMany({
        where: {
          countries: {
            some: {
              name: "Ethiopia"
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
      
      console.log('\nSample Ethiopian contacts:');
      ethiopiaContacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.name} - ${contact.title}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Outlet: ${contact.outlets.map(o => o.name).join(', ')}`);
        console.log(`   Beats: ${contact.beats.map(b => b.name).join(', ')}`);
        console.log(`   Countries: ${contact.countries.map(c => c.name).join(', ')}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error checking Ethiopian contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  checkEthiopiaContacts();
}

export { checkEthiopiaContacts };