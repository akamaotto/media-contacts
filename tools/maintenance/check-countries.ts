import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCountries() {
  try {
    // Check if Nigeria exists in the countries table
    const nigeria = await prisma.countries.findFirst({
      where: {
        name: 'Nigeria'
      }
    });
    
    if (nigeria) {
      console.log('Nigeria found in countries table:');
      console.log(nigeria);
    } else {
      console.log('Nigeria not found in countries table');
      
      // List all countries
      const allCountries = await prisma.countries.findMany({
        select: {
          name: true
        }
      });
      
      console.log('Available countries:');
      allCountries.forEach(country => {
        console.log(`- ${country.name}`);
      });
    }
  } catch (error) {
    console.error('Error checking countries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  checkCountries();
}

export { checkCountries };