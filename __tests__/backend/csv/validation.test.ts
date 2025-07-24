import { validateCsvRow, validateCsvHeaders, csvContactSchema } from '../../../src/backend/csv/validation';

describe('CSV Validation', () => {
  describe('csvContactSchema', () => {
    test('validates a valid contact', () => {
      const validContact = {
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
        instagramHandle: '@johndoe',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        bio: 'Technology reporter',
        notes: 'Prefers email contact',
        authorLinks: 'https://example.com/author/johndoe'
      };

      const result = csvContactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
        expect(result.data.email).toBe('john.doe@example.com');
        expect(result.data.beats).toEqual(['Technology', 'Science']);
        expect(result.data.countries).toEqual(['USA', 'Canada']);
        expect(result.data.regions).toEqual(['North America']);
        expect(result.data.languages).toEqual(['English', 'French']);
        expect(result.data.authorLinks).toEqual(['https://example.com/author/johndoe']);
      }
    });

    test('validates with only required fields', () => {
      const minimalContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = csvContactSchema.safeParse(minimalContact);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
        expect(result.data.email).toBe('john.doe@example.com');
        expect(result.data.beats).toEqual([]);
        expect(result.data.countries).toEqual([]);
        expect(result.data.regions).toEqual([]);
        expect(result.data.languages).toEqual([]);
        expect(result.data.authorLinks).toEqual([]);
      }
    });

    test('rejects invalid email', () => {
      const invalidContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email'
      };

      const result = csvContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
    });

    test('rejects missing required fields', () => {
      const missingFirstName = {
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = csvContactSchema.safeParse(missingFirstName);
      expect(result.success).toBe(false);
    });

    test('transforms comma-separated strings to arrays', () => {
      const contact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        beats: 'Tech, AI, Data Science',
        countries: 'USA, UK, Canada',
        authorLinks: 'https://example.com/1, https://example.com/2'
      };

      const result = csvContactSchema.safeParse(contact);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.beats).toEqual(['Tech', 'AI', 'Data Science']);
        expect(result.data.countries).toEqual(['USA', 'UK', 'Canada']);
        expect(result.data.authorLinks).toEqual(['https://example.com/1', 'https://example.com/2']);
      }
    });

    test('handles empty strings in array fields', () => {
      const contact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        beats: '',
        countries: '',
        regions: '',
        languages: '',
        authorLinks: ''
      };

      const result = csvContactSchema.safeParse(contact);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.beats).toEqual([]);
        expect(result.data.countries).toEqual([]);
        expect(result.data.regions).toEqual([]);
        expect(result.data.languages).toEqual([]);
        expect(result.data.authorLinks).toEqual([]);
      }
    });
  });

  describe('validateCsvRow', () => {
    test('returns success for valid row', () => {
      const validRow = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = validateCsvRow(validRow);
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.errors).toEqual([]);
    });

    test('returns formatted errors for invalid row', () => {
      const invalidRow = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email'
      };

      const result = validateCsvRow(invalidRow);
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check for specific error messages
      const firstNameError = result.errors.find(e => e.path === 'firstName');
      const emailError = result.errors.find(e => e.path === 'email');
      
      expect(firstNameError).toBeTruthy();
      expect(emailError).toBeTruthy();
    });
  });

  describe('validateCsvHeaders', () => {
    test('validates headers with all required fields', () => {
      const headers = ['firstName', 'lastName', 'email', 'title', 'outlet'];
      const result = validateCsvHeaders(headers);
      
      expect(result.success).toBe(true);
      expect(result.missingRequired).toEqual([]);
      expect(result.headerMapping.size).toBe(5);
    });

    test('validates headers with case insensitivity', () => {
      const headers = ['FirstName', 'LastName', 'Email', 'Title', 'Outlet'];
      const result = validateCsvHeaders(headers);
      
      expect(result.success).toBe(true);
      expect(result.missingRequired).toEqual([]);
      expect(result.headerMapping.size).toBe(5);
      expect(result.headerMapping.get('FirstName')).toBe('firstName');
      expect(result.headerMapping.get('LastName')).toBe('lastName');
    });

    test('identifies missing required fields', () => {
      const headers = ['firstName', 'title', 'outlet']; // Missing lastName and email
      const result = validateCsvHeaders(headers);
      
      expect(result.success).toBe(false);
      expect(result.missingRequired).toContain('lastName');
      expect(result.missingRequired).toContain('email');
    });

    test('identifies unmapped headers', () => {
      const headers = ['firstName', 'lastName', 'email', 'customField', 'anotherCustomField'];
      const result = validateCsvHeaders(headers);
      
      expect(result.success).toBe(true);
      expect(result.unmappedHeaders).toContain('customField');
      expect(result.unmappedHeaders).toContain('anotherCustomField');
    });

    test('handles whitespace in headers', () => {
      const headers = [' firstName ', ' lastName ', ' email '];
      const result = validateCsvHeaders(headers);
      
      expect(result.success).toBe(true);
      expect(result.headerMapping.size).toBe(3);
      expect(result.headerMapping.get(' firstName ')).toBe('firstName');
    });
  });
});
