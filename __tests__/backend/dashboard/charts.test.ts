import { DashboardChartsService } from '@/backend/dashboard/charts';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    country: {
      findMany: jest.fn()
    },
    beat: {
      findMany: jest.fn()
    },
    publisher: {
      findMany: jest.fn()
    },
    category: {
      findMany: jest.fn()
    },
    language: {
      findMany: jest.fn()
    },
    mediaContact: {
      count: jest.fn()
    }
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('DashboardChartsService', () => {
  let service: DashboardChartsService;

  beforeEach(() => {
    service = new DashboardChartsService();
    jest.clearAllMocks();
  });

  describe('getContactsByCountry', () => {
    it('should return contacts distribution by country', async () => {
      const mockCountries = [
        {
          name: 'United States',
          code: 'US',
          flag_emoji: '🇺🇸',
          mediaContacts: [{ id: '1' }, { id: '2' }, { id: '3' }]
        },
        {
          name: 'United Kingdom',
          code: 'GB',
          flag_emoji: '🇬🇧',
          mediaContacts: [{ id: '4' }, { id: '5' }]
        },
        {
          name: 'Canada',
          code: 'CA',
          flag_emoji: '🇨🇦',
          mediaContacts: []
        }
      ];

      mockPrisma.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.getContactsByCountry('30d');

      expect(result).toHaveLength(2); // Only countries with contacts
      expect(result[0]).toEqual({
        label: 'United States',
        value: 3,
        color: expect.any(String),
        metadata: {
          countryCode: 'US',
          flagEmoji: '🇺🇸'
        }
      });
      expect(result[1]).toEqual({
        label: 'United Kingdom',
        value: 2,
        color: expect.any(String),
        metadata: {
          countryCode: 'GB',
          flagEmoji: '🇬🇧'
        }
      });
    });

    it('should apply time range filter', async () => {
      mockPrisma.country.findMany.mockResolvedValue([]);

      await service.getContactsByCountry('7d');

      expect(mockPrisma.country.findMany).toHaveBeenCalledWith({
        select: {
          name: true,
          code: true,
          flag_emoji: true,
          mediaContacts: {
            where: {
              created_at: {
                gte: expect.any(Date)
              }
            },
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
    });
  });

  describe('getContactsByBeat', () => {
    it('should return contacts distribution by beat', async () => {
      const mockBeats = [
        {
          name: 'Technology',
          description: 'Tech news and updates',
          mediaContacts: [{ id: '1' }, { id: '2' }]
        },
        {
          name: 'Business',
          description: 'Business and finance',
          mediaContacts: [{ id: '3' }]
        },
        {
          name: 'Sports',
          description: 'Sports coverage',
          mediaContacts: []
        }
      ];

      mockPrisma.beat.findMany.mockResolvedValue(mockBeats);

      const result = await service.getContactsByBeat();

      expect(result).toHaveLength(2); // Only beats with contacts
      expect(result[0]).toEqual({
        label: 'Technology',
        value: 2,
        color: expect.any(String),
        metadata: {
          description: 'Tech news and updates'
        }
      });
      expect(result[1]).toEqual({
        label: 'Business',
        value: 1,
        color: expect.any(String),
        metadata: {
          description: 'Business and finance'
        }
      });
    });
  });

  describe('getPublisherOutletDistribution', () => {
    it('should return publisher-outlet relationship data', async () => {
      const mockPublishers = [
        {
          name: 'TechCorp Media',
          outlets: [
            {
              name: 'TechNews',
              mediaContacts: [{ id: '1' }, { id: '2' }]
            },
            {
              name: 'TechBlog',
              mediaContacts: [{ id: '3' }]
            }
          ]
        },
        {
          name: 'Business Weekly',
          outlets: [
            {
              name: 'BizNews',
              mediaContacts: [{ id: '4' }]
            }
          ]
        },
        {
          name: 'Empty Publisher',
          outlets: []
        }
      ];

      mockPrisma.publisher.findMany.mockResolvedValue(mockPublishers);

      const result = await service.getPublisherOutletDistribution();

      expect(result).toHaveLength(2); // Only publishers with outlets
      expect(result[0]).toEqual({
        publisherName: 'TechCorp Media',
        outletCount: 2,
        outlets: [
          { name: 'TechNews', contactCount: 2 },
          { name: 'TechBlog', contactCount: 1 }
        ]
      });
      expect(result[1]).toEqual({
        publisherName: 'Business Weekly',
        outletCount: 1,
        outlets: [
          { name: 'BizNews', contactCount: 1 }
        ]
      });
    });
  });

  describe('getGeographicDistribution', () => {
    it('should return geographic data with coordinates', async () => {
      const mockCountries = [
        {
          name: 'United States',
          code: 'US',
          latitude: 39.8283,
          longitude: -98.5795,
          flag_emoji: '🇺🇸',
          mediaContacts: [{ id: '1' }, { id: '2' }]
        },
        {
          name: 'United Kingdom',
          code: 'GB',
          latitude: 55.3781,
          longitude: -3.4360,
          flag_emoji: '🇬🇧',
          mediaContacts: [{ id: '3' }]
        },
        {
          name: 'No Contacts Country',
          code: 'NC',
          latitude: 0,
          longitude: 0,
          flag_emoji: '🏳️',
          mediaContacts: []
        }
      ];

      mockPrisma.country.findMany.mockResolvedValue(mockCountries);

      const result = await service.getGeographicDistribution();

      expect(result).toHaveLength(2); // Only countries with contacts
      expect(result[0]).toEqual({
        countryCode: 'US',
        countryName: 'United States',
        contactCount: 2,
        coordinates: [-98.5795, 39.8283],
        flagEmoji: '🇺🇸'
      });
      expect(result[1]).toEqual({
        countryCode: 'GB',
        countryName: 'United Kingdom',
        contactCount: 1,
        coordinates: [-3.4360, 55.3781],
        flagEmoji: '🇬🇧'
      });
    });
  });

  describe('getContactsByCategory', () => {
    it('should return contacts distribution by category', async () => {
      const mockCategories = [
        {
          name: 'Technology',
          description: 'Tech category',
          color: '#3B82F6',
          outlets: [
            {
              mediaContacts: [{ id: '1' }, { id: '2' }]
            },
            {
              mediaContacts: [{ id: '3' }]
            }
          ]
        },
        {
          name: 'Business',
          description: 'Business category',
          color: null,
          outlets: [
            {
              mediaContacts: [{ id: '4' }]
            }
          ]
        }
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.getContactsByCategory();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: 'Technology',
        value: 3,
        color: '#3B82F6',
        metadata: {
          description: 'Tech category'
        }
      });
      expect(result[1]).toEqual({
        label: 'Business',
        value: 1,
        color: expect.any(String), // Generated color
        metadata: {
          description: 'Business category'
        }
      });
    });
  });

  describe('getContactsByLanguage', () => {
    it('should return contacts distribution by language', async () => {
      const mockLanguages = [
        {
          name: 'English',
          code: 'en',
          countries: [
            {
              mediaContacts: [{ id: '1' }, { id: '2' }]
            },
            {
              mediaContacts: [{ id: '3' }]
            }
          ]
        },
        {
          name: 'Spanish',
          code: 'es',
          countries: [
            {
              mediaContacts: [{ id: '4' }]
            }
          ]
        },
        {
          name: 'French',
          code: 'fr',
          countries: [
            {
              mediaContacts: []
            }
          ]
        }
      ];

      mockPrisma.language.findMany.mockResolvedValue(mockLanguages);

      const result = await service.getContactsByLanguage();

      expect(result).toHaveLength(2); // Only languages with contacts
      expect(result[0]).toEqual({
        label: 'English',
        value: 3,
        color: expect.any(String),
        metadata: {
          languageCode: 'en'
        }
      });
      expect(result[1]).toEqual({
        label: 'Spanish',
        value: 1,
        color: expect.any(String),
        metadata: {
          languageCode: 'es'
        }
      });
    });
  });

  describe('getEmailVerificationDistribution', () => {
    it('should return email verification status distribution', async () => {
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(120) // verified
        .mockResolvedValueOnce(30); // unverified

      const result = await service.getEmailVerificationDistribution();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: 'Verified',
        value: 120,
        color: '#10B981',
        metadata: { status: 'verified' }
      });
      expect(result[1]).toEqual({
        label: 'Unverified',
        value: 30,
        color: '#EF4444',
        metadata: { status: 'unverified' }
      });
    });

    it('should filter out zero values', async () => {
      mockPrisma.mediaContact.count
        .mockResolvedValueOnce(120) // verified
        .mockResolvedValueOnce(0); // unverified

      const result = await service.getEmailVerificationDistribution();

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Verified');
    });
  });

  describe('getTrendingBeats', () => {
    it('should return trending beats with recent activity', async () => {
      const mockBeats = [
        {
          name: 'AI & Machine Learning',
          description: 'Latest in AI',
          mediaContacts: [
            { id: '1', created_at: new Date() },
            { id: '2', created_at: new Date() }
          ]
        },
        {
          name: 'Cryptocurrency',
          description: 'Crypto news',
          mediaContacts: [
            { id: '3', created_at: new Date() }
          ]
        }
      ];

      mockPrisma.beat.findMany.mockResolvedValue(mockBeats);

      const result = await service.getTrendingBeats('7d');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: 'AI & Machine Learning',
        value: 2,
        color: expect.any(String),
        metadata: {
          description: 'Latest in AI',
          trend: 'up'
        }
      });
    });
  });

  describe('color generation', () => {
    it('should generate consistent colors for same strings', async () => {
      const service1 = new DashboardChartsService();
      const service2 = new DashboardChartsService();
      
      // Access private method through any cast for testing
      const color1 = (service1 as any).generateColorFromString('Technology');
      const color2 = (service2 as any).generateColorFromString('Technology');
      
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});