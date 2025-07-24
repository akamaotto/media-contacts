import { importMediaContactsFromCsv, exportMediaContactsToCsv } from '../../../src/backend/csv/actions';
import { PrismaClient } from '@prisma/client';
import { mock } from 'jest-mock-extended';
import { Readable } from 'stream';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    mediaContact: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (prisma: any) => any) => callback(mockPrismaClient)),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock Papa Parse
jest.mock('papaparse', () => ({
  parse: jest.fn(),
  unparse: jest.fn(() => 'csv,data,mock'),
}));

// Mock file system
jest.mock('fs', () => ({
  createReadStream: jest.fn(() => new Readable({
    read() {
      this.push('firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com');
      this.push(null);
    }
  })),
  promises: {
    unlink: jest.fn((path: string) => Promise.resolve()),
  }
}));

describe('CSV Integration Tests', () => {
  let prisma: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
  });
  
  describe('importMediaContactsFromCsv', () => {
    test('processes CSV file and inserts valid contacts', async () => {
      // Mock validation results
      const mockValidationResults = [
        { success: true, data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }, errors: [] },
        { success: true, data: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }, errors: [] }
      ];
      
      // Mock header validation
      const mockHeaderMapping = new Map();
      mockHeaderMapping.set('firstName', 'firstName');
      mockHeaderMapping.set('lastName', 'lastName');
      mockHeaderMapping.set('email', 'email');
      
      // Mock Papa Parse to return our test data
      require('papaparse').parse.mockImplementation((_stream: any, options: { header: boolean; step: (arg0: { data: { firstName: string; lastName: string; email: string; } | { firstName: string; lastName: string; email: string; }; errors: never[]; }) => void; complete: () => void; }) => {
        options.header = true;
        
        // Call step for each row
        options.step({
          data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          errors: []
        });
        
        options.step({
          data: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
          errors: []
        });
        
        // Call complete when done
        options.complete();
      });
      
      // Mock validateCsvHeaders
      jest.mock('../../../src/backend/csv/validation', () => ({
        validateCsvHeaders: jest.fn().mockReturnValue({
          success: true,
          headerMapping: mockHeaderMapping,
          missingRequired: [],
          unmappedHeaders: []
        }),
        validateCsvRow: jest.fn((row: Record<string, string>) => {
          if (row.firstName === 'John') return mockValidationResults[0];
          return mockValidationResults[1];
        })
      }));
      
      // Mock createMany to resolve successfully
      prisma.mediaContact.createMany.mockResolvedValue({ count: 2 });
      
      const result = await importMediaContactsFromCsv({
        filePath: '/tmp/test.csv',
        onProgress: jest.fn(),
      });
      
      // Verify the result
      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);
      
      // Verify database was called with correct data
      expect(prisma.mediaContact.createMany).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
    
    test('handles validation errors correctly', async () => {
      // Mock validation results with errors
      const mockValidationResults = [
        { success: true, data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }, errors: [] },
        { success: false, data: null, errors: [{ path: 'email', message: 'Invalid email' }] }
      ];
      
      // Mock header validation
      const mockHeaderMapping = new Map();
      mockHeaderMapping.set('firstName', 'firstName');
      mockHeaderMapping.set('lastName', 'lastName');
      mockHeaderMapping.set('email', 'email');
      
      // Mock Papa Parse to return our test data
      require('papaparse').parse.mockImplementation((_stream: any, options: { header: boolean; step: (arg0: { data: { firstName: string; lastName: string; email: string; } | { firstName: string; lastName: string; email: string; }; errors: never[]; }) => void; complete: () => void; }) => {
        options.header = true;
        
        // Call step for each row
        options.step({
          data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          errors: []
        });
        
        options.step({
          data: { firstName: 'Jane', lastName: 'Smith', email: 'invalid-email' },
          errors: []
        });
        
        // Call complete when done
        options.complete();
      });
      
      // Mock validateCsvHeaders and validateCsvRow
      jest.mock('../../../src/backend/csv/validation', () => ({
        validateCsvHeaders: jest.fn().mockReturnValue({
          success: true,
          headerMapping: mockHeaderMapping,
          missingRequired: [],
          unmappedHeaders: []
        }),
        validateCsvRow: jest.fn((row: Record<string, string>) => {
          if (row.firstName === 'John') return mockValidationResults[0];
          return mockValidationResults[1];
        })
      }));
      
      // Mock createMany to resolve successfully
      prisma.mediaContact.createMany.mockResolvedValue({ count: 1 });
      
      const result = await importMediaContactsFromCsv({
        filePath: '/tmp/test.csv',
        onProgress: jest.fn(),
      });
      
      // Verify the result
      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(1);
      expect(result.errors.length).toBe(1);
      
      // Verify database was called with correct data
      expect(prisma.mediaContact.createMany).toHaveBeenCalled();
    });
  });
  
  describe('exportMediaContactsToCsv', () => {
    test('exports contacts to CSV format', async () => {
      // Mock database query result
      const mockContacts = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          title: 'Reporter',
          bio: 'Tech reporter',
          email_verified_status: true,
          created_at: new Date(),
          updated_at: new Date(),
          socials: ['@johndoe'],
          authorLinks: ['https://example.com/john']
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          title: 'Editor',
          bio: 'Science editor',
          email_verified_status: true,
          created_at: new Date(),
          updated_at: new Date(),
          socials: ['@janesmith'],
          authorLinks: ['https://example.com/jane']
        }
      ];
      
      // Mock findMany to return our test data
      prisma.mediaContact.findMany.mockResolvedValue(mockContacts);
      
      // Mock Papa.unparse to return a CSV string
      require('papaparse').unparse.mockReturnValue('firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com');
      
      const options = {
        fields: ['firstName', 'lastName', 'email'],
        filters: {}
      };
      
      const result = await exportMediaContactsToCsv(options);
      
      // Verify the result
      expect(result.success).toBe(true);
      expect(result.data).toBe('firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com');
      
      // Verify database was queried
      expect(prisma.mediaContact.findMany).toHaveBeenCalled();
    });
    
    test('handles database errors gracefully', async () => {
      // Mock findMany to throw an error
      prisma.mediaContact.findMany.mockRejectedValue(new Error('Database error'));
      
      const options = {
        fields: ['firstName', 'lastName', 'email'],
        filters: {}
      };
      
      const result = await exportMediaContactsToCsv(options);
      
      // Verify the result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to export contacts: Database error');
    });
  });
});
