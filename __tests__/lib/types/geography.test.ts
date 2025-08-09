/**
 * Tests for geography type definitions
 * Validates that our type definitions work correctly after static content cleanup
 */

import type { Language, Region, CountryData, RegionCategory } from '@/lib/types/geography';

describe('Geography Types', () => {
  describe('Language interface', () => {
    it('should accept valid language objects', () => {
      const validLanguage: Language = {
        code: 'en',
        name: 'English',
        native: 'English',
        rtl: false,
        countries: []
      };

      expect(validLanguage.code).toBe('en');
      expect(validLanguage.name).toBe('English');
      expect(validLanguage.native).toBe('English');
      expect(validLanguage.rtl).toBe(false);
    });

    it('should accept minimal language objects', () => {
      const minimalLanguage: Language = {
        code: 'fr',
        name: 'French'
      };

      expect(minimalLanguage.code).toBe('fr');
      expect(minimalLanguage.name).toBe('French');
    });

    it('should accept RTL languages', () => {
      const rtlLanguage: Language = {
        code: 'ar',
        name: 'Arabic',
        native: 'العربية',
        rtl: true
      };

      expect(rtlLanguage.rtl).toBe(true);
    });
  });

  describe('Region interface', () => {
    it('should accept valid region objects', () => {
      const validRegion: Region = {
        code: 'NA',
        name: 'North America',
        category: 'continent',
        description: 'North American continent'
      };

      expect(validRegion.code).toBe('NA');
      expect(validRegion.category).toBe('continent');
    });

    it('should accept regions with parent codes', () => {
      const subregion: Region = {
        code: 'WE',
        name: 'Western Europe',
        category: 'subregion',
        parentCode: 'EU'
      };

      expect(subregion.parentCode).toBe('EU');
      expect(subregion.category).toBe('subregion');
    });

    it('should accept regions with countries', () => {
      const regionWithCountries: Region = {
        code: 'EU',
        name: 'Europe',
        category: 'continent',
        countries: [
          {
            id: '1',
            name: 'France',
            code: 'FR',
            flag_emoji: '🇫🇷'
          }
        ]
      };

      expect(regionWithCountries.countries).toHaveLength(1);
      expect(regionWithCountries.countries![0].code).toBe('FR');
    });
  });

  describe('CountryData interface', () => {
    it('should accept valid country objects', () => {
      const validCountry: CountryData = {
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
      };

      expect(validCountry.code).toBe('US');
      expect(validCountry.region).toContain('NA');
      expect(validCountry.languages).toContain('en');
    });

    it('should accept minimal country objects', () => {
      const minimalCountry: CountryData = {
        name: 'Test Country',
        code: 'TC'
      };

      expect(minimalCountry.name).toBe('Test Country');
      expect(minimalCountry.code).toBe('TC');
    });

    it('should accept countries with database IDs', () => {
      const countryWithId: CountryData = {
        id: 'country-123',
        name: 'France',
        code: 'FR'
      };

      expect(countryWithId.id).toBe('country-123');
    });
  });

  describe('RegionCategory type', () => {
    it('should accept valid region categories', () => {
      const validCategories: RegionCategory[] = [
        'continent',
        'subregion',
        'economic',
        'political',
        'organization',
        'trade_agreement',
        'geographical',
        'other'
      ];

      validCategories.forEach(category => {
        const region: Region = {
          code: 'TEST',
          name: 'Test Region',
          category: category
        };
        expect(region.category).toBe(category);
      });
    });
  });
});