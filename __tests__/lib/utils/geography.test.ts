/**
 * Tests for geography utility functions
 * Validates that our database-compatible utility functions work correctly
 */

import { 
  getCountryByCode, 
  getCountryByName, 
  getCountriesByRegion, 
  getCountriesByLanguage,
  getAllCountries,
  validateGeographyData 
} from '@/lib/utils/geography';

// Mock PrismaClient
const mockPrisma = {
  country: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  },
  language: {
    count: jest.fn()
  },
  region: {
    count: jest.fn()
  }
} as any;

describe('Geography Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCountryByCode', () => {
    it('should return country data for valid code', async () => {
      const mockCountry = {
        id: '1',
        name: 'United States',
        code: 'US',
        phone_code: '+1',
        capital: 'Washington, D.C.',
        flag_emoji: '🇺🇸',
        latitude: 39.8283,
        longitude: -98.5795,
        regions: [{ code: 'NA', category: 'continent' }],
        languages: [{ code: 'en' }]
      };

      mockPrisma.country.findFirst.mockResolvedValue(mockCountry);

      const result = await getCountryByCode('US', mockPrisma);

      expect(result).toEqual({
        id: '1',
        name: 'United States',
        code: 'US',
        phone_code: '+1',
        capital: 'Washington, D.C.',
        region: ['NA'],
        continent_code: 'NA',
        languages: ['en'],
        flag_emoji: '🇺🇸',
        latitude: 39.8283,
        longitude: -98.5795
      });

      expect(mockPrisma.country.findFirst).toHaveBeenCalledWith({
        where: {
          code: {
            equals: 'US',
            mode: 'insensitive'
          }
        },
        include: {
          regions: true,
          languages: true
        }
      });
    });

    it('should return null for non-existent country', async () => {
      mockPrisma.country.findFirst.mockResolvedValue(null);

      const result = await getCountryByCode('XX', mockPrisma);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.country.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await getCountryByCode('US', mockPrisma);

      expect(result).toBeNull();
    });

    it('should normalize country codes to uppercase', async () => {
      mockPrisma.country.findFirst.mockResolvedValue(null);

      await getCountryByCode('us', mockPrisma);

      expect(mockPrisma.country.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            code: {
              equals: 'US',
              mode: 'insensitive'
            }
          }
        })
      );
    });
  });

  describe('getCountryByName', () => {
    it('should return country data for valid name', async () => {
      const mockCountry = {
        id: '1',
        name: 'United States',
        code: 'US',
        regions: [],
        languages: []
      };

      mockPrisma.country.findFirst.mockResolvedValue(mockCountry);

      const result = await getCountryByName('United States', mockPrisma);

      expect(result).toBeDefined();
      expect(result!.name).toBe('United States');
      expect(mockPrisma.country.findFirst).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'United States',
            mode: 'insensitive'
          }
        },
        include: {
          regions: true,
          languages: true
        }
      });
    });

    it('should handle partial name matches', async () => {
      mockPrisma.country.findFirst.mockResolvedValue(null);

      await getCountryByName('United', mockPrisma);

      expect(mockPrisma.country.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              contains: 'United',
              mode: 'insensitive'
            }
          }
        })
      );
    });
  });

  describe('getCountriesByRegion', () => {
    it('should return countries for valid region', async () => {
      const mockCountries = [
        {
          id: '1',
          name: 'United States',
          code: 'US',
          regions: [{ code: 'NA', category: 'continent' }],
          languages: []
        },
        {
          id: '2',
          name: 'Canada',
          code: 'CA',
          regions: [{ code: 'NA', category: 'continent' }],
          languages: []
        }
      ];

      mockPrisma.country.findMany.mockResolvedValue(mockCountries);

      const result = await getCountriesByRegion('NA', mockPrisma);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('United States');
      expect(result[1].name).toBe('Canada');
      expect(mockPrisma.country.findMany).toHaveBeenCalledWith({
        where: {
          regions: {
            some: {
              code: {
                equals: 'NA',
                mode: 'insensitive'
              }
            }
          }
        },
        include: {
          regions: true,
          languages: true
        }
      });
    });

    it('should return empty array for non-existent region', async () => {
      mockPrisma.country.findMany.mockResolvedValue([]);

      const result = await getCountriesByRegion('XX', mockPrisma);

      expect(result).toEqual([]);
    });
  });

  describe('getCountriesByLanguage', () => {
    it('should return countries for valid language', async () => {
      const mockCountries = [
        {
          id: '1',
          name: 'United States',
          code: 'US',
          regions: [],
          languages: [{ code: 'en' }]
        }
      ];

      mockPrisma.country.findMany.mockResolvedValue(mockCountries);

      const result = await getCountriesByLanguage('en', mockPrisma);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('United States');
      expect(mockPrisma.country.findMany).toHaveBeenCalledWith({
        where: {
          languages: {
            some: {
              code: {
                equals: 'en',
                mode: 'insensitive'
              }
            }
          }
        },
        include: {
          regions: true,
          languages: true
        }
      });
    });
  });

  describe('getAllCountries', () => {
    it('should return all countries from database', async () => {
      const mockCountries = [
        {
          id: '1',
          name: 'United States',
          code: 'US',
          regions: [],
          languages: []
        }
      ];

      mockPrisma.country.findMany.mockResolvedValue(mockCountries);

      const result = await getAllCountries(mockPrisma);

      expect(result).toHaveLength(1);
      expect(mockPrisma.country.findMany).toHaveBeenCalledWith({
        include: {
          regions: true,
          languages: true
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.country.findMany.mockRejectedValue(new Error('Database error'));

      const result = await getAllCountries(mockPrisma);

      expect(result).toEqual([]);
    });
  });

  describe('validateGeographyData', () => {
    it('should return valid result when data exists', async () => {
      mockPrisma.country.count.mockResolvedValue(195);
      mockPrisma.language.count.mockResolvedValue(100);
      mockPrisma.region.count.mockResolvedValue(50);

      const result = await validateGeographyData(mockPrisma);

      expect(result.valid).toBe(true);
      expect(result.countriesCount).toBe(195);
      expect(result.languagesCount).toBe(100);
      expect(result.regionsCount).toBe(50);
      expect(result.issues).toEqual([]);
    });

    it('should identify missing data', async () => {
      mockPrisma.country.count.mockResolvedValue(0);
      mockPrisma.language.count.mockResolvedValue(0);
      mockPrisma.region.count.mockResolvedValue(0);

      const result = await validateGeographyData(mockPrisma);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No countries found in database');
      expect(result.issues).toContain('No languages found in database');
      expect(result.issues).toContain('No regions found in database');
    });

    it('should identify countries without codes', async () => {
      mockPrisma.country.count
        .mockResolvedValueOnce(10) // total countries
        .mockResolvedValueOnce(2); // countries without codes
      mockPrisma.language.count.mockResolvedValue(5);
      mockPrisma.region.count.mockResolvedValue(3);

      const result = await validateGeographyData(mockPrisma);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('2 countries missing ISO codes');
    });

    it('should handle database connection errors', async () => {
      mockPrisma.country.count.mockRejectedValue(new Error('Connection failed'));

      const result = await validateGeographyData(mockPrisma);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Database connection error: Connection failed');
    });
  });
});