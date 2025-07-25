"use client";

// Core React and Next.js imports
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';

// UI Components
import { toast } from "sonner";
import { MediaContactsTable } from '@/components/features/media-contacts/media-contacts-table';
import { MediaContactsFilters } from '@/components/features/media-contacts/media-contacts-filters';
import { UpdateMediaContactSheet } from '@/components/features/media-contacts/update-media-contact-sheet';
import { ViewMediaContactSheet } from '@/components/features/media-contacts/view-media-contact-sheet';
import AppBrandHeader from '@/components/features/media-contacts/app-brand-header';

// CSVIntegrationWrapper removed - functionality moved to breadcrumb buttons

// Import types with explicit type imports to avoid conflicts
import type { MediaContactTableItem, Country, Beat, Outlet } from './columns';
import type { Region as RegionType, Language as CountryLanguage } from '@/lib/country-data';
import type { Language as LanguageType } from '@/lib/language-data';

// Import server actions with proper typing
import { 
  getMediaContactsAction,
  getCountries,
  getBeats,
  getAllRegions,
  getAllLanguages
} from '@/lib/actions/media-contacts';

// Define backend types for data transformation
interface BackendCountry {
  id: string;
  name: string;
  code?: string | null | undefined; // Make optional to match server action return type
  regions?: Array<{ code: string; name: string }> | null; // Optional and can be null
  languages?: Array<{ code: string; name: string }> | null; // Optional and can be null
}

interface BackendBeat {
  id: string;
  name: string;
  description?: string | null | undefined; // Optional
}

// Type for filtering media contacts, used by the server action and client-side calls
interface MediaContactFilters {
  page: number;
  pageSize: number;
  searchTerm: string;
  countryIds: string[];
  beatIds: string[];
  regionCodes: string[];
  languageCodes: string[];
  emailVerified: 'all' | 'verified' | 'unverified';
}

type EmailVerificationStatus = 'all' | 'verified' | 'unverified';

interface MediaContactsState {
  contacts: MediaContactTableItem[];
  filteredContacts: MediaContactTableItem[];
  allCountries: Country[];
  allBeats: Beat[];
  allRegions: RegionType[];
  allLanguages: LanguageType[];
  isLoading: boolean;
  isInitialized: boolean;
  isViewSheetOpen: boolean;
  viewingContact: MediaContactTableItem | null;
  isEditSheetOpen: boolean;
  editingContact: MediaContactTableItem | null; // For Add/Edit sheet
  isDeleteConfirmationOpen: boolean; // For delete confirmation dialog
  contactToDelete: MediaContactTableItem | null; // For delete confirmation
  error: string | null;
  errorType: string | null; // For specific error types: DB_NOT_CONNECTED, NO_CONTACTS_FOUND, etc.
  searchTerm: string;
  selectedCountryIds: string[];
  selectedBeatIds: string[];
  selectedRegionCodes: string[];
  selectedLanguageCodes: string[];
  emailVerified: EmailVerificationStatus;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  selectedContact: MediaContactTableItem | null; // General selected contact, possibly redundant with viewing/editing/deleting
  // Specific dropdown open states
  isCountryDropdownOpen: boolean;
  isBeatDropdownOpen: boolean;
  isRegionDropdownOpen: boolean;
  isLanguageDropdownOpen: boolean;
  isEmailVerifiedDropdownOpen: boolean;
  searchFilterCountryTerm: string;
  searchFilterBeatTerm: string;
  searchFilterRegionTerm: string;
  searchFilterLanguageTerm: string;
}

/**
 * Props interface for MediaContactsClientView component
 * Following Rust-inspired explicit typing and documentation
 */
interface MediaContactsClientViewProps {
  initialContacts: MediaContactTableItem[];
  initialTotalCount: number;
  initialPage?: number;
  initialPageSize?: number;
}

/**
 * Client-side component for displaying and managing media contacts
 * Implements Rust-inspired principles with explicit types and fail-fast validation
 */
