// /Users/akamaotto/code/media-contacts/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client configuration and initialization
 * Following Rust-inspired principles with explicit error handling and logging
 */

// Declare a global variable to hold the PrismaClient instance.
// This is necessary because in development, Next.js clears the Node.js module cache on every request,
// which would lead to creating new PrismaClient instances if not handled this way.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaConnected: boolean;
}

// Track connection state to avoid redundant connection attempts
if (global.prismaConnected === undefined) {
  global.prismaConnected = false;
}

// Initialize PrismaClient with explicit error handling.
function createPrismaClient(): PrismaClient {
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
    
    // Connect explicitly and handle connection errors
    if (!global.prismaConnected) {
      client.$connect()
        .then(() => {
          console.log('Prisma client connected successfully');
          global.prismaConnected = true;
        })
        .catch((err) => {
          console.error('Failed to connect Prisma client:', err);
          global.prismaConnected = false;
        });
    }
    
    return client;
  } catch (error) {
    console.error('Error initializing Prisma client:', error);
    // Create a minimal mock client that won't throw errors when methods are called
    // This prevents cascading errors in the application
    return {} as PrismaClient;
  }
}

// If we're in production or if a global instance doesn't exist, create a new one.
// Otherwise, use the existing global instance. This ensures that only one instance
// of PrismaClient is active, preventing database connection pool exhaustion.
export const prisma = global.prisma || createPrismaClient();

// Save the client instance in development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Educational Comment:
// Why is this singleton pattern important for PrismaClient in Next.js?
// 1. Connection Pooling: PrismaClient manages a connection pool to your database. Creating multiple
//    instances can lead to exceeding the maximum number of connections allowed by your database,
//    causing errors and performance issues.
// 2. Hot Reloading in Development: Next.js's hot reloading feature can cause your module code to be
//    re-executed frequently. Without a singleton, each re-execution would create a new PrismaClient
//    instance, quickly exhausting connections.
// 3. Resource Efficiency: Each PrismaClient instance consumes resources. A single instance is more
//    efficient.
//
// The `declare global` and `global.prisma` trick is a common way to persist the instance across
// hot reloads in development. In production, the module is typically loaded once, so `global.prisma`
// might not be strictly necessary but doesn't harm and keeps the code consistent.
