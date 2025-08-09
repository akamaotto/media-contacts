/**
 * Integration tests for geography types
 * Validates that components can properly import and use the new type definitions
 */

import type { Language, Region, CountryData, RegionCategory } from '@/lib/types/geography';
import type { Language as LegacyLanguage } from '@/lib/language-data';
import type { Region as LegacyRegion, CountryData as LegacyCountryData, Language as LegacyLanguage2 } from '@/lib/country-data';
import type { CountryData as AllCountriesData } from '@/lib/all-countries';

describe('Geography Types Integration', () => {
  describe('Type imports and usage', () => {
    it('should be able to use Language type from geography types', () => {
      const testLanguage: Language = {
        code: 'en',
        name: 'English',
        native: 'English',
        rtl: false
      };

      expect(testLanguage.code).toBe('en');
      expect(testLanguage.name).toBe('English');
    });

    it('should be able to use Region type from geography types', () => {
      const testRegion: Region = {
        code: 'NA',
        name: 'North America',
        category: 'continent'
      };

      expect(testRegion.code).toBe('NA');
      expect(testRegion.category).toBe('continent');
    });

    it('should be able to use CountryData type from geography types', () => {
      const testCountry: CountryData = {
        name: 'United States',
        code: 'US',
        phone_code: '+1',
        capital: 'Washington, D.C.'
      };

      expect(testCountry.name).toBe('United States');
      expect(testCountry.code).toBe('US');
    });

    it('should be able to use RegionCategory type from geography types', () => {
      const validCategories: RegionCategory[] = [
        'continent',
        'subregion',
        'economic',
        'political'
      ];

      expect(validCategories).toContain('continent');
      expect(validCategories).toContain('subregion');
    });
  });

  describe('Re-exported types from legacy files', () => {
    it('should be able to use Language type from language-data file', () => {
      const testLanguage: LegacyLanguage = {
        code: 'fr',
        name: 'French'
      };

      expect(testLanguage.code).toBe('fr');
      expect(testLanguage.name).toBe('French');
    });

    it('should be able to use types from country-data file', () => {
      const testRegion: LegacyRegion = {
        code: 'EU',
        name: 'Europe',
        category: 'continent'
      };

      const testCountry: LegacyCountryData = {
        name: 'France',
        code: 'FR'
      };

      const testLanguage: LegacyLanguage2 = {
        code: 'fr',
        name: 'French'
      };

      expect(testRegion.code).toBe('EU');
      expect(testCountry.code).toBe('FR');
      expect(testLanguage.code).toBe('fr');
    });

    it('should be able to use CountryData type from all-countries file', () => {
      const testCountry: AllCountriesData = {
        name: 'Canada',
        code: 'CA'
      };

      expect(testCountry.name).toBe('Canada');
      expect(testCountry.code).toBe('CA');
    });
  });

  describe('Utility function imports', () => {
    it('should be able to import utility functions from geography utils', async () => {
      const utils = await import('@/lib/utils/geography');
      expect(utils.getCountryByCode).toBeDefined();
      expect(utils.getCountryByName).toBeDefined();
      expect(utils.getCountriesByRegion).toBeDefined();
      expect(utils.getCountriesByLanguage).toBeDefined();
      expect(utils.getAllCountries).toBeDefined();
      expect(utils.validateGeographyData).toBeDefined();
    });

    it('should be able to import utility functions from all-countries file', async () => {
      const utils = await import('@/lib/all-countries');
      expect(utils.getCountryByCode).toBeDefined();
      expect(utils.getCountryByName).toBeDefined();
      expect(utils.getCountriesByRegion).toBeDefined();
      expect(utils.getCountriesByLanguage).toBeDefined();
      expect(utils.getAllCountries).toBeDefined();
      expect(utils.validateGeographyData).toBeDefined();
    });
  });

  describe('Static data removal verification', () => {
    it('should not export static languages array from language-data', async () => {
      const languageData = await import('@/lib/language-data');
      expect((languageData as any).languages).toBeUndefined();
    });

    it('should not export static regions array from country-data', async () => {
      const countryData = await import('@/lib/country-data');
      expect((countryData as any).regions).toBeUndefined();
    });

    it('should not export static countries array from country-data', async () => {
      const countryData = await import('@/lib/country-data');
      expect((countryData as any).countries).toBeUndefined();
    });

    it('should not export static allCountriesComplete array from all-countries', async () => {
      const allCountries = await import('@/lib/all-countries');
      expect((allCountries as any).allCountriesComplete).toBeUndefined();
    });
  });

  describe('Type compatibility', () => {
    it('should maintain type compatibility between old and new imports', () => {
      // Both should refer to the same type (this is a TypeScript compile-time check)
      const testLanguage: Language = {
        code: 'en',
        name: 'English'
      };

      // This should not cause type errors - proves type compatibility
      const sameLanguage: LegacyLanguage = testLanguage;
      expect(sameLanguage.code).toBe('en');
    });

    it('should maintain type compatibility for Region types', () => {
      const testRegion: Region = {
        code: 'NA',
        name: 'North America',
        category: 'continent'
      };

      // This should not cause type errors - proves type compatibility
      const sameRegion: LegacyRegion = testRegion;
      expect(sameRegion.code).toBe('NA');
    });

    it('should maintain type compatibility for CountryData types', () => {
      const testCountry: CountryData = {
        name: 'United States',
        code: 'US'
      };

      // This should not cause type errors - proves type compatibility
      const sameCountry: LegacyCountryData = testCountry;
      expect(sameCountry.name).toBe('United States');
    });
  });
});