'use client';

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {toast} from 'sonner';
import {FastMediaContactsTable} from './fast-table';
import {ApiMediaContactsFilters} from './api-filters';
import {UpdateMediaContactSheet} from './update-media-contact-sheet';
import {ViewMediaContactSheet} from './view-media-contact-sheet';
import {
    ApiContact,
    ReferenceData,
    MediaContactTableItem,
    adaptApiContactToTableItem,
} from './types';
import {XCircle, RefreshCw} from 'lucide-react';

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
    // State
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [referenceData, setReferenceData] = useState<ReferenceData | null>(
        null,
    );
    const [isLoadingReference, setIsLoadingReference] = useState(true);
    const [referenceError, setReferenceError] = useState<string | null>(null);

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

    // Sheets
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [viewingContact, setViewingContact] =
        useState<MediaContactTableItem | null>(null);
    const [isViewContactLoading, setIsViewContactLoading] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [editingContact, setEditingContact] =
        useState<MediaContactTableItem | null>(null);
    
    // Add refresh key to trigger table reload
    const [refreshKey, setRefreshKey] = useState(0);

    // Load reference data once on mount
    useEffect(() => {
        const loadReferenceData = async () => {
            try {
                console.log('🚀 [API-CLIENT] Loading reference data...');
                const response = await fetch('/api/reference');

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`,
                    );
                }

                const data = await response.json();
                setReferenceData(data);
                console.log(
                    '✅ [API-CLIENT] Reference data loaded:',
                    data.performance,
                );
            } catch (error) {
                console.error(
                    '❌ [API-CLIENT] Failed to load reference data:',
                    error,
                );
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Failed to load reference data';
                setReferenceError(errorMessage);
                toast.error('Failed to load reference data', {
                    description:
                        'Some filters may not be available. Please refresh the page.',
                    duration: 5000,
                });
            } finally {
                setIsLoadingReference(false);
            }
        };

        loadReferenceData();
    }, []);

    // Handle contact actions
    const handleViewContact = useCallback(async (contact: ApiContact) => {
        // Open sheet immediately with basic contact info
        setViewingContact(adaptApiContactToTableItem(contact));
        setIsViewSheetOpen(true);
        setIsViewContactLoading(true);

        try {
            // Load full contact details asynchronously
            const response = await fetch(`/api/media-contacts/${contact.id}`);
            if (!response.ok) {
                throw new Error('Failed to load contact details');
            }

            const {contact: fullContact} = await response.json();
            // Update with full contact details
            setViewingContact(adaptApiContactToTableItem(fullContact));
        } catch (error) {
            console.error('Error loading contact details:', error);
            toast.error('Failed to load contact details');
            // Keep the sheet open with basic info even if full details fail to load
        } finally {
            setIsViewContactLoading(false);
        }
    }, []);

    const handleEditContact = useCallback(async (contact: ApiContact) => {
        try {
            // Load full contact details for editing
            const response = await fetch(`/api/media-contacts/${contact.id}`);
            if (!response.ok) {
                throw new Error('Failed to load contact details');
            }

            const {contact: fullContact} = await response.json();
            const adaptedContact = adaptApiContactToTableItem(fullContact);
            
            setEditingContact(adaptedContact);
            setIsEditSheetOpen(true);
        } catch (error) {
            console.error('Error loading contact for editing:', error);
            toast.error('Failed to load contact for editing');
        }
    }, []);

    const handleDeleteContact = useCallback(async (contact: ApiContact) => {
        if (!confirm(`Are you sure you want to delete ${contact.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/media-contacts/${contact.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete contact');
            }

            toast.success('Contact deleted successfully');

            // Trigger table refresh by incrementing refresh key
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Error deleting contact:', error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete contact',
            );
        }
    }, []);

    const handleAddContact = useCallback(() => {
        setEditingContact(null); // null means "add new"
        setIsEditSheetOpen(true);
    }, []);

    const handleContactSaved = useCallback(() => {
        // Close the edit sheet
        setIsEditSheetOpen(false);
        setEditingContact(null);

        // Trigger table refresh by incrementing refresh key
        setRefreshKey(prev => prev + 1);
        
        toast.success('Contact saved successfully');
    }, []);

    // Debounced search implementation
    const [searchInput, setSearchInput] = useState('');

    // Debounce search term updates
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSearchTerm(searchInput);
            setCurrentPage(1); // Reset to first page when searching
        }, 300); // 300ms debounce delay

        return () => clearTimeout(timeoutId);
    }, [searchInput]);

    // Filter handlers
    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value); // Update input immediately for UI responsiveness
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
        setCurrentPage(1); // Reset to first page when page size changes
    }, []);

    if (isLoadingReference) {
        return (
            <div className='space-y-6'>
                <div className='flex items-center justify-center py-12'>
                    <div className='text-center'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                        <p className='text-muted-foreground'>
                            Loading reference data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!referenceData) {
        if (referenceError) {
            return (
                <div className='space-y-6'>
                    <div className='flex items-center justify-center py-12'>
                        <div className='text-center space-y-4'>
                            <div className='flex flex-col items-center gap-2'>
                                <XCircle className='h-12 w-12 text-destructive' />
                                <h3 className='text-lg font-semibold text-destructive'>
                                    Failed to Load Reference Data
                                </h3>
                            </div>
                            <p className='text-sm text-muted-foreground max-w-md'>
                                {referenceError.includes('Failed to fetch')
                                    ? 'Unable to connect to the server. Please check your internet connection and try again.'
                                    : referenceError}
                            </p>
                            <div className='flex gap-2 justify-center'>
                                <button
                                    onClick={() => {
                                        setReferenceError(null);
                                        setIsLoadingReference(true);
                                        // Trigger a re-fetch by reloading the component
                                        window.location.reload();
                                    }}
                                    className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2'
                                >
                                    <RefreshCw className='h-4 w-4' />
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        // If no error but still no data, show loading
        return (
            <div className='space-y-6'>
                <div className='flex items-center justify-center py-12'>
                    <div className='text-center'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                        <p className='text-muted-foreground'>
                            Loading reference data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
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
                countries={referenceData.countries}
                beats={referenceData.beats}
                outlets={referenceData.outlets}
                regions={referenceData.regions}
                languages={referenceData.languages}
            />

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
                onEditContact={handleEditContact}
                onDeleteContact={handleDeleteContact}
                onViewContact={handleViewContact}
                onDataChange={setTotalCount}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />

            {/* View Contact Sheet */}
            <ViewMediaContactSheet
                isOpen={isViewSheetOpen}
                onOpenChange={(isOpen) => {
                    setIsViewSheetOpen(isOpen);
                    if (!isOpen) {
                        setIsViewContactLoading(false);
                        setViewingContact(null);
                    }
                }}
                contact={viewingContact}
                isLoading={isViewContactLoading}
                onContactEdit={(contact) => {
                    setEditingContact(contact);
                    setIsEditSheetOpen(true);
                    setIsViewSheetOpen(false); // Close the view sheet when opening edit
                }}
            />

            {/* Edit/Add Contact Sheet */}
            <UpdateMediaContactSheet
                isOpen={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
                contact={editingContact}
                onSuccess={handleContactSaved}
                countries={referenceData.countries}
                beats={referenceData.beats}
            />
        </div>
    );
}
