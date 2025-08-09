import { prisma } from '@/lib/prisma';
import { cacheService, CacheKeys, CacheExpiration } from '@/lib/cache';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface GeographicDataPoint {
  countryCode: string;
  countryName: string;
  contactCount: number;
  coordinates: [number, number];
  flagEmoji?: string;
}

export interface PublisherOutletData {
  publisherName: string;
  outletCount: number;
  outlets: Array<{
    name: string;
    contactCount: number;
  }>;
}

export class DashboardChartsService {
  /**
   * Get contacts distribution by country
   */
  async getContactsByCountry(timeRange: '7d' | '30d' | '3m' | '1y' = '30d'): Promise<ChartDataPoint[]> {
    // Try to get from cache first
    const cacheKey = CacheKeys.contactsByCountry(timeRange);
    const cached = await cacheService.get<ChartDataPoint[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const dateFilter = this.getDateFilter(timeRange);
    
    const result = await prisma.country.findMany({
      select: {
        name: true,
        code: true,
        flag_emoji: true,
        mediaContacts: {
          where: dateFilter ? {
            created_at: {
              gte: dateFilter
            }
          } : undefined,
          select: {
            id: true
          }
        }
      },
      orderBy: {
        mediaContacts: {
          _count: 'desc'
        }
      }
    });

    const blueShades = [
      '#1e40af', // blue-800
      '#2563eb', // blue-600
      '#3b82f6', // blue-500
      '#60a5fa', // blue-400
      '#93c5fd', // blue-300
      '#bfdbfe', // blue-200
      '#dbeafe', // blue-100
      '#eff6ff', // blue-50
      '#1e3a8a', // blue-900
      '#1d4ed8'  // blue-700
    ];

    const chartData = result
      .map((country, index) => ({
        label: country.code || country.name.substring(0, 3).toUpperCase(), // Use ISO code or first 3 letters
        value: country.mediaContacts.length,
        color: blueShades[index % blueShades.length],
        metadata: {
          countryCode: country.code,
          countryName: country.name,
          flagEmoji: country.flag_emoji
        }
      }))
      .filter(item => item.value > 0)
      .slice(0, 10); // Top 10 countries

    // Cache the result
    await cacheService.set(cacheKey, chartData, CacheExpiration.CHARTS);
    
    return chartData;
  }

  /**
   * Get contacts distribution by beat
   */
  async getContactsByBeat(timeRange: '7d' | '30d' | '3m' | '1y' = '30d'): Promise<ChartDataPoint[]> {
    // Try to get from cache first
    const cacheKey = CacheKeys.contactsByBeat(timeRange);
    const cached = await cacheService.get<ChartDataPoint[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const dateFilter = this.getDateFilter(timeRange);
    
    const result = await prisma.beat.findMany({
      select: {
        name: true,
        description: true,
        mediaContacts: {
          where: dateFilter ? {
            created_at: {
              gte: dateFilter
            }
          } : undefined,
          select: {
            id: true
          }
        }
      },
      orderBy: {
        mediaContacts: {
          _count: 'desc'
        }
      }
    });

    const chartData = result
      .map(beat => ({
        label: beat.name,
        value: beat.mediaContacts.length,
        color: this.generateColorFromString(beat.name),
        metadata: {
          description: beat.description
        }
      }))
      .filter(item => item.value > 0);

    // Cache the result
    await cacheService.set(cacheKey, chartData, CacheExpiration.CHARTS);
    
    return chartData;
  }

  /**
   * Get publisher-outlet relationship data
   */
  async getPublisherOutletDistribution(): Promise<PublisherOutletData[]> {
    const result = await prisma.publisher.findMany({
      select: {
        name: true,
        outlets: {
          select: {
            name: true,
            mediaContacts: {
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy: {
        outlets: {
          _count: 'desc'
        }
      }
    });

    return result
      .map(publisher => ({
        publisherName: publisher.name,
        outletCount: publisher.outlets.length,
        outlets: publisher.outlets.map(outlet => ({
          name: outlet.name,
          contactCount: outlet.mediaContacts.length
        }))
      }))
      .filter(item => item.outletCount > 0)
      .slice(0, 15); // Top 15 publishers
  }

  /**
   * Get geographic distribution data for mapping
   */
  async getGeographicDistribution(): Promise<GeographicDataPoint[]> {
    const result = await prisma.country.findMany({
      select: {
        name: true,
        code: true,
        latitude: true,
        longitude: true,
        flag_emoji: true,
        mediaContacts: {
          select: {
            id: true
          }
        }
      },
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      }
    });

    return result
      .map(country => ({
        countryCode: country.code || '',
        countryName: country.name,
        contactCount: country.mediaContacts.length,
        coordinates: [country.longitude!, country.latitude!] as [number, number],
        flagEmoji: country.flag_emoji || undefined
      }))
      .filter(item => item.contactCount > 0);
  }

  /**
   * Get contacts by category distribution
   * Uses the correct relationship: Category → Beats → Media Contacts
   * Note: For category charts, we use a longer default time range since 
   * category relationships are more structural than time-sensitive
   */
  async getContactsByCategory(timeRange: '7d' | '30d' | '3m' | '1y' = '1y'): Promise<ChartDataPoint[]> {
    // For category charts, use a more generous time filter or no filter for 1y
    const dateFilter = timeRange === '1y' ? null : this.getDateFilter(timeRange);
    console.log('🔍 Category chart - dateFilter:', dateFilter, 'timeRange:', timeRange);
    
    const result = await prisma.category.findMany({
      select: {
        name: true,
        description: true,
        color: true,
        beats: {
          select: {
            id: true,
            name: true,
            mediaContacts: {
              where: dateFilter ? {
                created_at: {
                  gte: dateFilter
                }
              } : undefined,
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    const blueShades = [
      '#1e40af', // blue-800
      '#2563eb', // blue-600
      '#3b82f6', // blue-500
      '#60a5fa', // blue-400
      '#93c5fd', // blue-300
      '#bfdbfe', // blue-200
      '#dbeafe', // blue-100
      '#eff6ff', // blue-50
      '#1e3a8a', // blue-900
      '#1d4ed8'  // blue-700
    ];

    console.log('🔍 Category chart - raw result:', JSON.stringify(result, null, 2));
    
    const processedData = result
      .map((category, index) => {
        // Count contacts from all beats in this category
        const contactCount = category.beats.reduce(
          (total, beat) => {
            console.log(`🔍 Beat "${beat.name}" has ${beat.mediaContacts.length} contacts`);
            return total + beat.mediaContacts.length;
          },
          0
        );
        
        console.log(`🔍 Category "${category.name}" has ${category.beats.length} beats and ${contactCount} total contacts`);
        
        return {
          label: category.name,
          value: contactCount,
          color: blueShades[index % blueShades.length],
          metadata: {
            description: category.description,
            beatCount: category.beats.length
          }
        };
      })
      .filter(item => {
        console.log(`🔍 Category "${item.label}" after filter: ${item.value} contacts`);
        return item.value > 0;
      })
      .sort((a, b) => b.value - a.value);
    
    console.log('🔍 Category chart - final processed data:', processedData);
    return processedData;
  }

  /**
   * Get contacts by language distribution
   */
  async getContactsByLanguage(): Promise<ChartDataPoint[]> {
    const result = await prisma.language.findMany({
      select: {
        name: true,
        code: true,
        countries: {
          select: {
            mediaContacts: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    return result
      .map(language => {
        const contactCount = language.countries.reduce(
          (total, country) => total + country.mediaContacts.length,
          0
        );
        
        return {
          label: language.name,
          value: contactCount,
          color: this.generateColorFromString(language.name),
          metadata: {
            languageCode: language.code
          }
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 languages
  }

  /**
   * Get trending beats based on recent activity
   */
  async getTrendingBeats(timeRange: '7d' | '30d' | '3m' = '30d'): Promise<ChartDataPoint[]> {
    const dateFilter = this.getDateFilter(timeRange);
    
    if (!dateFilter) {
      // If no date filter, return regular beat distribution
      return this.getContactsByBeat(timeRange);
    }

    const result = await prisma.beat.findMany({
      select: {
        name: true,
        description: true,
        mediaContacts: {
          where: {
            created_at: {
              gte: dateFilter
            }
          },
          select: {
            id: true,
            created_at: true
          }
        }
      }
    });

    return result
      .map(beat => ({
        label: beat.name,
        value: beat.mediaContacts.length,
        color: this.generateColorFromString(beat.name),
        metadata: {
          description: beat.description,
          trend: 'up' // Could be enhanced with actual trend calculation
        }
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 trending beats
  }

  /**
   * Get email verification status distribution
   */
  async getEmailVerificationDistribution(): Promise<ChartDataPoint[]> {
    const [verified, unverified] = await Promise.all([
      prisma.mediaContact.count({
        where: { email_verified_status: true }
      }),
      prisma.mediaContact.count({
        where: { email_verified_status: false }
      })
    ]);

    return [
      {
        label: 'Verified',
        value: verified,
        color: '#10B981', // Green
        metadata: { status: 'verified' }
      },
      {
        label: 'Unverified',
        value: unverified,
        color: '#EF4444', // Red
        metadata: { status: 'unverified' }
      }
    ].filter(item => item.value > 0);
  }

  /**
   * Generate date filter based on time range
   */
  private getDateFilter(timeRange: string): Date | null {
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return threeMonthsAgo;
      case '1y':
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return oneYearAgo;
      default:
        return null;
    }
  }

  /**
   * Generate consistent color from string
   */
  private generateColorFromString(str: string): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}

// Export singleton instance
export const dashboardChartsService = new DashboardChartsService();