export default function MediaContactsClientView({
  initialContacts = [],
  initialTotalCount = 0,
  initialPage = 1,
  initialPageSize = 10,
}: MediaContactsClientViewProps): React.ReactElement {
  const router = useRouter();
  const firstRenderRef = useRef(true);
  const prevSearchTermRef = useRef('');

  // Initialize state with default values and initial data
  const [state, setState] = useState<MediaContactsState>(() => ({
    contacts: initialContacts,
    filteredContacts: [],
    allCountries: [],
    allBeats: [],
    allRegions: [],
    allLanguages: [],
    isLoading: false,
    isInitialized: false,
    isViewSheetOpen: false,
    viewingContact: null,
    isEditSheetOpen: false,
    editingContact: null,
    isDeleteConfirmationOpen: false,
    contactToDelete: null,
    error: null,
    errorType: null,
    searchTerm: '',
    selectedCountryIds: [],
    selectedBeatIds: [],
    selectedRegionCodes: [],
    selectedLanguageCodes: [],
    emailVerified: 'all',
    currentPage: initialPage,
    pageSize: initialPageSize || 10,
    totalCount: initialTotalCount,
    selectedContact: null,
    isCountryDropdownOpen: false,
    isBeatDropdownOpen: false,
    isRegionDropdownOpen: false,
    isLanguageDropdownOpen: false,
    isEmailVerifiedDropdownOpen: false,
    searchFilterCountryTerm: '',
    searchFilterBeatTerm: '',
    searchFilterRegionTerm: '',
    searchFilterLanguageTerm: '',
  }));

  // Single, well-typed state update function with proper type safety
  const updateState = useCallback((
    updates: Partial<MediaContactsState> | ((prevState: MediaContactsState) => Partial<MediaContactsState>)
  ) => {
    setState((prevState: MediaContactsState) => {
      // Handle both direct updates and functional updates
      const updatesObject = typeof updates === 'function' 
        ? updates(prevState) 
        : updates;
      
      // Create the new state by merging previous state with the updatesObject
      // This handles immutability for top-level properties.
      // If MediaContactsState contains nested objects/arrays that are partially updated,
      // ensure updatesObject provides new references for those nested structures.
      const newState = { ...prevState, ...updatesObject };
      
      return newState;
    });
  }, []);

  // Memoize derived values
  const activeFiltersCount = useMemo(() => {
    return [
      state.selectedCountryIds.length > 0,
      state.selectedBeatIds.length > 0,
      state.selectedRegionCodes.length > 0,
      state.selectedLanguageCodes.length > 0,
      state.emailVerified !== 'all'
    ].filter(Boolean).length;
  }, [state.selectedCountryIds, state.selectedBeatIds, state.selectedRegionCodes, state.selectedLanguageCodes, state.emailVerified]);


  /**
   * Fetch filtered contacts from the backend using the dedicated API endpoint
   */
  const fetchFilteredContacts = useCallback(async (filters: Partial<MediaContactFilters> = {}): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null, errorType: null });
      
      // Merge default filters from state with provided ones
      const mergedFilters = {
        page: filters.page ?? state.currentPage,
        pageSize: filters.pageSize ?? state.pageSize,
        searchTerm: filters.searchTerm ?? state.searchTerm,
        countryIds: filters.countryIds ?? state.selectedCountryIds,
        beatIds: filters.beatIds ?? state.selectedBeatIds,
        regionCodes: filters.regionCodes ?? state.selectedRegionCodes,
        languageCodes: filters.languageCodes ?? state.selectedLanguageCodes,
        emailVerified: filters.emailVerified ?? state.emailVerified
      };
      
      console.log('Fetching contacts with filters:', mergedFilters);
      
      // Build URL with query parameters for the API call
      const queryParams = new URLSearchParams();
      
      // Add search term if present
      if (mergedFilters.searchTerm) {
        queryParams.append('searchTerm', mergedFilters.searchTerm);
      }
      
      // Add pagination parameters
      queryParams.append('page', mergedFilters.page.toString());
      queryParams.append('pageSize', mergedFilters.pageSize.toString());
      
      // Add email verification filter
      queryParams.append('emailVerified', mergedFilters.emailVerified);
      
      // Add array parameters
      mergedFilters.countryIds.forEach(id => queryParams.append('countryId', id));
      mergedFilters.beatIds.forEach(id => queryParams.append('beatId', id));
      mergedFilters.regionCodes.forEach(code => queryParams.append('regionCode', code));
      mergedFilters.languageCodes.forEach(code => queryParams.append('languageCode', code));
      
      // Make the API call with enhanced error handling
      console.log('Fetching media contacts with params:', queryParams.toString());
      const response = await fetch(`/api/media-contacts?${queryParams.toString()}`);
      
      if (!response.ok) {
        // Clone the response for detailed debugging
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        console.error('API error response status:', response.status);
        console.error('API error raw response:', responseText);
        
        // Try to parse as JSON if possible
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('API returned error data:', errorData);
        } catch (e) {
          console.error('API returned non-JSON error response');
          errorData = { error: `Server error (${response.status}): ${responseText.substring(0, 100)}...`, errorType: 'PARSE_ERROR' };
        }
        
        // Show appropriate toast notification based on error type
        if (errorData.errorType === 'DB_NOT_CONNECTED') {
          toast.error('Database connection error. Please try again later or contact support.');
        } else if (errorData.errorType === 'NO_CONTACTS_FOUND') {
          toast.error('No contacts found. Try adjusting your filters or adding new contacts.');
        } else if (errorData.errorType === 'AUTH_ERROR') {
          toast.error('Authentication error. Please log in again.');
          // Redirect to login page after a short delay
          setTimeout(() => router.push('/login'), 2000);
        } else {
          toast.error(`Error: ${errorData.error || 'Failed to fetch contacts'} (${response.status})`);
        }
        
        updateState({
          error: errorData.error || `Failed to fetch media contacts (Status: ${response.status})`,
          errorType: errorData.errorType || 'API_ERROR',
          isLoading: false,
          contacts: [],
          filteredContacts: [],
          totalCount: 0
        });
        return;
      }
      
      // Parse successful response
      const result = await response.json();
      
      // Update state with the fetched data
      updateState({
        contacts: result.contacts,
        filteredContacts: result.contacts,
        totalCount: result.totalCount,
        currentPage: mergedFilters.page,
        pageSize: mergedFilters.pageSize,
        isLoading: false,
        error: null,
        errorType: null
      });
    } catch (error) {
      // Catch-all for network errors or unexpected issues in the try block
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while fetching contacts.';
      
      console.error('Error fetching contacts:', error);
      
      // Provide more specific error messages based on error patterns
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
        toast.error('Network error: Unable to connect to the server. Please check your connection and try again.');
      } else if (errorMessage.includes('timeout')) {
        toast.error('Request timed out. The server is taking too long to respond. Please try again later.');
      } else {
        toast.error(errorMessage);
      }
      
      // Update state with error and reset data
      updateState({
        error: errorMessage,
        errorType: 'UNKNOWN_ERROR',
        isLoading: false,
        contacts: [],
        filteredContacts: [],
        totalCount: 0
      });
    } finally {
      // Ensure isLoading is always reset, even if an error occurs before updateState is called in try/catch
      updateState({ isLoading: false });
    }
  }, [state.currentPage, state.pageSize, state.searchTerm, state.selectedCountryIds, state.selectedBeatIds, state.selectedRegionCodes, state.selectedLanguageCodes, state.emailVerified, updateState]);

  /**
   * Count the number of active filters
   * Following Rust-inspired explicit function definition
   */
  const countActiveFilters = (): number => {
    let count = 0;
    if (state.selectedCountryIds.length > 0) count++;
    if (state.selectedBeatIds.length > 0) count++;
    if (state.selectedRegionCodes.length > 0) count++;
    if (state.selectedLanguageCodes.length > 0) count++;
    if (state.emailVerified !== 'all') count++;
    if (state.searchTerm.trim() !== '') count++;
    return count;
  };

  // Function to convert raw filter data to option objects for dropdown components
  // This follows Rust-inspired principles with explicit transformation
  const transformBackendCountries = useCallback((backendCountriesRaw: unknown): Country[] => {
    if (!Array.isArray(backendCountriesRaw)) return [];
    // Filter raw input to ensure items are objects with id and name, resembling BackendCountry
    const backendCountries = backendCountriesRaw.filter(
      (item: unknown): item is BackendCountry => 
        item !== null && typeof item === 'object' && 'id' in item && 'name' in item
    ) as BackendCountry[];

    return backendCountries
      .map((backendCountry: BackendCountry): Country | null => {
        try {
          if (!backendCountry || typeof backendCountry !== 'object') return null;
          const { id, name, code, regions: backendRegions, languages: backendLanguages } = backendCountry;

          if (typeof id !== 'string' || typeof name !== 'string') {
            console.warn(`Invalid country data: id or name is not a string. ID: ${id}, Name: ${name}`);
            return null;
          }

          const transformedCountry: Country = {
            id,
            name,
            code: (typeof code === 'string' && code) ? code : '',
            regions: (Array.isArray(backendRegions) && backendRegions.length > 0)
              ? backendRegions
                  .filter((r): r is { code: string; name: string } => 
                    r !== null && typeof r === 'object' && 
                    typeof r.code === 'string' && typeof r.name === 'string'
                  )
                  .map(r => ({ code: r.code, name: r.name })) // Ensure only code and name are passed
              : undefined, // Use undefined if not a valid, non-empty array
            languages: (Array.isArray(backendLanguages) && backendLanguages.length > 0)
              ? backendLanguages
                  .filter((l): l is { code: string; name: string } =>
                    l !== null && typeof l === 'object' &&
                    typeof l.code === 'string' && typeof l.name === 'string'
                  )
                  .map(l => ({ code: l.code, name: l.name })) // Ensure only code and name are passed
              : undefined, // Use undefined if not a valid, non-empty array
          };
          return transformedCountry;
        } catch (error) {
          console.error('Error transforming country:', backendCountry, error);
          return null;
        }
      })
      .filter((country): country is Country => country !== null);
  }, []);

  const transformBackendBeats = useCallback((beats: unknown): Beat[] => {
    if (!Array.isArray(beats)) return [];

    return (beats as any[])
      .map(beat => {
        try {
          if (!beat || typeof beat !== 'object') return null;
          const { id, name, description } = beat as any;

          if (typeof id !== 'string' || typeof name !== 'string') return null;

          return {
            id,
            name,
            ...(typeof description === 'string' && { description })
          };
        } catch (error) {
          console.error('Error transforming beat:', beat, error);
          return null;
        }
      })
      .filter((beat): beat is Beat => beat !== null);
  }, []);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        updateState({ isLoading: true });

        // Fetch all data in parallel with error handling for each request
        const [countries, beats, regions, languages] = await Promise.all([
          getCountries().catch(() => []),
          getBeats().catch(() => []),
          getAllRegions().catch(() => []),
          getAllLanguages().catch(() => []),
        ]);

        if (!isMounted) return;

        // Transform backend data to frontend types
        const transformedCountries = transformBackendCountries(countries);
        const transformedBeats = transformBackendBeats(beats);

        updateState({
          allCountries: transformedCountries,
          allBeats: transformedBeats,
          allRegions: regions as RegionType[],
          allLanguages: languages as LanguageType[],
          isInitialized: true,
          isLoading: false
        });

        // Fetch initial contacts with default filters
        await fetchFilteredContacts({
          page: initialPage,
          pageSize: initialPageSize || 10,
          searchTerm: '',
          countryIds: [],
          beatIds: [],
          regionCodes: [],
          languageCodes: [],
          emailVerified: 'all' as const
        });
      } catch (err) {
        if (!isMounted) return;

        console.error('Error fetching initial data:', err);
        updateState({
          error: 'Failed to load initial data',
          isLoading: false
        });
      }
    };

    if (!state.isInitialized) {
      fetchInitialData();
    }

    return () => {
      isMounted = false; // Correct cleanup for fetchInitialData
    };
  }, [state.isInitialized, fetchFilteredContacts, transformBackendCountries, transformBackendBeats, initialPage, initialPageSize, updateState]);

  // Listen for refresh events from CSV import
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Received refresh-media-contacts event, refreshing data...');
      fetchFilteredContacts({
        page: state.currentPage,
        pageSize: state.pageSize,
        searchTerm: state.searchTerm,
        countryIds: state.selectedCountryIds,
        beatIds: state.selectedBeatIds,
        regionCodes: state.selectedRegionCodes,
        languageCodes: state.selectedLanguageCodes,
        emailVerified: state.emailVerified,
      });
    };

    window.addEventListener('refresh-media-contacts', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-media-contacts', handleRefresh);
    };
  }, [fetchFilteredContacts, state.currentPage, state.pageSize, state.searchTerm, state.selectedCountryIds, state.selectedBeatIds, state.selectedRegionCodes, state.selectedLanguageCodes, state.emailVerified]);

  // Handle filter changes and pagination
  useEffect(() => {
    if (firstRenderRef.current) {
      // On the very first render after initialization, fetchInitialData has already fetched.
      // We set firstRenderRef to false after this first pass to enable subsequent runs.
      firstRenderRef.current = false;
      return;
    }

    // This effect handles changes to filters (dropdowns, emailVerified) and pagination (currentPage, pageSize).
    fetchFilteredContacts({
      page: state.currentPage,
      pageSize: state.pageSize,
      searchTerm: state.searchTerm, // Include searchTerm for consistency when other filters change
      countryIds: state.selectedCountryIds,
      beatIds: state.selectedBeatIds,
      regionCodes: state.selectedRegionCodes,
      languageCodes: state.selectedLanguageCodes,
      emailVerified: state.emailVerified
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // state.searchTerm is now EXCLUDED from this dependency array because debounced search handles it.
    // Including it here would cause redundant fetches when searchTerm changes.
    state.currentPage, 
    state.pageSize, 
    state.selectedCountryIds, 
    state.selectedBeatIds, 
    state.selectedRegionCodes, 
    state.selectedLanguageCodes, 
    state.emailVerified, 
    fetchFilteredContacts, 
    state.isInitialized
  ]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    updateState({ pageSize: newPageSize, currentPage: 1 }); // Reset to page 1 on page size change
  }, [updateState]);

  const handleEmailVerifiedFilterChange = useCallback((value: EmailVerificationStatus) => {
    updateState({ emailVerified: value, currentPage: 1 });
  }, [updateState]);

  const handleSetSearchFilterCountryTerm = useCallback((term: string) => {
    updateState({ searchFilterCountryTerm: term });
  }, [updateState]);

  const handleSetSearchFilterBeatTerm = useCallback((term: string) => {
    updateState({ searchFilterBeatTerm: term });
  }, [updateState]);

  const handleSetSearchFilterRegionTerm = useCallback((term: string) => {
    updateState({ searchFilterRegionTerm: term });
  }, [updateState]);

  const handleSetSearchFilterLanguageTerm = useCallback((term: string) => {
    updateState({ searchFilterLanguageTerm: term });
  }, [updateState]);

  const handleDataRefresh = useCallback(() => {
    // Show loading toast to indicate refresh is in progress
    const loadingToast = toast.loading('Refreshing data...');
    
    // Reset error state before fetching
    updateState({ error: null, errorType: null });
    
    fetchFilteredContacts({
      page: state.currentPage,
      pageSize: state.pageSize,
      searchTerm: state.searchTerm,
      countryIds: state.selectedCountryIds,
      beatIds: state.selectedBeatIds,
      regionCodes: state.selectedRegionCodes,
      languageCodes: state.selectedLanguageCodes,
      emailVerified: state.emailVerified,
    })
      .then(() => {
        // Dismiss loading toast and show success message if no error in state
        toast.dismiss(loadingToast);
        if (!state.error) {
          toast.success('Data refreshed successfully');
        }
      })
      .catch(() => {
        // Error is already handled in fetchFilteredContacts, just dismiss the loading toast
        toast.dismiss(loadingToast);
      });
  }, [fetchFilteredContacts, state.currentPage, state.pageSize, state.searchTerm, state.selectedCountryIds, state.selectedBeatIds, state.selectedRegionCodes, state.selectedLanguageCodes, state.emailVerified, state.error, updateState]);

  // Event Handlers using useCallback and centralized state management
  const handleSearchTermChange = useCallback((term: string) => {
    updateState({ searchTerm: term });
  }, [updateState]);

  const handleClearAllFilters = useCallback(() => {
    updateState({
      selectedCountryIds: [],
      selectedBeatIds: [],
      selectedRegionCodes: [],
      selectedLanguageCodes: [],
      emailVerified: 'all',
      searchTerm: '', // Also clear the main search term
      currentPage: 1, // Reset to first page
    });
  }, [updateState]);

  const handleAddContactOpen = useCallback(() => {
    updateState({ 
      isEditSheetOpen: true, 
      editingContact: null, 
      isViewSheetOpen: false 
    });
  }, [updateState]);

  const handleEditContactOpen = useCallback((contact: MediaContactTableItem) => {
    updateState({ 
      editingContact: contact, 
      isEditSheetOpen: true, 
      isViewSheetOpen: false 
    });
  }, [updateState]);

  const handleViewContact = useCallback((contact: MediaContactTableItem) => {
    updateState({ 
      viewingContact: contact, 
      isViewSheetOpen: true, 
      isEditSheetOpen: false 
    });
  }, [updateState]);

  const handleDeleteContactInitiation = useCallback((contact: MediaContactTableItem) => {
    updateState({ 
      contactToDelete: contact, 
      isDeleteConfirmationOpen: true 
    });
  }, [updateState]);

  const handleConfirmDeleteContact = useCallback(async () => {
    if (!state.contactToDelete) return;
    try {
      // await deleteMediaContactAction(state.contactToDelete.id); // Assuming an action exists
      toast.success(`Contact ${state.contactToDelete.name} deleted successfully`);
      updateState({ 
        contacts: state.contacts.filter(c => c.id !== state.contactToDelete!.id),
        totalCount: state.totalCount -1,
        contactToDelete: null, 
        isDeleteConfirmationOpen: false 
      });
      // Optionally, re-fetch contacts if deletion affects pagination or overall list integrity significantly
      // fetchFilteredContacts({ page: state.currentPage, pageSize: state.pageSize, ...collectCurrentFilters() });
    } catch (error) {
      toast.error(`Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
      updateState({ contactToDelete: null, isDeleteConfirmationOpen: false });
    }
  }, [state.contacts, state.contactToDelete, state.totalCount, updateState]); // Removed fetchFilteredContacts from deps to avoid re-fetching unless explicitly needed

  const handleDeleteContactFromSheet = useCallback((contactId: string) => {
    if (state.viewingContact && state.viewingContact.id === contactId) {
      handleDeleteContactInitiation(state.viewingContact);
    } else {
      // Fallback or error handling if the viewingContact doesn't match, though unlikely in this flow
      console.warn('Mismatch between contactId for deletion and currently viewed contact.');
      // Optionally, find the contact in state.contacts if necessary, but this path implies deletion from the view sheet.
      const contactToDel = state.contacts.find(c => c.id === contactId);
      if (contactToDel) {
        handleDeleteContactInitiation(contactToDel);
      }
    }
  }, [state.viewingContact, state.contacts, handleDeleteContactInitiation]);

  const handleContactUpserted = useCallback((upsertedContact: MediaContactTableItem) => {
    // This function is called when a contact is successfully added or updated.
    // Re-fetch the current page to reflect changes.
    fetchFilteredContacts({
      page: state.currentPage,
      pageSize: state.pageSize,
      searchTerm: state.searchTerm,
      countryIds: state.selectedCountryIds,
      beatIds: state.selectedBeatIds,
      regionCodes: state.selectedRegionCodes,
      languageCodes: state.selectedLanguageCodes,
      emailVerified: state.emailVerified,
    });
    updateState({ isEditSheetOpen: false, editingContact: null });
  }, [
    fetchFilteredContacts, 
    state.currentPage, 
    state.pageSize, 
    state.searchTerm, 
    state.selectedCountryIds, 
    state.selectedBeatIds, 
    state.selectedRegionCodes, 
    state.selectedLanguageCodes, 
    state.emailVerified, 
    updateState
  ]);

const handleSetSelectedCountryIds = useCallback((value: React.SetStateAction<string[]>) => {
  updateState(prevState => {
    const newIds = typeof value === 'function' ? value(prevState.selectedCountryIds) : value;
    return { ...prevState, selectedCountryIds: newIds, currentPage: 1 };
  });
}, [updateState]);

const handleSetSelectedBeatIds = useCallback((value: React.SetStateAction<string[]>) => {
  updateState(prevState => {
    const newIds = typeof value === 'function' ? value(prevState.selectedBeatIds) : value;
    return { ...prevState, selectedBeatIds: newIds, currentPage: 1 };
  });
}, [updateState]);

const handleSetSelectedRegionCodes = useCallback((value: React.SetStateAction<string[]>) => {
  updateState(prevState => {
    const newCodes = typeof value === 'function' ? value(prevState.selectedRegionCodes) : value;
    return { ...prevState, selectedRegionCodes: newCodes, currentPage: 1 };
  });
}, [updateState]);

const handleSetSelectedLanguageCodes = useCallback((value: React.SetStateAction<string[]>) => {
  updateState(prevState => {
    const newCodes = typeof value === 'function' ? value(prevState.selectedLanguageCodes) : value;
    return { ...prevState, selectedLanguageCodes: newCodes, currentPage: 1 };
  });
}, [updateState]);

// ...
const countryOptions = useMemo(() => state.allCountries.map(c => ({ value: c.id, label: c.name })), [state.allCountries]);
const beatOptions = useMemo(() => state.allBeats.map(b => ({ value: b.id, label: b.name })), [state.allBeats]);
const regionOptions = useMemo(() => state.allRegions.map(r => ({ value: r.code, label: r.name })), [state.allRegions]);
const languageOptions = useMemo(() => state.allLanguages.map(l => ({ value: l.code, label: l.name })), [state.allLanguages]);

if (!state.isInitialized) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-2xl">Loading Media Contacts...</div> {/* Replace with a proper spinner/skeleton */} 
    </div>
  );
}

if (state.error) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-2xl">Error: {state.error}</div>
    </div>
  );
}

// Main component render
return (
  <div className="flex flex-col min-h-screen w-full">
    <div className="container mx-auto pb-6 space-y-4 md:space-y-6">
      {/* Button group 2 removed - functionality moved to breadcrumb buttons */}
      <MediaContactsFilters
        mainSearchTerm={state.searchTerm}
        setMainSearchTerm={handleSearchTermChange} // Direct change handler for input
        // Debouncing is handled by useEffect watching state.searchTerm
        isLoading={state.isLoading}
        // Country Filter
        allCountries={state.allCountries}
        selectedCountryIds={state.selectedCountryIds}
        setSelectedCountryIds={handleSetSelectedCountryIds}
        isCountryDropdownOpen={state.isCountryDropdownOpen}
        setIsCountryDropdownOpen={(isOpen: boolean) => updateState({ isCountryDropdownOpen: isOpen })}
        searchFilterCountryTerm={state.searchFilterCountryTerm}
        setSearchFilterCountryTerm={handleSetSearchFilterCountryTerm}
        countryOptions={state.allCountries}
        // Beat Filter
        allBeats={state.allBeats}
        selectedBeatIds={state.selectedBeatIds}
        setSelectedBeatIds={handleSetSelectedBeatIds}
        isBeatDropdownOpen={state.isBeatDropdownOpen}
        setIsBeatDropdownOpen={(isOpen: boolean) => updateState({ isBeatDropdownOpen: isOpen })}
        searchFilterBeatTerm={state.searchFilterBeatTerm}
        setSearchFilterBeatTerm={handleSetSearchFilterBeatTerm}
        beatOptions={state.allBeats}
        // Region Filter
        allRegions={state.allRegions}
        selectedRegionCodes={state.selectedRegionCodes}
        setSelectedRegionCodes={handleSetSelectedRegionCodes}
        isRegionDropdownOpen={state.isRegionDropdownOpen}
        setIsRegionDropdownOpen={(isOpen: boolean) => updateState({ isRegionDropdownOpen: isOpen })}
        searchFilterRegionTerm={state.searchFilterRegionTerm}
        setSearchFilterRegionTerm={handleSetSearchFilterRegionTerm}
        regionOptions={state.allRegions}
        // Language Filter
        allLanguages={state.allLanguages}
        selectedLanguageCodes={state.selectedLanguageCodes}
        setSelectedLanguageCodes={handleSetSelectedLanguageCodes}
        isLanguageDropdownOpen={state.isLanguageDropdownOpen}
        setIsLanguageDropdownOpen={(isOpen: boolean) => updateState({ isLanguageDropdownOpen: isOpen })}
        searchFilterLanguageTerm={state.searchFilterLanguageTerm}
        setSearchFilterLanguageTerm={handleSetSearchFilterLanguageTerm}
        languageOptions={state.allLanguages}
        // Email Verified Filter
        emailVerifiedFilter={state.emailVerified}
        setEmailVerifiedFilter={handleEmailVerifiedFilterChange}
        isEmailVerifiedDropdownOpen={state.isEmailVerifiedDropdownOpen}
        setIsEmailVerifiedDropdownOpen={(isOpen: boolean) => updateState({ isEmailVerifiedDropdownOpen: isOpen })}
        // Actions
        activeFiltersCount={() => activeFiltersCount} // Pass a function that returns the memoized value
        clearAllFilters={handleClearAllFilters}
      />

      <div className="flex-grow overflow-auto">
        <MediaContactsTable
          data={state.contacts} // Use state.contacts which is updated by fetchFilteredContacts
          totalCount={state.totalCount}
          currentPage={state.currentPage}
          setCurrentPage={(page) => updateState({ currentPage: page })}
          pageSize={state.pageSize}
          setPageSize={(size) => updateState({ pageSize: size })}
          onEditContact={handleEditContactOpen} // For initiating delete from table row
          onViewContact={handleViewContact}
          onDataRefresh={handleDataRefresh}
          error={state.error} // Pass error message to table component
          errorType={state.errorType} // Pass error type to table component
        />
      </div>

      {state.isEditSheetOpen && (
        <UpdateMediaContactSheet
          isOpen={state.isEditSheetOpen}
          onOpenChange={(isOpen) => updateState({ isEditSheetOpen: isOpen, editingContact: isOpen ? state.editingContact : null })}
          contact={state.editingContact}
          onContactUpdate={handleContactUpserted} // Pass full Beat objects
        />
      )}

      {state.isViewSheetOpen && state.viewingContact && (
        <ViewMediaContactSheet
          isOpen={state.isViewSheetOpen}
          onOpenChange={(isOpen) => updateState({ isViewSheetOpen: isOpen, viewingContact: isOpen ? state.viewingContact : null })}
          contact={state.viewingContact} // Allow editing from view sheet // Allow deleting from view sheet
          onContactDelete={handleDeleteContactFromSheet}
          onContactEdit={handleEditContactOpen} // Callback after deletion from sheet
        />
      )}

      <div className="space-y-4">

        {/* Basic Delete Confirmation Dialog (Can be replaced with ShadCN Alert Dialog) */}
        {state.isDeleteConfirmationOpen && state.contactToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-xl">
              <h3 className="text-lg font-medium">Confirm Deletion</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Are you sure you want to delete {state.contactToDelete.name}?
              </p>
              <div className="mt-4 flex justify-end space-x-2">
                <button 
                  onClick={() => updateState({ isDeleteConfirmationOpen: false, contactToDelete: null })}
                  className="px-4 py-2 border rounded-md text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDeleteContact}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm hover:bg-destructive/90"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
