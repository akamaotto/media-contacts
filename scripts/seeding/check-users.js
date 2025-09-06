const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking existing users...');
    
    const users = await prisma.users.findMany();
    console.log(`Found ${users.length} users:`);
    
    users.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    });
    
    // Check if our test user exists
    const testUser = await prisma.users.findUnique({
      where: { email: 'paul.otto@example.com' }
    });
    
    if (testUser) {
      console.log(`\nTest user found:`);
      console.log(`- Email: ${testUser.email}`);
      console.log(`- Role: ${testUser.role}`);
      console.log(`- ID: ${testUser.id}`);
    } else {
      console.log('\nTest user not found');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers().catch(console.error);