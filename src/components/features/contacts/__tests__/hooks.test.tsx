/**
 * Contact Management Hooks Tests
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useContactManagement, 
  useTableColumns, 
  useContactPreview,
  useContactExport,
  DEFAULT_TABLE_COLUMNS 
} from '../hooks';
import { Contact, SortConfig, ContactFilter } from '../types';

// Mock contact data
const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    name: 'John Doe',
    title: 'Software Engineer',
    email: 'john.doe@example.com',
    confidenceScore: 0.85,
    verificationStatus: 'CONFIRMED',
    sourceUrl: 'https://example.com/john-doe',
    extractionMethod: 'AI_BASED',
    createdAt: new Date('2023-01-01'),
  },
  {
    id: 'contact-2',
    name: 'Jane Smith',
    title: 'Product Manager',
    email: 'jane.smith@example.com',
    confidenceScore: 0.75,
    verificationStatus: 'PENDING',
    sourceUrl: 'https://example.com/jane-smith',
    extractionMethod: 'AI_BASED',
    createdAt: new Date('2023-01-02'),
  },
  {
    id: 'contact-3',
    name: 'Bob Johnson',
    title: 'Designer',
    email: 'bob.johnson@example.com',
    confidenceScore: 0.65,
    verificationStatus: 'REJECTED',
    sourceUrl: 'https://example.com/bob-johnson',
    extractionMethod: 'AI_BASED',
    createdAt: new Date('2023-01-03'),
  },
];

describe('useContactManagement', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    expect(result.current.contacts).toHaveLength(3);
    expect(result.current.totalContacts).toBe(3);
    expect(result.current.filter).toEqual({});
    expect(result.current.sort).toEqual({ key: 'createdAt', direction: 'desc' });
    expect(result.current.viewMode).toBe('table');
    expect(result.current.selectedContacts).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('filters contacts by search query', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    act(() => {
      result.current.updateFilter({ search: 'John' });
    });

    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].name).toBe('John Doe');
  });

  it('filters contacts by confidence range', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    act(() => {
      result.current.updateFilter({ confidenceMin: 0.8 });
    });

    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].name).toBe('John Doe');
  });

  it('filters contacts by verification status', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    act(() => {
      result.current.updateFilter({ verificationStatus: ['CONFIRMED'] });
    });

    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].name).toBe('John Doe');
  });

  it('sorts contacts by name', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    act(() => {
      result.current.updateSort({ key: 'name', direction: 'asc' });
    });

    expect(result.current.contacts[0].name).toBe('Bob Johnson');
    expect(result.current.contacts[1].name).toBe('Jane Smith');
    expect(result.current.contacts[2].name).toBe('John Doe');
  });

  it('paginates contacts', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts, { pageSize: 2 })
    );

    act(() => {
      result.current.updatePagination({ pageSize: 2, page: 1 });
    });

    expect(result.current.contacts).toHaveLength(2);
    expect(result.current.pagination.page).toBe(1);
    expect(result.current.pagination.pageSize).toBe(2);
    expect(result.current.pagination.totalPages).toBe(2);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.pagination.page).toBe(2);
  });

  it('manages contact selection', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    act(() => {
      result.current.toggleContactSelection('contact-1');
    });

    expect(result.current.selectedContacts).toEqual(['contact-1']);
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.someSelected).toBe(true);
    expect(result.current.allSelected).toBe(false);

    act(() => {
      result.current.selectAllContacts();
    });

    expect(result.current.selectedContacts).toEqual(['contact-1', 'contact-2', 'contact-3']);
    expect(result.current.allSelected).toBe(true);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedContacts).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
  });

  it('updates view mode', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    act(() => {
      result.current.setViewMode('grid');
    });

    expect(result.current.viewMode).toBe('grid');
  });

  it('performs bulk actions', async () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    act(() => {
      result.current.selectAllContacts();
    });

    act(() => {
      result.current.performBulkAction('import');
    });

    // Check if contacts were marked as imported
    const updatedContacts = result.current.allContacts.filter(c => 
      ['contact-1', 'contact-2', 'contact-3'].includes(c.id)
    );
    
    updatedContacts.forEach(contact => {
      expect(contact.imported).toBe(true);
    });
  });

  it('updates contacts', () => {
    const { result } = renderHook(() => 
      useContactManagement(mockContacts)
    );

    const newContacts = [...mockContacts, {
      id: 'contact-4',
      name: 'Alice Brown',
      title: 'CEO',
      email: 'alice.brown@example.com',
      confidenceScore: 0.95,
      verificationStatus: 'CONFIRMED',
      sourceUrl: 'https://example.com/alice-brown',
      extractionMethod: 'AI_BASED',
      createdAt: new Date('2023-01-04'),
    }];

    act(() => {
      result.current.updateContacts(newContacts);
    });

    expect(result.current.totalContacts).toBe(4);
    expect(result.current.contacts).toHaveLength(4);
  });
});

describe('useTableColumns', () => {
  it('initializes with default columns', () => {
    const { result } = renderHook(() => 
      useTableColumns(DEFAULT_TABLE_COLUMNS)
    );

    expect(result.current.columns).toHaveLength(8);
    expect(result.current.visibleColumns).toHaveLength(6); // 6 visible by default
    expect(result.current.columnManagerOpen).toBe(false);
  });

  it('toggles column visibility', () => {
    const { result } = renderHook(() => 
      useTableColumns(DEFAULT_TABLE_COLUMNS)
    );

    act(() => {
      result.current.toggleColumnVisibility('sourceUrl');
    });

    const sourceUrlColumn = result.current.columns.find(c => c.id === 'sourceUrl');
    expect(sourceUrlColumn?.visible).toBe(true);
  });

  it('updates column properties', () => {
    const { result } = renderHook(() => 
      useTableColumns(DEFAULT_TABLE_COLUMNS)
    );

    act(() => {
      result.current.updateColumn('name', { label: 'Full Name' });
    });

    const nameColumn = result.current.columns.find(c => c.id === 'name');
    expect(nameColumn?.label).toBe('Full Name');
  });

  it('reorders columns', () => {
    const { result } = renderHook(() => 
      useTableColumns(DEFAULT_TABLE_COLUMNS)
    );

    const originalOrder = result.current.columns.map(c => c.id);

    act(() => {
      result.current.reorderColumns(0, 1);
    });

    const newOrder = result.current.columns.map(c => c.id);
    expect(newOrder[0]).toBe(originalOrder[1]);
    expect(newOrder[1]).toBe(originalOrder[0]);
  });

  it('resets columns to default', () => {
    const { result } = renderHook(() => 
      useTableColumns(DEFAULT_TABLE_COLUMNS)
    );

    act(() => {
      result.current.toggleColumnVisibility('sourceUrl');
    });

    act(() => {
      result.current.resetColumns();
    });

    expect(result.current.columns).toEqual(DEFAULT_TABLE_COLUMNS);
  });

  it('manages column manager state', () => {
    const { result } = renderHook(() => 
      useTableColumns(DEFAULT_TABLE_COLUMNS)
    );

    act(() => {
      result.current.setColumnManagerOpen(true);
    });

    expect(result.current.columnManagerOpen).toBe(true);

    act(() => {
      result.current.setColumnManagerOpen(false);
    });

    expect(result.current.columnManagerOpen).toBe(false);
  });
});

describe('useContactPreview', () => {
  it('initializes with no contact selected', () => {
    const { result } = renderHook(() => 
      useContactPreview(mockContacts)
    );

    expect(result.current.currentContact).toBeNull();
    expect(result.current.previewOpen).toBe(false);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
  });

  it('opens preview for specific contact', () => {
    const { result } = renderHook(() => 
      useContactPreview(mockContacts)
    );

    act(() => {
      result.current.openPreview('contact-2');
    });

    expect(result.current.currentContact?.id).toBe('contact-2');
    expect(result.current.previewOpen).toBe(true);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(true);
  });

  it('navigates to next contact', () => {
    const { result } = renderHook(() => 
      useContactPreview(mockContacts)
    );

    act(() => {
      result.current.openPreview('contact-1');
    });

    act(() => {
      result.current.nextContact();
    });

    expect(result.current.currentContact?.id).toBe('contact-2');
  });

  it('navigates to previous contact', () => {
    const { result } = renderHook(() => 
      useContactPreview(mockContacts)
    );

    act(() => {
      result.current.openPreview('contact-2');
    });

    act(() => {
      result.current.previousContact();
    });

    expect(result.current.currentContact?.id).toBe('contact-1');
  });

  it('handles boundary conditions', () => {
    const { result } = renderHook(() => 
      useContactPreview(mockContacts)
    );

    act(() => {
      result.current.openPreview('contact-1');
    });

    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(true);

    act(() => {
      result.current.openPreview('contact-3');
    });

    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.hasNext).toBe(false);
  });

  it('closes preview', () => {
    const { result } = renderHook(() => 
      useContactPreview(mockContacts)
    );

    act(() => {
      result.current.openPreview('contact-1');
    });

    act(() => {
      result.current.closePreview();
    });

    expect(result.current.currentContact).toBeNull();
    expect(result.current.previewOpen).toBe(false);
  });
});

describe('useContactExport', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => 
      useContactExport(mockContacts)
    );

    expect(result.current.exporting).toBe(false);
    expect(result.current.exportModalOpen).toBe(false);
  });

  it('manages export modal state', () => {
    const { result } = renderHook(() => 
      useContactExport(mockContacts)
    );

    act(() => {
      result.current.setExportModalOpen(true);
    });

    expect(result.current.exportModalOpen).toBe(true);

    act(() => {
      result.current.setExportModalOpen(false);
    });

    expect(result.current.exportModalOpen).toBe(false);
  });

  it('exports contacts in different formats', async () => {
    const { result } = renderHook(() => 
      useContactExport(mockContacts)
    );

    const mockExport = jest.fn();
    global.URL.createObjectURL = jest.fn();
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
    }));
    global.URL.revokeObjectURL = jest.fn();

    // Create a mock document
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const mockBody = {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    };
    Object.defineProperty(document, 'createElement', {
      value: jest.fn().mockReturnValue(mockLink),
    });
    Object.defineProperty(document, 'body', {
      value: mockBody,
    });

    await act(async () => {
      await result.current.exportContacts('csv');
    });

    expect(result.current.exporting).toBe(false);
    expect(result.current.exportModalOpen).toBe(false);
  });
});