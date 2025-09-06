import { cacheService, CacheKeys } from './cache';

/**
 * Cache invalidation service for dashboard data
 */
export class CacheInvalidationService {
  /**
   * Invalidate all dashboard metrics cache when data changes
   */
  async invalidateDashboardMetrics(): Promise<void> {
    const patterns = [
      'dashboard:metrics:*',
      'dashboard:total_*',
      'dashboard:verified_*'
    ];

    await Promise.all(
      patterns.map(pattern => cacheService.deletePattern(pattern))
    );
  }

  /**
   * Invalidate chart data cache
   */
  async invalidateChartData(): Promise<void> {
    await cacheService.deletePattern('dashboard:charts:*');
  }

  /**
   * Invalidate activity feed cache
   */
  async invalidateActivityFeed(): Promise<void> {
    const patterns = [
      'dashboard:activity:*',
      'dashboard:activity:stats'
    ];

    await Promise.all(
      patterns.map(pattern => cacheService.deletePattern(pattern))
    );
  }

  /**
   * Invalidate geographic data cache
   */
  async invalidateGeographicData(): Promise<void> {
    await cacheService.deletePattern('dashboard:geographic*');
  }

  /**
   * Invalidate all dashboard cache
   */
  async invalidateAllDashboardCache(): Promise<void> {
    await Promise.all([
      this.invalidateDashboardMetrics(),
      this.invalidateChartData(),
      this.invalidateActivityFeed(),
      this.invalidateGeographicData()
    ]);
  }

  /**
   * Invalidate cache when media contacts are modified
   */
  async invalidateOnMediaContactChange(): Promise<void> {
    await Promise.all([
      this.invalidateDashboardMetrics(),
      this.invalidateChartData(),
      this.invalidateGeographicData()
    ]);
  }

  /**
   * Invalidate cache when publishers are modified
   */
  async invalidateOnPublisherChange(): Promise<void> {
    await Promise.all([
      this.invalidateDashboardMetrics(),
      this.invalidateChartData()
    ]);
  }

  /**
   * Invalidate cache when outlets are modified
   */
  async invalidateOnOutletChange(): Promise<void> {
    await Promise.all([
      this.invalidateDashboardMetrics(),
      this.invalidateChartData()
    ]);
  }

  /**
   * Invalidate cache when beats are modified
   */
  async invalidateOnBeatChange(): Promise<void> {
    await this.invalidateChartData();
  }

  /**
   * Invalidate cache when countries are modified
   */
  async invalidateOnCountryChange(): Promise<void> {
    await Promise.all([
      this.invalidateChartData(),
      this.invalidateGeographicData()
    ]);
  }

  /**
   * Invalidate cache when categories are modified
   */
  async invalidateOnCategoryChange(): Promise<void> {
    await this.invalidateChartData();
  }

  /**
   * Invalidate cache when any CRUD operation occurs
   */
  async invalidateOnCrudOperation(entityType: string): Promise<void> {
    // Always invalidate activity feed for any CRUD operation
    await this.invalidateActivityFeed();

    // Invalidate specific caches based on entity type
    switch (entityType) {
      case 'media_contact':
        await this.invalidateOnMediaContactChange();
        break;
      case 'publisher':
        await this.invalidateOnPublisherChange();
        break;
      case 'outlet':
        await this.invalidateOnOutletChange();
        break;
      case 'beat':
        await this.invalidateOnBeatChange();
        break;
      case 'country':
        await this.invalidateOnCountryChange();
        break;
      case 'category':
        await this.invalidateOnCategoryChange();
        break;
      default:
        // For unknown entity types, invalidate all dashboard cache
        await this.invalidateAllDashboardCache();
        break;
    }
  }
}

// Export singleton instance
export const cacheInvalidationService = new CacheInvalidationService();
