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
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      redis = new Redis(redisUrl, {
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Connection pooling configuration
        connectionName: 'media-contacts-app',
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true; // or `1` or `2`
          }
          return false;
        }
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
  async set(key: string, value: unknown, expirationSeconds: number = 900): Promise<void> {
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
      // Use SCAN to find keys matching pattern (more efficient than KEYS)
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100
      });
      
      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          this.redis!.del(...keys);
        }
      });
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  /**
   * Cache-aside pattern with fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    expirationSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    const data = await fetcher();
    
    // Store in cache
    await this.set(key, data, expirationSeconds);
    
    return data;
  }

  /**
   * Write-through pattern
   */
  async writeThrough<T>(
    key: string,
    data: T,
    writer: (data: T) => Promise<void>,
    expirationSeconds?: number
  ): Promise<void> {
    // Write to the data source
    await writer(data);
    
    // Store in cache
    await this.set(key, data, expirationSeconds);
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
 * Cache expiration times (in seconds) based on data volatility
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
  
  // Search results cache for 10 minutes
  SEARCH: 600,
  
  // Availability data cache for 5 minutes
  AVAILABLE: 300,
};

// Export singleton instance
export const cacheService = new CacheService();