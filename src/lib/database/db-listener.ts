/**
 * Database Listener Service
 * Listens for database changes and triggers cache invalidation
 */

import { Client } from 'pg';
import { cacheInvalidationService } from '@/lib/caching/cache-invalidation';

export class DatabaseListener {
  private client: Client | null = null;
  private isConnected = false;

  constructor() {
    // Only initialize in production or when DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      this.client = new Client({
        connectionString: process.env.DATABASE_URL
      });
    }
  }

  async connect() {
    if (!this.client || this.isConnected) {
      return;
    }

    try {
      await this.client.connect();
      await this.client.query('LISTEN cache_invalidation');
      
      this.client.on('notification', (msg) => {
        if (msg.channel === 'cache_invalidation') {
          this.handleCacheInvalidation(JSON.parse(msg.payload!));
        }
      });
      
      this.isConnected = true;
      console.log('Database listener connected successfully');
    } catch (error) {
      console.error('Failed to connect database listener:', error);
    }
  }

  private async handleCacheInvalidation(payload: {
    table: string;
    operation: string;
    id: string;
    timestamp: number;
  }) {
    const { table, operation, id } = payload;
    
    try {
      // Emit appropriate events based on table and operation
      switch (table) {
        case 'beats':
          await cacheInvalidationService.invalidateOnBeatChange();
          break;
        case 'categories':
          await cacheInvalidationService.invalidateOnCategoryChange();
          break;
        case 'countries':
          await cacheInvalidationService.invalidateOnCountryChange();
          break;
        case 'outlets':
          await cacheInvalidationService.invalidateOnOutletChange();
          break;
        case 'publishers':
          await cacheInvalidationService.invalidateOnPublisherChange();
          break;
        case 'media_contacts':
          await cacheInvalidationService.invalidateOnMediaContactChange();
          break;
        default:
          // For unknown tables, invalidate all dashboard cache
          await cacheInvalidationService.invalidateAllDashboardCache();
          break;
      }
      
      console.log(`Cache invalidated for ${table} ${operation} operation on id ${id}`);
    } catch (error) {
      console.error('Error handling cache invalidation:', error);
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.end();
        this.isConnected = false;
        console.log('Database listener disconnected');
      } catch (error) {
        console.error('Error disconnecting database listener:', error);
      }
    }
  }
}

// Export singleton instance
export const dbListener = new DatabaseListener();