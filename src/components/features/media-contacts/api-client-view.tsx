'use client';

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {toast} from 'sonner';
import {FastMediaContactsTable} from './fast-table';
import {ApiMediaContactsFilters} from './api-filters/ApiMediaContactsFilters';
import {UpdateMediaContactSheet} from './update-media-contact-sheet';
import {ViewMediaContactSheet} from './view-media-contact-sheet';
import {Plus} from 'lucide-react';
import {
    ApiContact,
    FastTableContact,
    ReferenceData,
    MediaContactTableItem,
    adaptApiContactToTableItem,
} from '.';
import {
    ClientErrorHandler,
    isErrorResponse,
    type APIResponse,
} from '@/lib/api/client-error-handler';
import {
    cachedFetch,
    defaultCache,
    createCacheKey,
    withProgressiveEnhancement,
} from '@/lib/caching/client-cache';
import {ProgressiveEnhancement} from '@/components/ui/error-boundary';
import {
    useMediaContactsShortcuts,
    ScreenReaderAnnouncer,
} from '@/components/ui/accessibility';
import {useBulkSelection, BulkActionsBar} from '@/components/ui/bulk-actions';
import {Button} from '@/components/ui/button';

interface ApiClientViewProps {
    initialContacts?: ApiContact[];
    initialTotalCount?: number;
    initialPage?: number;
    initialPageSize?: number;
}

