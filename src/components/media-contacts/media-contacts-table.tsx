"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MediaContactsPagination } from './media-contacts-pagination';

import { MediaContactTableItem, getColumns } from "./columns";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";
// Filtering is now handled by the client view component



import {
  X as XIcon, // For Clear All button
} from "lucide-react";

/**
 * Props for MediaContactsTable component
 * Following Rust-inspired explicit typing pattern with comprehensive documentation
 */
interface MediaContactsTableProps {
  data: MediaContactTableItem[];
  onDataRefresh: () => void;
  onEditContact: (contact: MediaContactTableItem) => void;
  onViewContact: (contact: MediaContactTableItem) => void;
  
  // Search filters
  mainSearchTerm?: string;
  
  // Country filters
  selectedCountryIds?: string[];
  
  // Beat filters
  selectedBeatIds?: string[];
  
  // Region filters (new)
  selectedRegionCodes?: string[];
  
  // Language filters (new)
  selectedLanguageCodes?: string[];
  
  // Email verification filter
  emailVerifiedFilter?: 'all' | 'verified' | 'unverified';
  
  // Pagination properties
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  pageSize?: number;
  setPageSize?: (size: number) => void;
  totalCount?: number;
}

/**
 * Table component for displaying and interacting with media contacts data
 * Implements filtering, sorting and pagination
 */
