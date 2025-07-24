import test, { expect } from '@playwright/test';
import { mapCsvRowToMediaContact, mapMediaContactToCsvRow, generateCsvHeaders } from '../../../src/backend/csv/mappers';
import { CsvContactData } from '../../../src/backend/csv/validation';
import { describe } from 'node:test';

describe('CSV Mappers', () => {
  describe('mapCsvRowToMediaContact', () => {
    test('maps CSV data to MediaContact object', () => {
      const csvData: CsvContactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        title: 'Reporter',
        outlet: 'News Daily',
        beats: ['Technology', 'Science'],
        countries: ['USA', 'Canada'],
        regions: ['North America'],
        languages: ['English', 'French'],
        twitterHandle: '@johndoe',
        instagramHandle: '@johndoe_insta',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        bio: 'Technology reporter',
        notes: 'Prefers email contact',
        authorLinks: ['https://example.com/author/johndoe']
      };

      const result = mapCsvRowToMediaContact(csvData);
      
      expect(result).toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
        title: 'Reporter',
        bio: 'Technology reporter',
        email_verified_status: false,
        socials: ['@johndoe', '@johndoe_insta', 'https://linkedin.com/in/johndoe'],
        authorLinks: ['https://example.com/author/johndoe']
      });
    });

    test('handles minimal CSV data', () => {
      const csvData: CsvContactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        beats: [],
        countries: [],
        regions: [],
        languages: [],
        authorLinks: []
      };

      const result = mapCsvRowToMediaContact(csvData);
      
      expect(result).toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
        title: '',
        bio: null,
        email_verified_status: false,
        socials: [],
        authorLinks: []
      });
    });

    test('filters out null/undefined social values', () => {
      const csvData: CsvContactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        twitterHandle: '@johndoe',
        instagramHandle: undefined,
        linkedinUrl: undefined,
        beats: [],
        countries: [],
        regions: [],
        languages: [],
        authorLinks: []
      };

      const result = mapCsvRowToMediaContact(csvData);
      
      expect(result.socials).toEqual(['@johndoe']);
    });
  });

  describe('mapMediaContactToCsvRow', () => {
    test('maps MediaContact to CSV row with all fields', () => {
      const contact = {
        id: '123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        title: 'Reporter',
        bio: 'Technology reporter',
        email_verified_status: true,
        created_at: new Date(),
        updated_at: new Date(),
        socials: ['@johndoe', '@johndoe_insta', 'https://linkedin.com/in/johndoe'],
        authorLinks: ['https://example.com/author/johndoe'],
        firstName: 'John',
        lastName: 'Doe',
        outlet: 'News Daily',
        beats: ['Technology', 'Science'],
        countries: ['USA', 'Canada'],
        regions: ['North America'],
        languages: ['English', 'French'],
        twitterHandle: '@johndoe',
        instagramHandle: '@johndoe_insta',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        notes: 'Prefers email contact'
      };

      const fields = [
        'firstName', 'lastName', 'email', 'title', 'outlet', 'beats',
        'countries', 'regions', 'languages', 'twitterHandle', 'instagramHandle',
        'linkedinUrl', 'bio', 'notes', 'authorLinks'
      ];

      const result = mapMediaContactToCsvRow(contact, fields);
      
      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        title: 'Reporter',
        outlet: 'News Daily',
        beats: 'Technology, Science',
        countries: 'USA, Canada',
        regions: 'North America',
        languages: 'English, French',
        twitterHandle: '@johndoe',
        instagramHandle: '@johndoe_insta',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        bio: 'Technology reporter',
        notes: 'Prefers email contact',
        authorLinks: 'https://example.com/author/johndoe'
      });
    });

    test('maps MediaContact to CSV row with selected fields', () => {
      const contact = {
        id: '123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        title: 'Reporter',
        bio: 'Technology reporter',
        email_verified_status: true,
        created_at: new Date(),
        updated_at: new Date(),
        socials: ['@johndoe', '@johndoe_insta', 'https://linkedin.com/in/johndoe'],
        authorLinks: ['https://example.com/author/johndoe'],
        firstName: 'John',
        lastName: 'Doe',
        outlet: 'News Daily',
        beats: ['Technology', 'Science'],
        countries: ['USA', 'Canada'],
        regions: ['North America'],
        languages: ['English', 'French'],
        twitterHandle: '@johndoe',
        instagramHandle: '@johndoe_insta',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        notes: 'Prefers email contact'
      };

      const fields = ['firstName', 'lastName', 'email', 'outlet'];

      const result = mapMediaContactToCsvRow(contact, fields);
      
      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        outlet: 'News Daily'
      });
    });

    test('extracts firstName and lastName from name when not provided', () => {
      const contact = {
        id: '123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        title: '',
        bio: null,
        email_verified_status: false,
        created_at: new Date(),
        updated_at: new Date(),
        socials: [],
        authorLinks: []
      };

      const fields = ['firstName', 'lastName', 'email'];

      const result = mapMediaContactToCsvRow(contact, fields);
      
      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      });
    });

    test('handles empty arrays and null values', () => {
      const contact = {
        id: '123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        title: '',  // Must be a string as per Prisma schema
        bio: null,
        email_verified_status: false,
        created_at: new Date(),
        updated_at: new Date(),
        socials: [],
        authorLinks: [],
        beats: [],
        countries: [],
        regions: [],
        languages: []
      };

      const fields = [
        'firstName', 'lastName', 'email', 'title', 'beats',
        'countries', 'regions', 'languages', 'authorLinks'
      ];

      const result = mapMediaContactToCsvRow(contact, fields);
      
      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        title: '',
        beats: '',
        countries: '',
        regions: '',
        languages: '',
        authorLinks: ''
      });
    });
  });

  describe('generateCsvHeaders', () => {
    test('generates user-friendly headers for all fields', () => {
      const fields = [
        'firstName', 'lastName', 'email', 'title', 'outlet', 'beats',
        'countries', 'regions', 'languages', 'twitterHandle', 'instagramHandle',
        'linkedinUrl', 'bio', 'notes', 'authorLinks'
      ];

      const result = generateCsvHeaders(fields);
      
      expect(result).toEqual([
        'First Name', 'Last Name', 'Email', 'Title', 'Outlet', 'Beats',
        'Countries', 'Regions', 'Languages', 'Twitter Handle', 'Instagram Handle',
        'LinkedIn URL', 'Bio', 'Notes', 'Author Links'
      ]);
    });

    test('generates headers for selected fields', () => {
      const fields = ['firstName', 'lastName', 'email', 'outlet'];

      const result = generateCsvHeaders(fields);
      
      expect(result).toEqual(['First Name', 'Last Name', 'Email', 'Outlet']);
    });

    test('handles unknown field names', () => {
      const fields = ['firstName', 'lastName', 'email', 'customField'];

      const result = generateCsvHeaders(fields);
      
      expect(result).toEqual(['First Name', 'Last Name', 'Email', 'customField']);
    });
  });
});
