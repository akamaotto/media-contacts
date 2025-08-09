import Redis from 'ioredis';

// Redis client singleton
let redis: Redis | null = null;

/**
 * Get Redis client instance
 */
function getRedisClient(): Redis | null {
  // Skip Redis in development if not configured
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      redis.on('error', (error) => {
        console.error('Redis connection error:', error);
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });
    } catch (error) {
      console.error('Failed to create Redis client:', error);
      return null;
    }
  }

  return redis;
}

/**
 * Cache service for dashboard data
 */
export class CacheService {
  private redis: Redis | null;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with expiration
   */
  async set(key: string, value: any, expirationSeconds: number = 300): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.setex(key, expirationSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple cached values by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redis !== null;
  }
}

/**
 * Cache key generators for dashboard data
 */
export const CacheKeys = {
  // Dashboard metrics
  dashboardMetrics: (period: string) => `dashboard:metrics:${period}`,
  totalContacts: () => 'dashboard:total_contacts',
  totalPublishers: () => 'dashboard:total_publishers',
  totalOutlets: () => 'dashboard:total_outlets',
  verifiedContacts: () => 'dashboard:verified_contacts',
  historicalCount: (metric: string, date: string) => `dashboard:historical:${metric}:${date}`,

  // Chart data
  chartData: (type: string, period: string) => `dashboard:charts:${type}:${period}`,
  contactsByCountry: (period: string) => `dashboard:charts:contacts_by_country:${period}`,
  contactsByBeat: (period: string) => `dashboard:charts:contacts_by_beat:${period}`,
  publisherOutlets: (period: string) => `dashboard:charts:publisher_outlets:${period}`,

  // Activity data
  activityFeed: (page: number, limit: number, filters?: string) => 
    `dashboard:activity:${page}:${limit}${filters ? `:${filters}` : ''}`,
  activityStats: () => 'dashboard:activity:stats',

  // Geographic data
  geographicData: (filters?: string) => `dashboard:geographic${filters ? `:${filters}` : ''}`,
};

/**
 * Cache expiration times (in seconds)
 */
export const CacheExpiration = {
  // Metrics cache for 5 minutes (data doesn't change frequently)
  METRICS: 300,
  
  // Chart data cache for 10 minutes
  CHARTS: 600,
  
  // Activity feed cache for 2 minutes (more dynamic)
  ACTIVITY: 120,
  
  // Geographic data cache for 15 minutes
  GEOGRAPHIC: 900,
  
  // Historical data cache for 1 hour (rarely changes)
  HISTORICAL: 3600,
};

// Export singleton instance
export const cacheService = new CacheService();
