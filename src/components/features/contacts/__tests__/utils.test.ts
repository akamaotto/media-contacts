/**
 * Contact Utilities Tests
 */

import {
  filterContacts,
  sortContacts,
  paginateContacts,
  calculatePerformanceMetrics,
  ContactProcessor,
  generateContactId,
  validateContact,
  isValidEmail,
  isValidUrl,
  formatContactForExport,
  generateCSV,
  generateVCard,
  getValueByPath,
  setValueByPath,
  debounce,
} from '../utils';
import { Contact, ContactFilter, SortConfig } from '../types';

// Mock contact data
const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    name: 'John Doe',
    title: 'Software Engineer',
    bio: 'Experienced software engineer with a passion for creating great products.',
    email: 'john.doe@example.com',
    confidenceScore: 0.85,
    qualityScore: 0.9,
    verificationStatus: 'CONFIRMED',
    relevanceScore: 0.8,
    sourceUrl: 'https://example.com/john-doe',
    extractionMethod: 'AI_BASED',
    imported: false,
    favorite: false,
    tags: ['developer', 'javascript'],
    notes: 'Met at tech conference',
    createdAt: new Date('2023-01-01'),
    contactInfo: {
      company: 'Tech Corp',
      phone: '+1-555-123-4567',
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe',
      website: 'https://johndoe.dev',
      location: 'San Francisco, CA',
      languages: ['English', 'Spanish'],
    },
  },
  {
    id: 'contact-2',
    name: 'Jane Smith',
    title: 'Product Manager',
    bio: 'Product manager with experience in agile methodologies.',
    email: 'jane.smith@example.com',
    confidenceScore: 0.75,
    qualityScore: 0.8,
    verificationStatus: 'PENDING',
    relevanceScore: 0.7,
    sourceUrl: 'https://example.com/jane-smith',
    extractionMethod: 'AI_BASED',
    imported: true,
    favorite: true,
    tags: ['product', 'agile'],
    notes: 'Met at product conference',
    createdAt: new Date('2023-01-02'),
    contactInfo: {
      company: 'Product Inc',
      phone: '+1-555-987-6543',
      linkedin: 'https://linkedin.com/in/janesmith',
      twitter: 'https://twitter.com/janesmith',
      website: 'https://janesmith.dev',
      location: 'New York, NY',
      languages: ['English'],
    },
  },
  {
    id: 'contact-3',
    name: 'Bob Johnson',
    title: 'Designer',
    bio: 'Creative designer with a focus on user experience.',
    email: 'bob.johnson@example.com',
    confidenceScore: 0.65,
    qualityScore: 0.7,
    verificationStatus: 'REJECTED',
    relevanceScore: 0.6,
    sourceUrl: 'https://example.com/bob-johnson',
    extractionMethod: 'AI_BASED',
    imported: false,
    favorite: false,
    tags: ['design', 'ux'],
    notes: 'Met at design conference',
    createdAt: new Date('2023-01-03'),
    contactInfo: {
      company: 'Design Co',
      phone: '+1-555-456-7890',
      linkedin: 'https://linkedin.com/in/bobjohnson',
      twitter: 'https://twitter.com/bobjohnson',
      website: 'https://bobjohnson.dev',
      location: 'Los Angeles, CA',
      languages: ['English', 'French'],
    },
  },
];

