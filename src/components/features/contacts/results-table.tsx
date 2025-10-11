/**
 * ResultsTable Component
 * Main table component with virtualization for handling large datasets
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  IconArrowsSort, 
  IconArrowUp, 
  IconArrowDown, 
  IconEye, 
  IconDownload,
  IconSearch,
  IconLayoutGrid,
  IconLayoutList,
  IconColumns,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight
} from '@tabler/icons-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { ResultsTableProps, Contact, ContactViewMode, SortConfig, TableColumn } from './types';
import { ConfidenceBadge } from './confidence-badge';
import { BulkActions } from './bulk-actions';
import { ColumnManager } from './column-manager';
import { ExportModal } from './export-modal';
import { ContactPreview } from './contact-preview';
import { ContactCard } from './contact-card';
import { 
  formatContactName, 
  formatContactTitle, 
  formatContactCompany, 
  getContactInitials,
  getVerificationStatusColor 
} from './types';

// Memoized row component to prevent unnecessary re-renders
const TableRowMemo = React.memo<{
  contact: Contact;
  columns: TableColumn[];
  isSelected: boolean;
  onSelectionChange: (contactId: string, selected: boolean) => void;
  onPreview: (contact: Contact) => void;
}>(({ contact, columns, isSelected, onSelectionChange, onPreview }) => {
  const [imageError, setImageError] = useState(false);
  const name = formatContactName(contact);
  const title = formatContactTitle(contact);
  const company = formatContactCompany(contact);
  const initials = getContactInitials(contact);

  const handleSelectionChange = (checked: boolean) => {
    onSelectionChange(contact.id, checked);
  };

  const handlePreview = () => {
    onPreview(contact);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getContactAvatar = () => {
    if (contact.contactInfo?.avatar && !imageError) {
      return (
        <AvatarImage 
          src={contact.contactInfo.avatar} 
          alt={name}
          onError={handleImageError}
        />
      );
    }
    return <AvatarFallback className="text-xs">{initials}</AvatarFallback>;
  };

  const renderCellContent = (column: TableColumn, contact: Contact) => {
    if (column.render) {
      return column.render(getValueByPath(contact, column.id), contact);
    }

    switch (column.id) {
      case 'name':
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {getContactAvatar()}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{name}</p>
              {title && (
                <p className="text-sm text-muted-foreground truncate">{title}</p>
              )}
            </div>
          </div>
        );
      
      case 'email':
        return contact.email ? (
          <a 
            href={`mailto:${contact.email}`}
            className="text-primary hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {contact.email}
          </a>
        ) : null;
      
      case 'company':
        return company ? (
          <span className="truncate">{company}</span>
        ) : null;
      
      case 'confidenceScore':
        return (
          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={contact.confidenceScore} size="sm" />
          </div>
        );
      
      case 'verificationStatus':
        return (
          <Badge 
            variant="outline" 
            className={getVerificationStatusColor(contact.verificationStatus)}
          >
            {contact.verificationStatus}
          </Badge>
        );
      
      case 'sourceUrl':
        return (
          <a 
            href={contact.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {new URL(contact.sourceUrl).hostname}
          </a>
        );
      
      case 'createdAt':
        return (
          <span className="text-sm">
            {new Date(contact.createdAt).toLocaleDateString()}
          </span>
        );
      
      default:
        return (
          <span className="truncate">
            {String(getValueByPath(contact, column.id) || '')}
          </span>
        );
    }
  };

  return (
    <TableRow 
      className={cn(
        "hover:bg-muted/50 cursor-pointer transition-colors",
        isSelected && "bg-primary/5"
      )}
      onClick={handlePreview}
    >
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectionChange}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      
      {columns.map((column) => (
        <TableCell 
          key={column.id} 
          className={cn(
            "whitespace-nowrap",
            column.width && `w-[${column.width}px]`,
            column.minWidth && `min-w-[${column.minWidth}px]`,
            column.maxWidth && `max-w-[${column.maxWidth}px]`
          )}
        >
          {renderCellContent(column, contact)}
        </TableCell>
      ))}
      
      <TableCell className="w-12">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            handlePreview();
          }}
        >
          <IconEye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

// Helper function to get nested object values
function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Sortable header component
const SortableHeader = React.memo<{
  column: TableColumn;
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
}>(({ column, sort, onSortChange }) => {
  const isSorted = sort.key === column.id;
  const sortDirection = isSorted ? sort.direction : null;

  const handleSort = () => {
    if (!column.sortable) return;
    
    let newDirection: 'asc' | 'desc' = 'asc';
    if (isSorted && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    
    onSortChange({ key: column.id, direction: newDirection });
  };

  const getSortIcon = () => {
    if (!isSorted) return <IconArrowsSort className="h-4 w-4" />;
    return sortDirection === 'asc' 
      ? <IconArrowUp className="h-4 w-4" />
      : <IconArrowDown className="h-4 w-4" />;
  };

  return (
    <TableHead 
      className={cn(
        "whitespace-nowrap font-medium",
        column.sortable && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={handleSort}
    >
      <div className="flex items-center gap-2">
        <span>{column.label}</span>
        {column.sortable && (
          <div className={cn(
            "transition-colors",
            isSorted ? "text-primary" : "text-muted-foreground"
          )}>
            {getSortIcon()}
          </div>
        )}
      </div>
    </TableHead>
  );
});

export function ResultsTable({
  contacts,
  loading = false,
  selectedContacts,
  onSelectionChange,
  onContactPreview,
  onImport,
  columns,
  onColumnsChange,
  viewMode,
  onViewModeChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  pagination,
  onPaginationChange,
  onBulkAction,
}: ResultsTableProps) {
  const [searchQuery, setSearchQuery] = useState(filter.search || '');
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  
  // Table ref for virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Virtualization setup
  const rowVirtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 10, // Number of items to render outside the visible area
  });

  // Memoized visible columns
  const visibleColumns = useMemo(() => 
    columns.filter(column => column.visible), 
    [columns]
  );

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onFilterChange({ ...filter, search: query });
  }, [filter, onFilterChange]);

  // Handle contact selection
  const handleContactSelectionChange = useCallback((contactId: string, selected: boolean) => {
    const newSelection = selected
      ? [...selectedContacts, contactId]
      : selectedContacts.filter(id => id !== contactId);
    onSelectionChange(newSelection);
  }, [selectedContacts, onSelectionChange]);

  // Handle preview
  const handleContactPreview = useCallback((contact: Contact) => {
    const index = contacts.findIndex(c => c.id === contact.id);
    setPreviewIndex(index);
    setPreviewContact(contact);
  }, [contacts]);

  const handleClosePreview = useCallback(() => {
    setPreviewContact(null);
    setPreviewIndex(null);
  }, []);

  const handleNextContact = useCallback(() => {
    if (previewIndex !== null && previewIndex < contacts.length - 1) {
      const nextIndex = previewIndex + 1;
      setPreviewIndex(nextIndex);
      setPreviewContact(contacts[nextIndex]);
    }
  }, [previewIndex, contacts]);

  const handlePreviousContact = useCallback(() => {
    if (previewIndex !== null && previewIndex > 0) {
      const prevIndex = previewIndex - 1;
      setPreviewIndex(prevIndex);
      setPreviewContact(contacts[prevIndex]);
    }
  }, [previewIndex, contacts]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    onPaginationChange({ ...pagination, page });
  }, [pagination, onPaginationChange]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    onPaginationChange({ ...pagination, pageSize, page: 1 });
  }, [pagination, onPaginationChange]);

  // Handle bulk actions
  const handleBulkImport = useCallback(() => {
    onImport(selectedContacts);
  }, [selectedContacts, onImport]);

  const handleBulkExport = useCallback((format: string) => {
    onBulkAction('export', selectedContacts);
    setExportModalOpen(false);
  }, [selectedContacts, onBulkAction]);

  const handleBulkAction = useCallback((action: string) => {
    onBulkAction(action, selectedContacts);
  }, [selectedContacts, onBulkAction]);

  // Handle import action
  const handleImport = useCallback((contactIds: string[]) => {
    onImport(contactIds);
  }, [onImport]);

  // Check if all contacts are selected
  const allSelected = contacts.length > 0 && selectedContacts.length === contacts.length;
  const someSelected = selectedContacts.length > 0 && selectedContacts.length < contacts.length;

  // Render table view
  const renderTableView = () => (
    <div className="flex flex-col h-full">
      {/* Table Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={String(pagination.pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnManagerOpen(true)}
          >
            <IconColumns className="h-4 w-4 mr-1" />
            Columns
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <IconLayoutGrid className="h-4 w-4 mr-1" />
            Grid
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            <IconLayoutList className="h-4 w-4 mr-1" />
            List
          </Button>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={tableContainerRef}
          className="h-full overflow-auto"
        >
          <Table className="border-separate border-spacing-0">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectionChange(contacts.map(c => c.id));
                      } else {
                        onSelectionChange([]);
                      }
                    }}
                  />
                </TableHead>
                
                {visibleColumns.map((column) => (
                  <SortableHeader
                    key={column.id}
                    column={column}
                    sort={sort}
                    onSortChange={onSortChange}
                  />
                ))}
                
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const contact = contacts[virtualItem.index];
              const isSelected = selectedContacts.includes(contact.id);
              
              return (
                <div
                  key={contact.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Table className="border-separate border-spacing-0">
                    <TableBody>
                      <TableRowMemo
                        contact={contact}
                        columns={visibleColumns}
                        isSelected={isSelected}
                        onSelectionChange={handleContactSelectionChange}
                        onPreview={handleContactPreview}
                      />
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          Showing {contacts.length} of {pagination.total} contacts
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={pagination.page === 1}
          >
            <IconChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <IconChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            <span className="text-sm">Page</span>
            <Input
              type="number"
              min={1}
              max={pagination.totalPages}
              value={pagination.page}
              onChange={(e) => handlePageChange(Number(e.target.value))}
              className="w-16 h-8 text-center"
            />
            <span className="text-sm">of {pagination.totalPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            <IconChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
          >
            <IconChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Render grid view
  const renderGridView = () => (
    <div className="flex flex-col h-full">
      {/* Grid Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('table')}
          >
            <IconLayoutList className="h-4 w-4 mr-1" />
            Table
          </Button>
        </div>
      </div>
      
      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contacts.map((contact) => {
            const isSelected = selectedContacts.includes(contact.id);
            
            return (
              <ContactCard
                key={contact.id}
                contact={contact}
                selected={isSelected}
                onSelect={(selected) => handleContactSelectionChange(contact.id, selected)}
                onPreview={() => handleContactPreview(contact)}
                showActions={true}
              />
            );
          })}
        </div>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          Showing {contacts.length} of {pagination.total} contacts
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  // Render list view
  const renderListView = () => (
    <div className="flex flex-col h-full">
      {/* List Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('table')}
          >
            <IconLayoutList className="h-4 w-4 mr-1" />
            Table
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <IconLayoutGrid className="h-4 w-4 mr-1" />
            Grid
          </Button>
        </div>
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {contacts.map((contact) => {
            const isSelected = selectedContacts.includes(contact.id);
            
            return (
              <ContactCard
                key={contact.id}
                contact={contact}
                selected={isSelected}
                onSelect={(selected) => handleContactSelectionChange(contact.id, selected)}
                onPreview={() => handleContactPreview(contact)}
                compact={true}
                showActions={false}
              />
            );
          })}
        </div>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          Showing {contacts.length} of {pagination.total} contacts
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Bulk Actions */}
      <div className="p-4 border-b">
        <BulkActions
          selectedCount={selectedContacts.length}
          totalCount={pagination.total}
          onImport={handleBulkImport}
          onExport={handleBulkExport}
          onSelectAll={() => onSelectionChange(contacts.map(c => c.id))}
          onClearSelection={() => onSelectionChange([])}
          onBulkAction={handleBulkAction}
          disabled={loading}
          loading={loading}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' && renderTableView()}
        {viewMode === 'grid' && renderGridView()}
        {viewMode === 'list' && renderListView()}
      </div>
      
      {/* Modals */}
      <ColumnManager
        columns={columns}
        onColumnsChange={onColumnsChange}
        isOpen={columnManagerOpen}
        onClose={() => setColumnManagerOpen(false)}
      />
      
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleBulkExport}
        loading={loading}
        selectedCount={selectedContacts.length}
        totalCount={pagination.total}
      />
      
      <ContactPreview
        contact={previewContact}
        isOpen={!!previewContact}
        onClose={handleClosePreview}
        onImport={() => handleImport([previewContact?.id || ''])}
        onNext={handleNextContact}
        onPrevious={handlePreviousContact}
        hasNext={previewIndex !== null && previewIndex < contacts.length - 1}
        hasPrevious={previewIndex !== null && previewIndex > 0}
      />
    </div>
  );
}

export default ResultsTable;