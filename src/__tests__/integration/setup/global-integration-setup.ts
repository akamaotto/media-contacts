/**
 * Global Integration Test Setup
 * Runs once before all integration test suites
 */

import { Config } from '@jest/types';

const globalSetup = async (globalConfig: Config.GlobalConfig) => {
  console.log('🌐 Starting global integration test setup...');

  try {
    // Check if required environment variables are set
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_ENVIRONMENT = 'test';

    // Configure AI services for testing
    process.env.AI_ENABLE_CACHING = 'true';
    process.env.AI_LOG_LEVEL = 'error';
    process.env.AI_TIMEOUT = '30000';
    process.env.AI_RETRY_ATTEMPTS = '2';

    // Mock console methods to reduce test noise
    const originalConsole = { ...console };
    global.originalConsole = originalConsole;

    // Suppress console logs in tests unless explicitly enabled
    if (!process.env.VERBOSE_TESTS) {
      console.log = jest.fn();
      console.info = jest.fn();
      console.warn = jest.fn();
      console.error = jest.fn();
    }

    // Ensure test database exists and is accessible
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
      console.log('✅ Test database connection established');

      // Run database migrations
      const { execSync } = require('child_process');
      execSync('npx prisma db push --skip-generate', {
        env: { ...process.env },
        stdio: 'pipe'
      });
      console.log('✅ Database schema synchronized');

      await prisma.$disconnect();
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }

    // Setup Redis connection for testing
    try {
      const Redis = require('redis');
      const redisClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379/1'
      });

      await redisClient.connect();
      await redisClient.quit();
      console.log('✅ Redis connection verified');
    } catch (error) {
      console.warn('⚠️ Redis not available - some tests may be skipped:', error.message);
    }

    console.log('✅ Global integration test setup completed successfully');

  } catch (error) {
    console.error('❌ Global integration test setup failed:', error);
    throw error;
  }
};

export default globalSetup;