/**
 * AI Search Results Container
 * Integrates search progress, results display, and import functionality
 */

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  XCircle,
  Download,
  Users,
  Eye,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

import { useAISearchWorkflow } from '@/lib/ai/integration/use-ai-search-workflow';
import { SearchProgress } from './progress/search-progress';
import { ResultsTable } from '@/components/features/contacts/results-table';
import { Contact } from '@/components/features/contacts/types';
import { TableColumn, SortConfig, FilterConfig, PaginationConfig } from '@/components/features/contacts/types';

interface SearchResultsContainerProps {
  searchId: string;
  onClose?: () => void;
  onViewInMainTable?: (contactIds: string[]) => void;
  className?: string;
}

export function SearchResultsContainer({
  searchId,
  onClose,
  onViewInMainTable,
  className
}: SearchResultsContainerProps) {
  // Initialize workflow with the provided search ID
  const workflow = useAISearchWorkflow({
    onSearchComplete: (completedSearchId, results) => {
      console.log('Search completed:', { completedSearchId, results });
    },
    onSearchError: (error) => {
      console.error('Search error:', error);
    },
    onContactsImported: (imported, failed) => {
      console.log(`Imported ${imported} contacts, ${failed} failed`);
    },
    enableRealTimeUpdates: true,
    autoShowResults: true
  });

  const {
    setSelectedContacts,
    importSelectedContacts,
    selectAllContacts,
    clearContactSelection,
    hasSelection,
    canImport
  } = workflow;

  // Local state
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);

  // Results table state
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>('table');
  const [sort, setSort] = useState<SortConfig>({ key: 'confidenceScore', direction: 'desc' });
  const [filter, setFilter] = useState<FilterConfig>({ search: '' });
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1
  });

  // Default columns for results table
  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'name', label: 'Name', visible: true, sortable: true, minWidth: 200 },
    { id: 'email', label: 'Email', visible: true, sortable: true, minWidth: 200 },
    { id: 'company', label: 'Company', visible: true, sortable: true, minWidth: 150 },
    { id: 'title', label: 'Title', visible: true, sortable: true, minWidth: 150 },
    { id: 'confidenceScore', label: 'Confidence', visible: true, sortable: true, width: 100 },
    { id: 'verificationStatus', label: 'Status', visible: true, sortable: true, width: 100 },
    { id: 'sourceUrl', label: 'Source', visible: true, sortable: false, minWidth: 150 },
    { id: 'createdAt', label: 'Found', visible: true, sortable: true, width: 100 }
  ]);

  // Set the current search ID when component mounts
  useEffect(() => {
    if (searchId && searchId !== workflow.state.currentSearch) {
      // The workflow hook would need to be extended to support loading existing searches
      // For now, we'll just track the search ID
      console.log('SearchResultsContainer mounted with searchId:', searchId);
    }
  }, [searchId, workflow.state.currentSearch]);

  // Update pagination when contacts change
  useEffect(() => {
    const total = workflow.state.contacts.length;
    const totalPages = Math.ceil(total / pagination.pageSize);

    if (total !== pagination.total || totalPages !== pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        total,
        totalPages
      }));
    }
  }, [workflow.state.contacts.length, pagination.total, pagination.totalPages, pagination.pageSize]);

  // Handle contact selection
  const handleContactSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedContacts(selectedIds);
  }, [setSelectedContacts]);

  // Handle contact preview
  const handleContactPreview = useCallback((contact: Contact) => {
    setPreviewContact(contact);
  }, []);

  // Handle bulk import
  const handleBulkImport = useCallback(async (contactIds: string[]) => {
    try {
      await importSelectedContacts(contactIds);
    } catch (error) {
      console.error('Bulk import failed:', error);
    }
  }, [importSelectedContacts]);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string, contactIds: string[]) => {
    switch (action) {
      case 'export':
        setExportModalOpen(true);
        break;
      case 'view_in_main':
        onViewInMainTable?.(contactIds);
        break;
      default:
        console.log('Unknown bulk action:', action);
    }
  }, [onViewInMainTable]);

  // Get current page contacts
  const getCurrentPageContacts = useCallback(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return workflow.state.contacts.slice(startIndex, endIndex);
  }, [workflow.state.contacts, pagination.page, pagination.pageSize]);

  // Render search progress
  const renderSearchProgress = () => {
    if (!workflow.state.showProgress || workflow.state.searchStatus === 'idle') {
      return null;
    }

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {workflow.isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
            {workflow.isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            {workflow.isFailed && <XCircle className="h-5 w-5 text-red-600" />}
            AI Search Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SearchProgress
            searchId={workflow.state.currentSearch || ''}
            initialProgress={workflow.state.searchProgress}
            onCancel={() => workflow.cancelSearch()}
            onRetry={() => workflow.refreshSearchStatus()}
            onViewResults={() => setShowTechnicalDetails(true)}
            showDetails={showTechnicalDetails}
            compact={false}
          />
        </CardContent>
      </Card>
    );
  };

  // Render search error
  const renderSearchError = () => {
    if (!workflow.state.searchError) return null;

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>{workflow.state.searchError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => workflow.refreshSearchStatus()}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // Render results summary
  const renderResultsSummary = () => {
    if (workflow.state.contacts.length === 0) return null;

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">
              {workflow.state.contacts.length} contacts found
            </span>
          </div>

          {workflow.state.selectedContacts.length > 0 && (
            <Badge variant="secondary" aria-live="polite">
              {workflow.state.selectedContacts.length} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectAllContacts()}
            disabled={workflow.state.contacts.length === 0}
          >
            Select All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => clearContactSelection()}
            disabled={!hasSelection}
          >
            Clear Selection
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            size="sm"
            onClick={() => handleBulkImport(workflow.state.selectedContacts)}
            disabled={!canImport}
          >
            {workflow.state.importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import Selected
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            disabled={workflow.state.selectedContacts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    );
  };

  // Render import progress
  const renderImportProgress = () => {
    if (!workflow.state.importing && workflow.state.importProgress.total === 0) return null;

    const { imported, failed, total, errors } = workflow.state.importProgress;
    const progress = total > 0 ? ((imported + failed) / total) * 100 : 0;

    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Importing Contacts</h4>
              <span className="text-sm text-muted-foreground">
                {imported + failed} of {total} contacts
              </span>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">✓ {imported} imported</span>
              {failed > 0 && <span className="text-red-600">✗ {failed} failed</span>}
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Import Errors:</p>
                    {errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-sm">{error}</p>
                    ))}
                    {errors.length > 3 && (
                      <p className="text-sm">... and {errors.length - 3} more errors</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">AI Search Results</h2>
            <p className="text-sm text-muted-foreground">
              Search ID: {searchId.slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workflow.state.currentSearch && (
            <Badge
              variant={
                workflow.isRunning ? 'default' :
                workflow.isCompleted ? 'secondary' :
                workflow.isFailed ? 'destructive' : 'outline'
              }
            >
              {workflow.state.searchStatus}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => workflow.refreshSearchStatus()}
            disabled={workflow.isSubmitting}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Progress */}
      {renderSearchProgress()}

      {/* Search Error */}
      {renderSearchError()}

      {/* Import Progress */}
      {renderImportProgress()}

      {/* Results */}
      {workflow.hasResults && (
        <>
          {/* Results Summary */}
          {renderResultsSummary()}

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              <ResultsTable
                contacts={getCurrentPageContacts()}
                loading={workflow.state.loadingContacts}
                selectedContacts={workflow.state.selectedContacts}
                onSelectionChange={handleContactSelectionChange}
                onContactPreview={handleContactPreview}
                onImport={handleBulkImport}
                columns={columns}
                onColumnsChange={setColumns}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sort={sort}
                onSortChange={setSort}
                filter={filter}
                onFilterChange={setFilter}
                pagination={pagination}
                onPaginationChange={setPagination}
                onBulkAction={handleBulkAction}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* No Results */}
      {!workflow.hasResults && !workflow.isRunning && !workflow.state.searchError && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
              <p className="text-muted-foreground">
                {workflow.state.currentSearch
                  ? "The search is still running. Please wait for results to appear."
                  : "Start a new AI search to discover contacts."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SearchResultsContainer;