export default function ApiMediaContactsClientView({
    initialContacts = [],
    initialTotalCount = 0,
    initialPage = 1,
    initialPageSize = 10,
}: ApiClientViewProps) {
    // Error handler instances
    const errorHandler = useMemo(
        () =>
            new ClientErrorHandler({
                enableToasts: true,
                enableConsoleLogging: false,
            }),
        [],
    );

    const quietReferenceErrorHandler = useMemo(
        () =>
            new ClientErrorHandler({
                enableToasts: false,
                enableConsoleLogging: false,
            }),
        [],
    );

    // State
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [referenceData, setReferenceData] = useState<ReferenceData | null>(
        null,
    );
    const [isLoadingReference, setIsLoadingReference] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [allContacts, setAllContacts] = useState<ApiContact[]>([]);

    const [enhancementStatus, setEnhancementStatus] = useState<{
        isEnhanced: boolean;
        enhancementError?: string;
    }>({isEnhanced: true});

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
    const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>([]);
    const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
    const [selectedRegionCodes, setSelectedRegionCodes] = useState<string[]>(
        [],
    );
    const [selectedLanguageCodes, setSelectedLanguageCodes] = useState<
        string[]
    >([]);
    const [emailVerified, setEmailVerified] = useState<
        'all' | 'verified' | 'unverified'
    >('all');
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [sortBy, setSortBy] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(
        undefined,
    );

    // Sheet states
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [editingContact, setEditingContact] =
        useState<MediaContactTableItem | null>(null);
    const [viewingContact, setViewingContact] =
        useState<MediaContactTableItem | null>(null);
    const [isViewContactLoading, setIsViewContactLoading] = useState(false);

    // Bulk selection state
    const {
        selectedIds,
        selectedCount,
        selectedItems,
        isSelected,
        handleSelectionChange,
        selectAll,
        clearSelection,
    } = useBulkSelection(allContacts);

    // Handle add contact action
    const handleAddContact = useCallback(() => {
        setEditingContact(null);
        setIsEditSheetOpen(true);
    }, []);

    // Enhanced keyboard shortcuts
    const {showShortcutsHelp} = useMediaContactsShortcuts({
        onAddContact: handleAddContact,
        onSearch: () => {
            const searchInput = document.querySelector(
                'input[placeholder*="Search"]',
            ) as HTMLInputElement;
            searchInput?.focus();
        },
        onRefresh: () => setRefreshKey((prev) => prev + 1),
        onExport: () => toast.info('Export feature - press Ctrl+Shift+E'),
        onImport: () => toast.info('Import feature - press Ctrl+Shift+I'),
        onShowHelp: () => showShortcutsHelp(),
        enabled: !isEditSheetOpen && !isViewSheetOpen,
    });

    // Handle bulk operations
    const handleBulkDelete = useCallback(
        async (ids: string[]) => {
            try {
                const deletePromises = ids.map((id) =>
                    errorHandler.fetchWithRetry(
                        `/api/media-contacts/${id}`,
                        {method: 'DELETE'},
                        {maxRetries: 1},
                    ),
                );

                await Promise.all(deletePromises);
                setRefreshKey((prev) => prev + 1);
                ScreenReaderAnnouncer.announce(
                    `Deleted ${ids.length} contacts`,
                );
            } catch (error) {
                throw new Error('Failed to delete selected contacts');
            }
        },
        [errorHandler],
    );

    const handleBulkExport = useCallback(
        async (ids: string[]) => {
            try {
                const response = await errorHandler.fetchWithRetry(
                    '/api/media-contacts/export',
                    {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            fields: [
                                'name',
                                'email',
                                'title',
                                'outlets',
                                'beats',
                                'countries',
                            ],
                            filters: {ids},
                        }),
                    },
                    {maxRetries: 1},
                );

                const result = errorHandler.handleResponse(response);
                if (result.success) {
                    // Create download
                    const blob = new Blob([result.data], {type: 'text/csv'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `contacts-${
                        new Date().toISOString().split('T')[0]
                    }.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                throw new Error('Failed to export selected contacts');
            }
        },
        [errorHandler],
    );

    const handleBulkTag = useCallback(async (ids: string[], tags: string[]) => {
        // Implementation for bulk tagging
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
        ScreenReaderAnnouncer.announce(`Tagged ${ids.length} contacts`);
    }, []);

    // Empty fallback reference data - will be populated from database
    const fallbackReferenceData: ReferenceData = useMemo(
        () => ({
            countries: [],
            beats: [],
            regions: [],
            languages: [],
            outlets: [],
        }),
        [],
    );

    // Load reference data with caching and fallback
    const loadReferenceData = useCallback(
        async (_isRetry = false) => {
            setIsLoadingReference(true);

            try {
                console.log(
                    '🚀 [API-CLIENT] Loading reference data with cache and fallback...',
                );

                const cacheKey = createCacheKey('/api/reference');

                // Use progressive enhancement with cache and fallback
                const result = await withProgressiveEnhancement(
                    // Primary function: fetch with cache
                    async () => {
                        return await cachedFetch(
                            cacheKey,
                            async () => {
                                const controller = new AbortController();
                                const perRequestTimeout = 8000;
                                const abortTimer = setTimeout(
                                    () => controller.abort(),
                                    perRequestTimeout,
                                );
                                try {
                                    const response =
                                        await quietReferenceErrorHandler.fetchWithRetry<ReferenceData>(
                                            '/api/reference',
                                            {
                                                method: 'GET',
                                                signal: controller.signal,
                                                cache: 'no-store',
                                            },
                                            {
                                                maxRetries: 1,
                                                baseDelayMs: 500,
                                                retryableCategories: [
                                                    'network',
                                                    'database_connection',
                                                    'server',
                                                    'timeout',
                                                    'rate_limit',
                                                ],
                                            },
                                        );

                                    const result =
                                        quietReferenceErrorHandler.handleResponse(
                                            response,
                                            {
                                                showSuccessToast: false,
                                                showErrorToast: false,
                                            },
                                        );

                                    if (result.success && result.data) {
                                        return result.data;
                                    } else {
                                        throw new Error(
                                            'Failed to fetch reference data',
                                        );
                                    }
                                } finally {
                                    clearTimeout(abortTimer);
                                }
                            },
                            {
                                cacheOptions: {
                                    ttl: 5 * 60 * 1000, // 5 minutes
                                    maxAge: 30 * 60 * 1000, // 30 minutes
                                },
                                fallbackData: fallbackReferenceData,
                                useStaleWhileRevalidate: true,
                            },
                        );
                    },
                    // Fallback function: return static data
                    () => ({
                        data: fallbackReferenceData,
                        fromCache: false,
                        isStale: true,
                        source: 'fallback' as const,
                    }),
                    {
                        // Shorter timeout to avoid UI lockups
                        timeout: 8000,
                        retries: 1,
                    },
                );

                const {data: cacheResult, enhanced} = result;

                setReferenceData(cacheResult.data);

                // Update enhancement status (no UI messaging)
                setEnhancementStatus({
                    isEnhanced: enhanced,
                    enhancementError: undefined,
                });

                console.log('✅ [API-CLIENT] Reference data loaded:', {
                    source: cacheResult.source,
                    fromCache: cacheResult.fromCache,
                    isStale: cacheResult.isStale,
                    enhanced,
                });
            } catch (error) {
                console.error(
                    '❌ [API-CLIENT] All reference data loading methods failed:',
                    error,
                );

                // Last resort: use static fallback data
                setReferenceData(fallbackReferenceData);
            } finally {
                setIsLoadingReference(false);
            }
        },
        [quietReferenceErrorHandler, fallbackReferenceData],
    );

    // Load reference data on mount
    useEffect(() => {
        loadReferenceData();
    }, [loadReferenceData]);

    // Handle contact actions - always fetch fresh from database
    const handleViewContact = useCallback(
        async (contact: FastTableContact) => {
            console.log('handleViewContact called with contact:', contact);
            // Open sheet immediately with basic contact info
            const adaptedContact = adaptApiContactToTableItem(contact);
            console.log('Adapted contact:', adaptedContact);
            setViewingContact(adaptedContact);
            console.log('Set viewing contact state');
            setIsViewSheetOpen(true);
            console.log('View sheet opened');
            setIsViewContactLoading(true);

            try {
                // Always fetch fresh contact details from database
                const response = await errorHandler.fetchWithRetry(
                    `/api/media-contacts/${contact.id}`,
                    {method: 'GET', cache: 'no-store'},
                    {maxRetries: 2},
                );

                // Let error handler process response properly
                const result = errorHandler.handleResponse(response, {
                    showSuccessToast: false,
                    showErrorToast: true,
                    customErrorHandler: (error) => {
                        const msg =
                            (error as any)?.error?.message ||
                            (error as any)?.message ||
                            'Request failed';
                        console.warn(
                            '[VIEW] Contact details failed:',
                            msg,
                            error,
                        );
                    },
                });

                if (result.success && result.data?.contact) {
                    // Update with fresh contact details from database
                    setViewingContact(
                        adaptApiContactToTableItem(result.data.contact),
                    );
                }
                // No else needed - error handler already processed failure
            } catch (error) {
                // Only catch actual network/unexpected errors, not API errors
                console.error(
                    'Unexpected error loading contact details:',
                    error,
                );
                toast.error('Unexpected error', {
                    description: 'Please try again.',
                    duration: 5000,
                });
            } finally {
                setIsViewContactLoading(false);
            }
        },
        [errorHandler],
    );

    const handleEditContact = useCallback(
        async (contact: FastTableContact) => {
            try {
                // Always fetch fresh contact details from database for editing
                const response = await errorHandler.fetchWithRetry(
                    `/api/media-contacts/${contact.id}`,
                    {method: 'GET', cache: 'no-store'},
                    {maxRetries: 2},
                );

                // Let error handler process response properly
                const result = errorHandler.handleResponse(response, {
                    showSuccessToast: false,
                    showErrorToast: true,
                    customErrorHandler: (error) => {
                        const msg =
                            (error as any)?.error?.message ||
                            (error as any)?.message ||
                            'Request failed';
                        console.warn(
                            '[EDIT] Contact details failed:',
                            msg,
                            error,
                        );
                    },
                });

                if (result.success && result.data) {
                    const adaptedContact = adaptApiContactToTableItem(
                        result.data,
                    );
                    setEditingContact(adaptedContact);
                    setIsEditSheetOpen(true);
                }
                // No else needed - error handler already processed failure
            } catch (error) {
                // Only catch actual network/unexpected errors, not API errors
                console.error(
                    'Unexpected error loading contact for editing:',
                    error,
                );
                toast.error('Unexpected error', {
                    description: 'Please try again.',
                    duration: 5000,
                });
            }
        },
        [errorHandler],
    );

    const handleDeleteContact = useCallback(
        async (contact: FastTableContact) => {
            if (!confirm(`Are you sure you want to delete ${contact.name}?`)) {
                return;
            }

            try {
                const response = await errorHandler.fetchWithRetry(
                    `/api/media-contacts/${contact.id}`,
                    {method: 'DELETE'},
                    {
                        maxRetries: 1, // Only retry once for delete operations
                        retryableCategories: ['network', 'server'], // Don't retry client errors
                    },
                );

                const result = errorHandler.handleResponse(response, {
                    successMessage: 'Contact deleted successfully',
                    showSuccessToast: true,
                    showErrorToast: true,
                });

                if (result.success) {
                    // Trigger table refresh by incrementing refresh key
                    setRefreshKey((prev) => prev + 1);
                }
            } catch (error) {
                console.error('Error deleting contact:', error);
                toast.error('Failed to delete contact', {
                    description: 'Please try again or check your connection.',
                    duration: 5000,
                });
            }
        },
        [errorHandler],
    );

    const handleContactSaved = useCallback(() => {
        // Close the edit sheet
        setIsEditSheetOpen(false);
        setEditingContact(null);

        // Trigger table refresh by incrementing refresh key
        setRefreshKey((prev) => prev + 1);

        toast.success('Contact saved successfully');
    }, []);

    // Handle enrichment completion: always refetch fresh contact from database
    const handleEnrichmentComplete = useCallback(
        async (contactId: string) => {
            try {
                // Refetch fresh contact details from database
                setIsViewContactLoading(true);
                const response = await errorHandler.fetchWithRetry(
                    `/api/media-contacts/${contactId}`,
                    {method: 'GET', cache: 'no-store'},
                    {maxRetries: 1},
                );
                const result = errorHandler.handleResponse(response, {
                    showSuccessToast: false,
                    showErrorToast: false,
                });
                if (result.success && result.data?.contact) {
                    setViewingContact(
                        adaptApiContactToTableItem(result.data.contact),
                    );
                }

                // Trigger table refresh to reflect updated data in list
                setRefreshKey((prev) => prev + 1);

                toast.success('Enrichment applied', {
                    description: 'Contact details refreshed.',
                    duration: 3000,
                });
            } catch (err) {
                console.error('[ENRICH] Failed to refresh after apply:', err);
                toast.error('Applied, but failed to refresh contact');
            } finally {
                setIsViewContactLoading(false);
            }
        },
        [errorHandler],
    );

    // Debounced search implementation
    const [searchInput, setSearchInput] = useState('');

    // Debounce search term updates
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSearchTerm(searchInput);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchInput]);

    // Filter handlers
    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
    }, []);

    const handleCountryFilterChange = useCallback((countryIds: string[]) => {
        setSelectedCountryIds(countryIds);
        setCurrentPage(1);
    }, []);

    const handleBeatFilterChange = useCallback((beatIds: string[]) => {
        setSelectedBeatIds(beatIds);
        setCurrentPage(1);
    }, []);

    const handleOutletFilterChange = useCallback((outletIds: string[]) => {
        setSelectedOutletIds(outletIds);
        setCurrentPage(1);
    }, []);

    const handleRegionFilterChange = useCallback((regionCodes: string[]) => {
        setSelectedRegionCodes(regionCodes);
        setCurrentPage(1);
    }, []);

    const handleLanguageFilterChange = useCallback(
        (languageCodes: string[]) => {
            setSelectedLanguageCodes(languageCodes);
            setCurrentPage(1);
        },
        [],
    );

    const handleEmailVerifiedChange = useCallback(
        (value: 'all' | 'verified' | 'unverified') => {
            setEmailVerified(value);
            setCurrentPage(1);
        },
        [],
    );

    // Pagination handlers
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPageSize(newPageSize);
        setCurrentPage(1);
    }, []);

    const handleSortChange = useCallback(
        (
            newSortBy: string | undefined,
            newSortOrder: 'asc' | 'desc' | undefined,
        ) => {
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
            setCurrentPage(1); // Reset to first page when sorting changes
        },
        [],
    );

    if (isLoadingReference) {
        return (
            <div className='space-y-6'>
                <div className='flex items-center justify-center py-8'>
                    <div className='text-center space-y-2'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto' />
                        <p className='text-sm text-muted-foreground'>
                            Loading reference data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!referenceData) {
        return (
            <div className='space-y-6'>
                <div className='flex items-center justify-center py-12'>
                    <div className='text-center space-y-2'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto' />
                        <p className='text-sm text-muted-foreground'>
                            Preparing data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            {/* Page Header */}
            <div className='flex items-center justify-between'>
                <div>
                    <h2 className='text-3xl font-bold tracking-tight'>
                        Media Contacts
                    </h2>
                    <p className='text-muted-foreground'>
                        Manage your database of media contacts and journalists
                    </p>
                </div>
                <Button onClick={handleAddContact}>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Contact
                </Button>
            </div>

            {/* View Contact Sheet */}
            <ViewMediaContactSheet
                isOpen={isViewSheetOpen}
                onOpenChange={setIsViewSheetOpen}
                contact={viewingContact}
                isLoading={isViewContactLoading}
                onContactDelete={(contactId) => {
                    // Find the contact in allContacts by ID and call handleDeleteContact with the full contact
                    const contactToDelete = allContacts.find(
                        (contact) => contact.id === contactId,
                    );
                    if (contactToDelete) {
                        handleDeleteContact(contactToDelete);
                    } else {
                        // Fallback: if contact not found in allContacts, create a minimal contact object
                        handleDeleteContact({
                            id: contactId,
                        } as FastTableContact);
                    }
                }}
                onContactEdit={(contact) => {
                    // Convert MediaContactTableItem to FastTableContact
                    const fastTableContact: FastTableContact = {
                        id: contact.id,
                        name: contact.name,
                        email: contact.email,
                        title: contact.title,
                        email_verified_status:
                            contact.emailVerified ??
                            contact.email_verified_status ??
                            false,
                        updated_at:
                            typeof contact.updated_at === 'string'
                                ? contact.updated_at
                                : contact.updated_at?.toISOString() ||
                            new Date().toISOString(),
                        outlets: contact.outlets || [],
                        beats: contact.beats || [],
                        ai_beats: contact.ai_beats,
                        countries: contact.countries || [],
                        regions: contact.regions || [],
                        languages: (contact.languages || [])
                            .filter((lang) => lang.id)
                            .map((lang) => ({
                                id: lang.id!,
                                name: lang.name,
                                code: lang.code,
                            })),
                        outletCount: contact.outletCount || 0,
                        beatCount: contact.beatCount || 0,
                        countryCount: contact.countryCount || 0,
                        regionCount: contact.regionCount || 0,
                        languageCount: contact.languageCount || 0,
                    };
                    handleEditContact(fastTableContact);
                }}
            />

            {/* Update Contact Sheet */}
            <UpdateMediaContactSheet
                isOpen={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
                contact={editingContact || undefined}
                onSuccess={handleContactSaved}
                countries={referenceData?.countries || []}
                beats={referenceData?.beats || []}
            />

            {/* Filters */}
            <ApiMediaContactsFilters
                searchTerm={searchInput}
                onSearchChange={handleSearchChange}
                selectedCountryIds={selectedCountryIds}
                onCountryFilterChange={handleCountryFilterChange}
                selectedBeatIds={selectedBeatIds}
                onBeatFilterChange={handleBeatFilterChange}
                selectedOutletIds={selectedOutletIds}
                onOutletFilterChange={handleOutletFilterChange}
                selectedRegionCodes={selectedRegionCodes}
                onRegionFilterChange={handleRegionFilterChange}
                selectedLanguageCodes={selectedLanguageCodes}
                onLanguageFilterChange={handleLanguageFilterChange}
                emailVerified={emailVerified}
                onEmailVerifiedChange={handleEmailVerifiedChange}
                countries={(referenceData?.countries || []).map((c) => ({
                    ...c,
                    label: c.name,
                }))}
                beats={(referenceData?.beats || []).map((b) => ({
                    ...b,
                    label: b.name,
                }))}
                outlets={(referenceData?.outlets || []).map((o) => ({
                    ...o,
                    label: o.name,
                }))}
                regions={(referenceData?.regions || []).map((r) => ({
                    ...r,
                    label: r.name,
                }))}
                languages={(referenceData?.languages || []).map((l) => ({
                    ...l,
                    label: l.name,
                }))}
            />

            {/* Table */}
            <FastMediaContactsTable
                searchTerm={searchTerm}
                countryIds={selectedCountryIds}
                beatIds={selectedBeatIds}
                outletIds={selectedOutletIds}
                regionCodes={selectedRegionCodes}
                languageCodes={selectedLanguageCodes}
                emailVerified={emailVerified}
                page={currentPage}
                pageSize={pageSize}
                refreshKey={refreshKey}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onEditContact={handleEditContact}
                onDeleteContact={handleDeleteContact}
                onViewContact={handleViewContact}
                onDataChange={setTotalCount}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onDataUpdate={setAllContacts}
                onSortChange={handleSortChange}
            />

            {/* Bulk Actions Bar */}
            <BulkActionsBar
                selectedIds={selectedIds}
                totalSelected={selectedCount}
                onClearSelection={clearSelection}
                onBulkDelete={handleBulkDelete}
                onBulkExport={handleBulkExport}
                onBulkTag={handleBulkTag}
            />
        </div>
    );
}
