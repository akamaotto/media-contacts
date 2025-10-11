/**
 * Results Display Components Utilities
 * Helper functions for contact processing, filtering, sorting, and performance optimization
 */

import { Contact, ContactFilter, SortConfig, TableColumn, PerformanceMetrics } from './types';
import { VerificationStatus } from '@/lib/ai/contact-extraction/types';

/**
 * Filters contacts based on the provided filter criteria
 */
export const filterContacts = (contacts: Contact[], filter: ContactFilter): Contact[] => {
  if (!contacts.length) return [];

  return contacts.filter(contact => {
    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const searchableText = [
        contact.name,
        contact.title,
        contact.bio,
        contact.email,
        contact.contactInfo?.company,
        contact.contactInfo?.phone,
        contact.contactInfo?.linkedin,
        contact.contactInfo?.twitter,
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    // Confidence range filter
    if (filter.confidenceMin !== undefined && contact.confidenceScore < filter.confidenceMin) {
      return false;
    }
    if (filter.confidenceMax !== undefined && contact.confidenceScore > filter.confidenceMax) {
      return false;
    }

    // Verification status filter
    if (filter.verificationStatus && filter.verificationStatus.length > 0) {
      if (!filter.verificationStatus.includes(contact.verificationStatus)) {
        return false;
      }
    }

    // Sources filter
    if (filter.sources && filter.sources.length > 0) {
      const hasMatchingSource = contact.metadata?.processingSteps?.some(step => 
        filter.sources!.includes(step.details?.source || '')
      );
      if (!hasMatchingSource) {
        return false;
      }
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(tag => 
        contact.tags?.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Imported filter
    if (filter.imported !== undefined) {
      if (filter.imported !== !!contact.imported) {
        return false;
      }
    }

    // Favorite filter
    if (filter.favorite !== undefined) {
      if (filter.favorite !== !!contact.favorite) {
        return false;
      }
    }

    // Date range filter
    if (filter.dateRange) {
      const contactDate = new Date(contact.createdAt);
      if (contactDate < filter.dateRange.startDate || contactDate > filter.dateRange.endDate) {
        return false;
      }
    }

    // Custom filters
    if (filter.customFilters) {
      for (const [key, value] of Object.entries(filter.customFilters)) {
        const contactValue = (contact as any)[key];
        if (contactValue !== value) {
          return false;
        }
      }
    }

    return true;
  });
};

/**
 * Sorts contacts based on the provided sort configuration
 */
export const sortContacts = (contacts: Contact[], sort: SortConfig): Contact[] => {
  if (!sort.key || !contacts.length) return contacts;

  return [...contacts].sort((a, b) => {
    let aValue: any = getValueByPath(a, sort.key);
    let bValue: any = getValueByPath(b, sort.key);

    // Handle different data types
    if (aValue instanceof Date) aValue = aValue.getTime();
    if (bValue instanceof Date) bValue = bValue.getTime();
    
    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // String comparison (case-insensitive)
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sort.direction === 'asc' ? comparison : -comparison;
    }

    // Number comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const comparison = aValue - bValue;
      return sort.direction === 'asc' ? comparison : -comparison;
    }

    // Boolean comparison
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      const comparison = (aValue ? 1 : 0) - (bValue ? 1 : 0);
      return sort.direction === 'asc' ? comparison : -comparison;
    }

    // Fallback comparison
    const fallbackComparison = String(aValue).localeCompare(String(bValue));
    return sort.direction === 'asc' ? fallbackComparison : -fallbackComparison;
  });
};

/**
 * Gets a value from an object using a dot-separated path
 */
export const getValueByPath = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Sets a value in an object using a dot-separated path
 */
export const setValueByPath = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
};

/**
 * Paginates contacts based on the provided page and page size
 */
export const paginateContacts = (
  contacts: Contact[], 
  page: number, 
  pageSize: number
): Contact[] => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return contacts.slice(startIndex, endIndex);
};

/**
 * Calculates performance metrics for the contact display operations
 */
export const calculatePerformanceMetrics = (
  operations: {
    filter?: number;
    sort?: number;
    render?: number;
  },
  totalContacts: number,
  visibleContacts: number
): PerformanceMetrics => {
  const memoryUsage = typeof performance !== 'undefined' && performance.memory 
    ? performance.memory.usedJSHeapSize 
    : 0;

  return {
    renderTime: operations.render || 0,
    sortTime: operations.sort || 0,
    filterTime: operations.filter || 0,
    memoryUsage,
    totalContacts,
    visibleContacts,
  };
};

/**
 * Debounced search function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Memoized contact processing with cache
 */
export class ContactProcessor {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private readonly cacheTimeout = 5000; // 5 seconds

  private getCacheKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  process(contacts: Contact[], operation: string, params: any): any {
    const cacheKey = this.getCacheKey(operation, params);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.result;
    }

    let result: any;

    switch (operation) {
      case 'filter':
        result = filterContacts(contacts, params as ContactFilter);
        break;
      case 'sort':
        result = sortContacts(contacts, params as SortConfig);
        break;
      case 'paginate':
        result = paginateContacts(contacts, params.page, params.pageSize);
        break;
      default:
        result = contacts;
    }

    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    // Clean up old cache entries
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (!this.isCacheValid(entry.timestamp)) {
          this.cache.delete(key);
        }
      }
    }

    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Generates a unique ID for contacts that don't have one
 */
