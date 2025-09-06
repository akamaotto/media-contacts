import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedTestUsers() {
  console.log('🌱 Seeding test users...');

  try {
    // Create test admin user
    const hashedPassword = await bcrypt.hash('test@123', 12);

    await prisma.users.upsert({
      where: { email: 'test@test.com' },
      update: {
        hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN'
      },
      create: {
        id: 'test-admin-id',
        email: 'test@test.com',
        hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN',
        updatedAt: new Date()
      }
    });

    // Create test regular user
    await prisma.users.upsert({
      where: { email: 'testuser@test.com' },
      update: {
        hashedPassword,
        name: 'Test User',
        role: 'USER'
      },
      create: {
        id: 'test-user-id',
        email: 'testuser@test.com',
        hashedPassword,
        name: 'Test User',
        role: 'USER',
        updatedAt: new Date()
      }
    });

    console.log('✅ Test users seeded successfully');

    // Verify users exist
    const users = await prisma.users.findMany({
      where: {
        email: {
          in: ['test@test.com', 'testuser@test.com']
        }
      },
      select: {
        email: true,
        name: true,
        role: true
      }
    });

    console.log('📋 Current test users:', users);

  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedTestUsers };
