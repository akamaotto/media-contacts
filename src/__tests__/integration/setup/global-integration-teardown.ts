/**
 * Global Integration Test Teardown
 * Runs once after all integration test suites
 */

import { Config } from '@jest/types';

const globalTeardown = async (globalConfig: Config.GlobalConfig) => {
  console.log('🧹 Starting global integration test teardown...');

  try {
    // Restore original console methods
    if (global.originalConsole) {
      Object.assign(console, global.originalConsole);
    }

    // Clean up test database if configured to do so
    if (process.env.CLEANUP_TEST_DB === 'true') {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      try {
        await prisma.$connect();

        // Get all tables and truncate them
        const tablenames = await prisma.$queryRaw<
          Array<{ tablename: string }>
        >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

        for (const { tablename } of tablenames) {
          if (tablename !== '_prisma_migrations') {
            try {
              await prisma.$executeRawUnsafe(
                `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
              );
            } catch (error) {
              // Table might not exist, which is fine
            }
          }
        }

        await prisma.$disconnect();
        console.log('✅ Test database cleaned up');
      } catch (error) {
        console.warn('⚠️ Database cleanup failed:', error.message);
      }
    }

    // Clear Redis test data if available
    try {
      const Redis = require('redis');
      const redisClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379/1'
      });

      await redisClient.connect();
      await redisClient.flushDb(); // Clear only the current database
      await redisClient.quit();
      console.log('✅ Redis test data cleared');
    } catch (error) {
      // Redis might not be available or already disconnected
      console.log('ℹ️ Redis cleanup skipped:', error.message);
    }

    // Clear any remaining mock timers and handles
    jest.clearAllTimers();
    jest.useRealTimers();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log('✅ Global integration test teardown completed successfully');

  } catch (error) {
    console.error('❌ Global integration test teardown failed:', error);
    // Don't throw error during teardown to avoid failing the test suite
  }
};

export default globalTeardown;