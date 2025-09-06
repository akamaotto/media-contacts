import { FastTableContact, adaptApiContactToTableItem } from '@/components/features/media-contacts/types';

describe('Date Transformation', () => {
  it('should correctly transform updatedAt to updated_at', () => {
    const apiContact: any = {
      id: 'test-id',
      name: 'Test Contact',
      email: 'test@example.com',
      title: 'Test Title',
      email_verified_status: true,
      updatedAt: '2025-09-04T16:11:39.497Z',
      updated_at: undefined,
      outlets: [],
      beats: [],
      countries: [],
      regions: [],
      languages: [],
      outletCount: 0,
      beatCount: 0,
      countryCount: 0,
      regionCount: 0,
      languageCount: 0
    };

    // Simulate the transformation in fast-table.tsx
    const transformedContact: FastTableContact = {
      id: apiContact.id,
      name: apiContact.name,
      email: apiContact.email,
      title: apiContact.title,
      email_verified_status: apiContact.email_verified_status,
      updated_at: apiContact.updatedAt || apiContact.updated_at,
      outlets: apiContact.outlets || [],
      beats: apiContact.beats || [],
      ai_beats: apiContact.ai_beats || [],
      countries: apiContact.countries || [],
      regions: apiContact.regions || [],
      languages: apiContact.languages || [],
      outletCount: apiContact._count?.outlets || apiContact.outletCount || 0,
      beatCount: apiContact._count?.beats || apiContact.beatCount || 0,
      countryCount: apiContact._count?.countries || apiContact.countryCount || 0,
      regionCount: apiContact.regionCount || 0,
      languageCount: apiContact.languageCount || 0
    };

    expect(transformedContact.updated_at).toBe('2025-09-04T16:11:39.497Z');
  });

  it('should handle date formatting correctly', () => {
    const dateString = '2025-09-04T16:11:39.497Z';
    const date = new Date(dateString);
    
    // This should not be NaN
    expect(isNaN(date.getTime())).toBe(false);
    
    // Test the actual formatting
    const formatted = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should handle the adaptApiContactToTableItem function correctly', () => {
    const apiContact: any = {
      id: 'test-id',
      name: 'Test Contact',
      email: 'test@example.com',
      title: 'Test Title',
      email_verified_status: true,
      updatedAt: '2025-09-04T16:11:39.497Z',
      outlets: [],
      beats: [],
      countries: [],
      regions: [],
      languages: [],
      outletCount: 0,
      beatCount: 0,
      countryCount: 0,
      regionCount: 0,
      languageCount: 0
    };

    const adaptedContact = adaptApiContactToTableItem(apiContact);
    
    expect(adaptedContact.updated_at).toBe('2025-09-04T16:11:39.497Z');
  });

  it('should handle both updatedAt and updated_at fields', () => {
    // Test with updatedAt (camelCase)
    const contactWithUpdatedAt: any = {
      id: 'test-id',
      name: 'Test Contact',
      email: 'test@example.com',
      title: 'Test Title',
      email_verified_status: true,
      updatedAt: '2025-09-04T16:11:39.497Z',
      outlets: [],
      beats: [],
      countries: [],
      regions: [],
      languages: [],
      outletCount: 0,
      beatCount: 0,
      countryCount: 0,
      regionCount: 0,
      languageCount: 0
    };

    const adapted1 = adaptApiContactToTableItem(contactWithUpdatedAt);
    expect(adapted1.updated_at).toBe('2025-09-04T16:11:39.497Z');

    // Test with updated_at (snake_case)
    const contactWithUpdatedAtSnake: any = {
      id: 'test-id',
      name: 'Test Contact',
      email: 'test@example.com',
      title: 'Test Title',
      email_verified_status: true,
      updated_at: '2025-09-04T16:11:39.497Z',
      outlets: [],
      beats: [],
      countries: [],
      regions: [],
      languages: [],
      outletCount: 0,
      beatCount: 0,
      countryCount: 0,
      regionCount: 0,
      languageCount: 0
    };

    const adapted2 = adaptApiContactToTableItem(contactWithUpdatedAtSnake);
    expect(adapted2.updated_at).toBe('2025-09-04T16:11:39.497Z');
  });
});