export function MediaContactsTable({
  data,
  onDataRefresh,
  onEditContact,
  onViewContact,
  mainSearchTerm = '',
  selectedCountryIds = [],
  selectedBeatIds = [],
  selectedRegionCodes = [],
  selectedLanguageCodes = [],
  emailVerifiedFilter = 'all',
  currentPage = 0,
  setCurrentPage,
  pageSize = 10,
  setPageSize,
  totalCount = 0
}: MediaContactsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<MediaContactTableItem | null>(null);

  // Calculate pageCount based on props - Ensure this is correctly scoped now
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const handleDeleteCompleted = () => {
    // Note: Success/error toasts are handled within DeleteConfirmationModal itself.
    // The modal also handles closing itself via its onOpenChange prop.
    onDataRefresh(); // Refresh the table data after deletion
    setContactToDelete(null); // Clear the selected contact
  };

  /**
   * Calculate the active filters count for UI feedback
   * Following Rust-inspired explicit return type and comprehensive calculation
   * @returns The total number of active filters
   */
  function calculateActiveFiltersCount(): number {
    return (
      (mainSearchTerm.trim() !== '' ? 1 : 0) +
      selectedCountryIds.length +
      selectedBeatIds.length +
      selectedRegionCodes.length +
      selectedLanguageCodes.length +
      (emailVerifiedFilter !== 'all' ? 1 : 0)
    );
  }
  const activeFiltersCount = calculateActiveFiltersCount();

  /**
   * Clear table-specific column filters (global filters are handled by parent component)
   * Following Rust-inspired explicit function definition
   */
  function handleClearTableFilters(): void {
    // Reset any column filters that might have been set directly on the table
    setColumnFilters([]);
  };

  /**
   * Handle initiating contact deletion process
   * Sets up the contact to delete and opens the confirmation modal
   */
  const handleDeleteContact = (contact: MediaContactTableItem) => {
    setContactToDelete(contact);
    setIsDeleteModalOpen(true);
  };

  /**
   * Handle successful deletion
   * Triggers data refresh and resets delete state
   */
  const handleDeleteComplete = () => {
    onDataRefresh();
    setContactToDelete(null);
  };

  /**
   * Create global filter function to check against multiple fields
   * Following Rust-inspired explicit typing, comprehensive validation, and fail-fast approach
   */
  const globalFilterFn = useCallback(
    (row: any): boolean => {
      const contact = row.original;
      if (!contact) return false; // Fail fast if contact is invalid
      
      // Debug logging for diagnostic purposes
      console.debug('[globalFilterFn] Processing contact:', {
        id: contact?.id,
        name: contact?.name,
        email: contact?.email,
        emailVerified: contact?.emailVerified,
        outlets: contact?.outlets?.map((o: { id?: string; name?: string }) => ({ id: o?.id, name: o?.name })) ?? []
      });
      
      // Main search with robust null checking - ensure no undefined.toLowerCase() calls
      const searchTermLower = mainSearchTerm?.toLowerCase?.() ?? '';
      
      // Implement Safe Method Chaining with nullish coalescing
      const nameMatch = contact?.name?.toLowerCase?.()?.includes?.(searchTermLower) ?? false;
      const emailMatch = contact?.email?.toLowerCase?.()?.includes?.(searchTermLower) ?? false;
      
      // Safe array operations with explicit fallback
      const outletMatches = contact?.outlets?.some?.((outlet: any) => 
        outlet?.name?.toLowerCase?.()?.includes?.(searchTermLower) ?? false
      ) ?? false;
      
      const textMatches = searchTermLower === '' || nameMatch || emailMatch || outletMatches;
      
      // Country filtering with robust null checking
      const countryMatches = selectedCountryIds?.length === 0 || 
        (contact?.countries?.some?.((country: any) => 
          selectedCountryIds?.includes?.(country?.id) ?? false
        ) ?? false);
      
      // Beat filtering with robust null checking
      const beatMatches = selectedBeatIds?.length === 0 || 
        (contact?.beats?.some?.((beat: any) => 
          selectedBeatIds?.includes?.(beat?.id) ?? false
        ) ?? false);
      
      // Region filtering with robust null checking
      const regionMatches = selectedRegionCodes?.length === 0 || 
        (contact?.countries?.some?.((country: any) => {
          // Fail-fast validation for nested properties
          if (!country || !country.regions) return false;
          
          // Check if country belongs to any of the selected regions
          return country.regions?.some?.((region: any) => 
            selectedRegionCodes?.includes?.(region?.code) ?? false
          ) ?? false;
        }) ?? false);
      
      // Language filtering with robust null checking
      const languageMatches = selectedLanguageCodes?.length === 0 || 
        (contact?.countries?.some?.((country: any) => {
          // Fail-fast validation for nested properties
          if (!country || !country.languages) return false;
          
          // Check if country uses any of the selected languages
          return country.languages?.some?.((language: any) => 
            selectedLanguageCodes?.includes?.(language?.code) ?? false
          ) ?? false;
        }) ?? false);
      
      // Email verification status with explicit null checking
      const emailVerificationMatches = 
        emailVerifiedFilter === 'all' || 
        (emailVerifiedFilter === 'verified' && contact?.emailVerified === true) || 
        (emailVerifiedFilter === 'unverified' && contact?.emailVerified !== true);
      
      // All conditions must be true for the row to be included
      return (
        textMatches && 
        countryMatches && 
        beatMatches && 
        regionMatches && 
        languageMatches && 
        emailVerificationMatches
      );
    },
    [mainSearchTerm, selectedCountryIds, selectedBeatIds, selectedRegionCodes, selectedLanguageCodes, emailVerifiedFilter]
  );

  // Explicitly typed filteredData with fail-fast approach
  const filteredData = useMemo<MediaContactTableItem[]>(() => {
    // Log input data for debugging
    console.log('[MediaContactsTable] Input data for filtering:', 
      data ? `${data.length} contacts` : 'No data');
    
    // Defensive check - if data is null/undefined, return empty array to prevent crashes
    if (!data || !Array.isArray(data)) {
      console.warn('[MediaContactsTable] Invalid data input, returning empty array');
      return [];
    }
    
    // Log the raw data to diagnose potential issues
    if (data.length > 0) {
      console.log('[MediaContactsTable] Sample data item:', data[0]);
    }
    
    // Log filtering details
    console.log('[MediaContactsTable] Active filters count:', activeFiltersCount);

    // Performance optimization: If no filters active, use data directly
    if (activeFiltersCount === 0) {
      console.log('[MediaContactsTable] No active filters, using data directly:', 
        `${data.length} contacts`);
      return data;
    }
    
    // Apply global filter function with explicit typing
    const result = data.filter(globalFilterFn);
    console.log('[MediaContactsTable] Data after filtering:', 
      `${result.length} of ${data.length} contacts`);
    
    return result;
  }, [data, globalFilterFn, activeFiltersCount]);

  /**
   * Define table columns with explicit memoization to prevent unnecessary rerenders
   * Following Rust-inspired explicit typing and dependency tracking
   */
  const columns = useMemo<ColumnDef<MediaContactTableItem>[]>(
    () => getColumns({ onEditContact, onDeleteContact: handleDeleteContact, onViewContact }),
    [onEditContact, onViewContact, handleDeleteContact]
  );

  // We've moved this reference up to be used with the virtualizer

  // Create the table instance with TanStack Table
  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    // We handle pagination ourselves with server-side pagination
    // getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    // Enable manual pagination mode for server-side pagination
    manualPagination: true, 
    // Pass the total count from the server
    pageCount: Math.ceil(totalCount / pageSize) || 1,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage,
        pageSize,
      },
    },
  });
  
  // Reference for the scrollable container
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Apply container styles for proper scrolling
  useEffect(() => {
    if (tableContainerRef.current) {
      // We still need a fixed height container for scrolling
      tableContainerRef.current.style.height = '500px';
      tableContainerRef.current.style.overflow = 'auto';
    }
  }, []);
  
  // Debug logging to track data flow
  useEffect(() => {
    // Debug active filters
    const activeFiltersCount = calculateActiveFiltersCount();
    console.log('[MediaContactsTable] Active filters count:', activeFiltersCount);
    console.log('[MediaContactsTable] Selected country IDs:', selectedCountryIds);
    console.log('[MediaContactsTable] Selected beat IDs:', selectedBeatIds);
    console.log('[MediaContactsTable] Selected region codes:', selectedRegionCodes);
    console.log('[MediaContactsTable] Selected language codes:', selectedLanguageCodes);
    console.log('[MediaContactsTable] Email verified filter:', emailVerifiedFilter);
    console.log('[MediaContactsTable] Current page:', currentPage, 'Page size:', pageSize);
  }, [selectedCountryIds, selectedBeatIds, selectedRegionCodes, selectedLanguageCodes, emailVerifiedFilter, currentPage, pageSize, calculateActiveFiltersCount]);
  
  // Debug the rendering process
  useEffect(() => {
    const tableRows = table.getRowModel().rows;
    console.log(`[MediaContactsTable] Rendering with ${tableRows.length} rows`); 
    
    // Print out the first 3 rows to verify data structure
    if (tableRows.length > 0) {
      tableRows.slice(0, 3).forEach((row, i) => {
        console.log(`[MediaContactsTable] Row ${i}:`, {
          id: row.id,
          name: row.original.name,
          email: row.original.email
        });
      });
    }
  }, [table]);
  
  // Return the component JSX structure
  return (
    <div className="w-full space-y-4">
      {/* Table with fixed header */}
      <div className="rounded-md border overflow-hidden">
        <div 
          className="min-h-[400px] max-h-vh overflow-auto" 
          ref={tableContainerRef}
          style={{ height: '670px', position: 'relative' }}
        >
          {/* Diagnostic message commented out to avoid disrupting layout 
          {table.getRowModel().rows.length > 0 && (
            <div className="p-2 bg-green-100 text-xs">
              {table.getRowModel().rows.length} rows available for rendering
            </div>
          )}
          */}
          <Table className="relative w-full">
            <TableHeader className="sticky top-0 z-10 bg-white border-b">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <TableHead 
                        key={header.id}
                        colSpan={header.colSpan}
                        className="bg-white"
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                // Simple standard table rendering without virtualization
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => onViewContact(row.original)}
                  >
                    {row.getVisibleCells().map(cell => {
                      const columnWidths = {
                        'name': '180px', 'email': '220px', 'outlets': '180px',
                        'beats': '180px', 'countries': '180px', 'updated_at': '120px',
                        'email_verified_status': '120px', 'actions': '80px'
                      };
                      const width = columnWidths[cell.column.id as keyof typeof columnWidths] || '150px';
                      
                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            width,
                            maxWidth: width,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          onClick={(e) => {
                            if (cell.column.id === 'actions') {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {activeFiltersCount > 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground mb-2">No results found with current filters.</p>
                      <Button variant="outline" size="sm" onClick={handleClearTableFilters}>
                        <XIcon className="mr-2 h-4 w-4" />Clear Filters
                      </Button>
                    </div>
                  ) : data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No contacts have been loaded or added yet.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No contacts match the current criteria (this state should ideally not be reached if filters are truly clear).
                    </p>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Controls */}
        <MediaContactsPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
        />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        contactId={contactToDelete?.id || null}
        contactName={contactToDelete?.name || ''}
        onDeleteComplete={handleDeleteCompleted}
      />
    </div>
  );
}
