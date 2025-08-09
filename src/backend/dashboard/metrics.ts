import { prisma } from '@/lib/prisma';
import { cacheService, CacheKeys, CacheExpiration } from '@/lib/cache';

export interface DashboardMetrics {
  totalContacts: number;
  totalPublishers: number;
  totalOutlets: number;
  verifiedContacts: number;
  emailVerificationRate: number;
  contactsChange: MetricChange;
  publishersChange: MetricChange;
  outletsChange: MetricChange;
  verificationChange: MetricChange;
}

export interface MetricChange {
  value: number;
  percentage: number;
  period: string;
}

export class DashboardMetricsService {
  /**
   * Get current dashboard metrics with percentage changes
   */
  async getDashboardMetrics(period: '7d' | '30d' | '3m' = '30d'): Promise<DashboardMetrics> {
    // Try to get from cache first
    const cacheKey = CacheKeys.dashboardMetrics(period);
    const cachedMetrics = await cacheService.get<DashboardMetrics>(cacheKey);
    
    if (cachedMetrics) {
      return cachedMetrics;
    }

    const now = new Date();
    const periodDate = this.getPeriodDate(now, period);
    
    // Get current counts
    const [
      totalContacts,
      totalPublishers,
      totalOutlets,
      verifiedContacts
    ] = await Promise.all([
      this.getTotalContacts(),
      this.getTotalPublishers(),
      this.getTotalOutlets(),
      this.getVerifiedContacts()
    ]);

    const emailVerificationRate = totalContacts > 0 
      ? Math.round((verifiedContacts / totalContacts) * 100) 
      : 0;

    // Get historical counts for comparison
    const [
      historicalContacts,
      historicalPublishers,
      historicalOutlets,
      historicalVerified
    ] = await Promise.all([
      this.getHistoricalCount('total_contacts', periodDate),
      this.getHistoricalCount('total_publishers', periodDate),
      this.getHistoricalCount('total_outlets', periodDate),
      this.getHistoricalCount('verified_contacts', periodDate)
    ]);

    const historicalVerificationRate = historicalContacts > 0 
      ? Math.round((historicalVerified / historicalContacts) * 100) 
      : 0;

    const metrics = {
      totalContacts,
      totalPublishers,
      totalOutlets,
      verifiedContacts,
      emailVerificationRate,
      contactsChange: this.calculateChange(totalContacts, historicalContacts, period),
      publishersChange: this.calculateChange(totalPublishers, historicalPublishers, period),
      outletsChange: this.calculateChange(totalOutlets, historicalOutlets, period),
      verificationChange: this.calculateChange(emailVerificationRate, historicalVerificationRate, period)
    };

    // Cache the result
    await cacheService.set(cacheKey, metrics, CacheExpiration.METRICS);
    
    return metrics;
  }

  /**
   * Get total number of media contacts
   */
  async getTotalContacts(): Promise<number> {
    const cacheKey = CacheKeys.totalContacts();
    const cached = await cacheService.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const count = await prisma.mediaContact.count();
    await cacheService.set(cacheKey, count, CacheExpiration.METRICS);
    
    return count;
  }

  /**
   * Get total number of publishers
   */
  async getTotalPublishers(): Promise<number> {
    const cacheKey = CacheKeys.totalPublishers();
    const cached = await cacheService.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const count = await prisma.publisher.count();
    await cacheService.set(cacheKey, count, CacheExpiration.METRICS);
    
    return count;
  }

  /**
   * Get total number of outlets
   */
  async getTotalOutlets(): Promise<number> {
    const cacheKey = CacheKeys.totalOutlets();
    const cached = await cacheService.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const count = await prisma.outlet.count();
    await cacheService.set(cacheKey, count, CacheExpiration.METRICS);
    
    return count;
  }

  /**
   * Get number of verified email contacts
   */
  async getVerifiedContacts(): Promise<number> {
    const cacheKey = CacheKeys.verifiedContacts();
    const cached = await cacheService.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const count = await prisma.mediaContact.count({
      where: {
        email_verified_status: true
      }
    });
    
    await cacheService.set(cacheKey, count, CacheExpiration.METRICS);
    
    return count;
  }

  /**
   * Store current metrics in the database for historical tracking
   */
  async storeCurrentMetrics(): Promise<void> {
    const [
      totalContacts,
      totalPublishers,
      totalOutlets,
      verifiedContacts
    ] = await Promise.all([
      this.getTotalContacts(),
      this.getTotalPublishers(),
      this.getTotalOutlets(),
      this.getVerifiedContacts()
    ]);

    const metrics = [
      { metricType: 'total_contacts', value: totalContacts },
      { metricType: 'total_publishers', value: totalPublishers },
      { metricType: 'total_outlets', value: totalOutlets },
      { metricType: 'verified_contacts', value: verifiedContacts }
    ];

    await Promise.all(
      metrics.map(metric =>
        prisma.dashboardMetric.create({
          data: metric
        })
      )
    );
  }

  /**
   * Get historical count for a specific metric type
   */
  private async getHistoricalCount(metricType: string, date: Date): Promise<number> {
    const cacheKey = CacheKeys.historicalCount(metricType, date.toISOString());
    const cached = await cacheService.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const historicalMetric = await prisma.dashboardMetric.findFirst({
      where: {
        metricType,
        date: {
          lte: date
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    const value = historicalMetric?.value ?? 0;
    
    // Cache historical data for longer since it doesn't change
    await cacheService.set(cacheKey, value, CacheExpiration.HISTORICAL);
    
    return value;
  }

  /**
   * Calculate percentage change between current and historical values
   */
  private calculateChange(current: number, historical: number, period: string): MetricChange {
    const change = current - historical;
    const percentage = historical > 0 ? Math.round((change / historical) * 100) : 0;
    
    return {
      value: change,
      percentage,
      period: this.getPeriodLabel(period)
    };
  }

  /**
   * Get date for the specified period ago
   */
  private getPeriodDate(now: Date, period: '7d' | '30d' | '3m'): Date {
    const date = new Date(now);
    
    switch (period) {
      case '7d':
        date.setDate(date.getDate() - 7);
        break;
      case '30d':
        date.setDate(date.getDate() - 30);
        break;
      case '3m':
        date.setMonth(date.getMonth() - 3);
        break;
    }
    
    return date;
  }

  /**
   * Get human-readable period label
   */
  private getPeriodLabel(period: string): string {
    switch (period) {
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      case '3m':
        return 'Last 3 months';
      default:
        return 'Last 30 days';
    }
  }
}

// Export singleton instance
export const dashboardMetricsService = new DashboardMetricsService();