describe('filterContacts', () => {
  it('filters contacts by search query', () => {
    const filter: ContactFilter = { search: 'John' };
    const result = filterContacts(mockContacts, filter);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('filters contacts by confidence range', () => {
    const filter: ContactFilter = { confidenceMin: 0.8 };
    const result = filterContacts(mockContacts, filter);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('filters contacts by verification status', () => {
    const filter: ContactFilter = { verificationStatus: ['CONFIRMED'] };
    const result = filterContacts(mockContacts, filter);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('filters contacts by import status', () => {
    const filter: ContactFilter = { imported: true };
    const result = filterContacts(mockContacts, filter);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jane Smith');
  });

  it('filters contacts by favorite status', () => {
    const filter: ContactFilter = { favorite: true };
    const result = filterContacts(mockContacts, filter);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jane Smith');
  });

  it('filters contacts by tags', () => {
    const filter: ContactFilter = { tags: ['developer'] };
    const result = filterContacts(mockContacts, filter);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('filters contacts by date range', () => {
    const filter: ContactFilter = {
      dateRange: {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-02'),
      },
    };
    const result = filterContacts(mockContacts, filter);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('John Doe');
    expect(result[1].name).toBe('Jane Smith');
  });

  it('handles empty contacts array', () => {
    const filter: ContactFilter = { search: 'John' };
    const result = filterContacts([], filter);
    
    expect(result).toHaveLength(0);
  });
});

describe('sortContacts', () => {
  it('sorts contacts by name ascending', () => {
    const sort: SortConfig = { key: 'name', direction: 'asc' };
    const result = sortContacts(mockContacts, sort);
    
    expect(result[0].name).toBe('Bob Johnson');
    expect(result[1].name).toBe('Jane Smith');
    expect(result[2].name).toBe('John Doe');
  });

  it('sorts contacts by name descending', () => {
    const sort: SortConfig = { key: 'name', direction: 'desc' };
    const result = sortContacts(mockContacts, sort);
    
    expect(result[0].name).toBe('John Doe');
    expect(result[1].name).toBe('Jane Smith');
    expect(result[2].name).toBe('Bob Johnson');
  });

  it('sorts contacts by confidence score ascending', () => {
    const sort: SortConfig = { key: 'confidenceScore', direction: 'asc' };
    const result = sortContacts(mockContacts, sort);
    
    expect(result[0].name).toBe('Bob Johnson');
    expect(result[1].name).toBe('Jane Smith');
    expect(result[2].name).toBe('John Doe');
  });

  it('sorts contacts by confidence score descending', () => {
    const sort: SortConfig = { key: 'confidenceScore', direction: 'desc' };
    const result = sortContacts(mockContacts, sort);
    
    expect(result[0].name).toBe('John Doe');
    expect(result[1].name).toBe('Jane Smith');
    expect(result[2].name).toBe('Bob Johnson');
  });

  it('sorts contacts by creation date', () => {
    const sort: SortConfig = { key: 'createdAt', direction: 'asc' };
    const result = sortContacts(mockContacts, sort);
    
    expect(result[0].name).toBe('John Doe');
    expect(result[1].name).toBe('Jane Smith');
    expect(result[2].name).toBe('Bob Johnson');
  });

  it('sorts contacts by nested property', () => {
    const sort: SortConfig = { key: 'contactInfo.company', direction: 'asc' };
    const result = sortContacts(mockContacts, sort);
    
    expect(result[0].name).toBe('Bob Johnson'); // Design Co
    expect(result[1].name).toBe('Jane Smith'); // Product Inc
    expect(result[2].name).toBe('John Doe'); // Tech Corp
  });

  it('handles empty contacts array', () => {
    const sort: SortConfig = { key: 'name', direction: 'asc' };
    const result = sortContacts([], sort);
    
    expect(result).toHaveLength(0);
  });
});

describe('paginateContacts', () => {
  it('paginates contacts correctly', () => {
    const result = paginateContacts(mockContacts, 1, 2);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('John Doe');
    expect(result[1].name).toBe('Jane Smith');
  });

  it('returns empty array for page out of range', () => {
    const result = paginateContacts(mockContacts, 10, 2);
    
    expect(result).toHaveLength(0);
  });

  it('handles empty contacts array', () => {
    const result = paginateContacts([], 1, 2);
    
    expect(result).toHaveLength(0);
  });
});

describe('calculatePerformanceMetrics', () => {
  it('calculates performance metrics correctly', () => {
    const operations = {
      filter: 100,
      sort: 50,
      render: 200,
    };
    
    const result = calculatePerformanceMetrics(
      operations,
      mockContacts.length,
      2
    );
    
    expect(result.filterTime).toBe(100);
    expect(result.sortTime).toBe(50);
    expect(result.renderTime).toBe(200);
    expect(result.totalContacts).toBe(mockContacts.length);
    expect(result.visibleContacts).toBe(2);
  });
});

describe('ContactProcessor', () => {
  it('processes contacts with caching', () => {
    const processor = new ContactProcessor();
    
    const filter: ContactFilter = { search: 'John' };
    const result1 = processor.process(mockContacts, 'filter', filter);
    const result2 = processor.process(mockContacts, 'filter', filter);
    
    expect(result1).toHaveLength(1);
    expect(result2).toHaveLength(1);
    expect(result1).toEqual(result2); // Should be the same reference due to caching
  });

  it('clears cache', () => {
    const processor = new ContactProcessor();
    
    const filter: ContactFilter = { search: 'John' };
    processor.process(mockContacts, 'filter', filter);
    
    processor.clearCache();
    
    const result = processor.process(mockContacts, 'filter', filter);
    
    expect(result).toHaveLength(1);
  });
});

describe('generateContactId', () => {
  it('generates a unique ID for a contact', () => {
    const contact = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      sourceUrl: 'https://example.com/john-doe',
    };
    
    const id = generateContactId(contact);
    
    expect(id).toMatch(/^contact_[a-zA-Z0-9]{12}$/);
  });

  it('generates different IDs for different contacts', () => {
    const contact1 = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      sourceUrl: 'https://example.com/john-doe',
    };
    
    const contact2 = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      sourceUrl: 'https://example.com/jane-smith',
    };
    
    const id1 = generateContactId(contact1);
    const id2 = generateContactId(contact2);
    
    expect(id1).not.toBe(id2);
  });
});

describe('validateContact', () => {
  it('validates a correct contact', () => {
    const contact = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      sourceUrl: 'https://example.com/john-doe',
      confidenceScore: 0.85,
    };
    
    const result = validateContact(contact);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates a contact with missing name', () => {
    const contact = {
      name: '',
      email: 'john.doe@example.com',
      sourceUrl: 'https://example.com/john-doe',
      confidenceScore: 0.85,
    };
    
    const result = validateContact(contact);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name is required and must be at least 2 characters');
  });

  it('validates a contact with invalid email', () => {
    const contact = {
      name: 'John Doe',
      email: 'invalid-email',
      sourceUrl: 'https://example.com/john-doe',
      confidenceScore: 0.85,
    };
    
    const result = validateContact(contact);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Email format is invalid');
  });

  it('validates a contact with invalid confidence score', () => {
    const contact = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      sourceUrl: 'https://example.com/john-doe',
      confidenceScore: 1.5,
    };
    
    const result = validateContact(contact);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Confidence score must be between 0 and 1');
  });

  it('validates a contact with invalid URL', () => {
    const contact = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      sourceUrl: 'invalid-url',
      confidenceScore: 0.85,
    };
    
    const result = validateContact(contact);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Source URL is required and must be valid');
  });
});

describe('isValidEmail', () => {
  it('validates a correct email', () => {
    expect(isValidEmail('john.doe@example.com')).toBe(true);
  });

  it('validates an incorrect email', () => {
    expect(isValidEmail('invalid-email')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('validates a correct URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('validates an incorrect URL', () => {
    expect(isValidUrl('invalid-url')).toBe(false);
  });
});

describe('formatContactForExport', () => {
  it('formats a contact for export', () => {
    const contact = mockContacts[0];
    const result = formatContactForExport(contact, 'csv', false);
    
    expect(result.id).toBe(contact.id);
    expect(result.name).toBe(contact.name);
    expect(result.title).toBe(contact.title);
    expect(result.email).toBe(contact.email);
  });

  it('includes metadata when requested', () => {
    const contact = mockContacts[0];
    const result = formatContactForExport(contact, 'csv', true);
    
    expect(result.extractionId).toBe(contact.extractionId);
    expect(result.sourceUrl).toBe(contact.sourceUrl);
  });
});

describe('generateCSV', () => {
  it('generates CSV from contacts', () => {
    const csv = generateCSV(mockContacts, false);
    
    expect(csv).toContain('id,name,title,email');
    expect(csv).toContain('contact-1,John Doe,Software Engineer,john.doe@example.com');
  });

  it('handles empty contacts array', () => {
    const csv = generateCSV([], false);
    
    expect(csv).toBe('');
  });
});

describe('generateVCard', () => {
  it('generates vCard from a contact', () => {
    const contact = mockContacts[0];
    const vcard = generateVCard(contact);
    
    expect(vcard).toContain('BEGIN:VCARD');
    expect(vcard).toContain('VERSION:3.0');
    expect(vcard).toContain('FN:John Doe');
    expect(vcard).toContain('N:Doe;John;;;');
    expect(vcard).toContain('EMAIL:john.doe@example.com');
    expect(vcard).toContain('END:VCARD');
  });
});

describe('getValueByPath', () => {
  it('gets value by simple path', () => {
    const obj = { name: 'John Doe' };
    const result = getValueByPath(obj, 'name');
    
    expect(result).toBe('John Doe');
  });

  it('gets value by nested path', () => {
    const obj = { contactInfo: { company: 'Tech Corp' } };
    const result = getValueByPath(obj, 'contactInfo.company');
    
    expect(result).toBe('Tech Corp');
  });

  it('handles non-existent path', () => {
    const obj = { name: 'John Doe' };
    const result = getValueByPath(obj, 'nonexistent');
    
    expect(result).toBeUndefined();
  });
});

describe('setValueByPath', () => {
  it('sets value by simple path', () => {
    const obj = { name: 'John Doe' };
    setValueByPath(obj, 'name', 'Jane Smith');
    
    expect(obj.name).toBe('Jane Smith');
  });

  it('sets value by nested path', () => {
    const obj = { contactInfo: { company: 'Tech Corp' } };
    setValueByPath(obj, 'contactInfo.company', 'New Corp');
    
    expect(obj.contactInfo.company).toBe('New Corp');
  });

  it('creates nested objects if they dont exist', () => {
    const obj = {};
    setValueByPath(obj, 'contactInfo.company', 'New Corp');
    
    expect(obj.contactInfo.company).toBe('New Corp');
  });
});

describe('debounce', () => {
  it('delays function execution', (done) => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();
    
    setTimeout(() => {
      expect(mockFn).toHaveBeenCalledTimes(1);
      done();
    }, 150);
  });

  it('cancels previous execution if called again', (done) => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    debouncedFn();
    debouncedFn();
    
    setTimeout(() => {
      expect(mockFn).toHaveBeenCalledTimes(1);
      done();
    }, 150);
  });
});