export const generateContactId = (contact: Partial<Contact>): string => {
  const name = contact.name || 'unknown';
  const email = contact.email || '';
  const source = contact.sourceUrl || '';
  const timestamp = Date.now();
  
  // Create a simple hash from contact data
  const hash = btoa(`${name}:${email}:${source}:${timestamp}`)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 12);
  
  return `contact_${hash}`;
};

/**
 * Validates contact data integrity
 */
export const validateContact = (contact: Partial<Contact>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!contact.name || contact.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }

  if (contact.email && !isValidEmail(contact.email)) {
    errors.push('Email format is invalid');
  }

  if (contact.confidenceScore !== undefined && 
      (contact.confidenceScore < 0 || contact.confidenceScore > 1)) {
    errors.push('Confidence score must be between 0 and 1');
  }

  if (!contact.sourceUrl || !isValidUrl(contact.sourceUrl)) {
    errors.push('Source URL is required and must be valid');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Email validation utility
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * URL validation utility
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Formats contact data for export
 */
export const formatContactForExport = (
  contact: Contact, 
  format: 'csv' | 'json' | 'vcard' | 'xlsx',
  includeMetadata: boolean = false
): any => {
  const baseData = {
    id: contact.id,
    name: contact.name,
    title: contact.title,
    bio: contact.bio,
    email: contact.email,
    phone: contact.contactInfo?.phone,
    company: contact.contactInfo?.company,
    linkedin: contact.contactInfo?.linkedin,
    twitter: contact.contactInfo?.twitter,
    website: contact.contactInfo?.website,
    location: contact.contactInfo?.location,
    confidenceScore: contact.confidenceScore,
    verificationStatus: contact.verificationStatus,
    imported: contact.imported,
    tags: contact.tags?.join('; '),
    notes: contact.notes,
    createdAt: contact.createdAt,
  };

  if (!includeMetadata) {
    return baseData;
  }

  return {
    ...baseData,
    extractionId: contact.extractionId,
    searchId: contact.searchId,
    sourceUrl: contact.sourceUrl,
    extractionMethod: contact.extractionMethod,
    relevanceScore: contact.relevanceScore,
    qualityScore: contact.qualityScore,
    isDuplicate: contact.isDuplicate,
    duplicateOf: contact.duplicateOf,
    socialProfiles: contact.socialProfiles?.map(profile => `${profile.platform}:${profile.handle}`).join('; '),
    metadata: contact.metadata,
  };
};

/**
 * Generates CSV data from contacts
 */
export const generateCSV = (contacts: Contact[], includeMetadata: boolean = false): string => {
  if (!contacts.length) return '';

  const formattedContacts = contacts.map(contact => 
    formatContactForExport(contact, 'csv', includeMetadata)
  );

  const headers = Object.keys(formattedContacts[0]);
  const csvRows = [
    headers.join(','),
    ...formattedContacts.map(contact => 
      headers.map(header => {
        const value = (contact as any)[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    )
  ];

  return csvRows.join('\n');
};

/**
 * Generates vCard data from a single contact
 */
export const generateVCard = (contact: Contact): string => {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
    `N:${contact.name.replace(/ /g, ';')};;;`,
  ];

  if (contact.email) {
    lines.push(`EMAIL:${contact.email}`);
  }

  if (contact.contactInfo?.phone) {
    lines.push(`TEL:${contact.contactInfo.phone}`);
  }

  if (contact.contactInfo?.company) {
    lines.push(`ORG:${contact.contactInfo.company}`);
  }

  if (contact.title) {
    lines.push(`TITLE:${contact.title}`);
  }

  if (contact.contactInfo?.linkedin) {
    lines.push(`URL:${contact.contactInfo.linkedin}`);
  }

  if (contact.bio) {
    lines.push(`NOTE:${contact.bio.replace(/\n/g, '\\n')}`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
};

/**
 * Downloads data as a file
 */
export const downloadFile = (data: string, filename: string, mimeType: string): void => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Keyboard shortcut utilities
 */
export const isKeyboardEvent = (event: KeyboardEvent, shortcut: {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): boolean => {
  return (
    event.key === shortcut.key &&
    !!event.ctrlKey === !!shortcut.ctrlKey &&
    !!event.shiftKey === !!shortcut.shiftKey &&
    !!event.altKey === !!shortcut.altKey
  );
};

/**
 * Accessibility utilities
 */
export const generateAriaLabel = (action: string, context?: string): string => {
  const baseLabels = {
    select: 'Select contact',
    deselect: 'Deselect contact',
    preview: 'Preview contact details',
    import: 'Import contact',
    export: 'Export contacts',
    sort: 'Sort by',
    filter: 'Filter by',
    next: 'Next contact',
    previous: 'Previous contact',
    close: 'Close',
  };

  const label = baseLabels[action as keyof typeof baseLabels] || action;
  return context ? `${label} - ${context}` : label;
};

/**
 * Performance monitoring
 */
export const withPerformanceTracking = <T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T => {
  return ((...args: any[]) => {
    const startTime = performance.now();
    const result = fn(...args);
    const endTime = performance.now();
    
    if (typeof window !== 'undefined' && window.console) {
      console.debug(`${operationName} took ${endTime - startTime} milliseconds`);
    }
    
    return result;
  }) as T;
};