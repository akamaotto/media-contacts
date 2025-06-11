"use client";

// Core React and Next.js imports
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';

// UI Components
import { toast } from "sonner";
import { MediaContactsTable } from '@/components/media-contacts/media-contacts-table';
import { MediaContactsFilters } from '@/components/media-contacts/media-contacts-filters';
import { UpdateMediaContactSheet } from '@/components/media-contacts/update-media-contact-sheet';
import { ViewMediaContactSheet } from '@/components/media-contacts/view-media-contact-sheet';
import HeaderActionButtons from '@/components/media-contacts/header-action-buttons';
import AppBrandHeader from '@/components/media-contacts/app-brand-header';

// Import types with explicit type imports to avoid conflicts
import type { MediaContactTableItem, Country, Beat, Outlet } from './columns';
import type { Region as RegionType, Language as CountryLanguage } from '@/lib/country-data';
import type { Language as LanguageType } from '@/lib/language-data';

// Import server actions with proper typing
import { getMediaContactsAction } from '@/backend/media-contacts/actions';
import { getCountries } from '@/app/actions/country-actions';
import { getBeats } from '@/app/actions/beat-actions';
import { getAllRegions } from '@/app/actions/region-actions';
import { getAllLanguages } from '@/app/actions/language-actions';

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

  // State management with proper typing
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
   * Fetch filtered contacts from the backend
   */
  const fetchFilteredContacts = useCallback(async (filters: Partial<MediaContactFilters> = {}) => {
    try {
      updateState({ isLoading: true });
      
      // Merge default filters from state with provided ones
      const mergedFilters: MediaContactFilters = {
        page: filters.page ?? state.currentPage,
        pageSize: filters.pageSize ?? state.pageSize,
        searchTerm: filters.searchTerm ?? state.searchTerm,
        countryIds: filters.countryIds ?? state.selectedCountryIds,
        beatIds: filters.beatIds ?? state.selectedBeatIds,
        regionCodes: filters.regionCodes ?? state.selectedRegionCodes,
        languageCodes: filters.languageCodes ?? state.selectedLanguageCodes,
        emailVerified: filters.emailVerified ?? state.emailVerified,
      };
      
      const result = await getMediaContactsAction(mergedFilters);
      // Directly use the result as PaginatedMediaContactsActionResult
      updateState({
        contacts: result.contacts,
        // filteredContacts: result.contacts, // Decide if client-side filtering is still needed on top
        totalCount: result.totalCount,
        currentPage: mergedFilters.page,
        pageSize: mergedFilters.pageSize,
        isLoading: false,
        error: null
      });
    } catch (error) {
      // Catch-all for network errors or unexpected issues in the try block
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while fetching contacts.';
      console.error('Critical error fetching contacts:', error);
      updateState({
        isLoading: false,
        error: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      // Ensure isLoading is always reset, even if an error occurs before updateState is called in try/catch
      // This uses a functional update to ensure it's based on the latest state if multiple updates are queued.
      setState(prev => ({ ...prev, isLoading: false }));
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

  // useEffect for Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      // This effect triggers when state.searchTerm changes.
      // Fetch only if search term actually changed from the previous render's searchTerm.
      if (prevSearchTermRef.current !== state.searchTerm) {
        fetchFilteredContacts({
          page: 1, // Ensure page is reset for a new search term activity
          pageSize: state.pageSize,
          searchTerm: state.searchTerm,
          countryIds: state.selectedCountryIds,
          beatIds: state.selectedBeatIds,
          regionCodes: state.selectedRegionCodes,
          languageCodes: state.selectedLanguageCodes,
          emailVerified: state.emailVerified
        });
      }
      prevSearchTermRef.current = state.searchTerm; // Update ref for the next comparison
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [
    state.searchTerm, 
    // fetchFilteredContacts is included as a dependency because it's used in the effect.
    // Other state dependencies like pageSize, selectedCountryIds, etc., are also included 
    // because they are passed to fetchFilteredContacts, ensuring the fetch call uses their latest values.
    fetchFilteredContacts, 
    state.pageSize, 
    state.selectedCountryIds, 
    state.selectedBeatIds, 
    state.selectedRegionCodes, 
    state.selectedLanguageCodes, 
    state.emailVerified
  ]);

  // useEffect for Main Filter/Pagination Changes (excluding searchTerm debouncing)
  useEffect(() => {
    if (!state.isInitialized) {
      // Wait for initial data and filters to be loaded by fetchInitialData
      return;
    }
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
  }, [fetchFilteredContacts, state.currentPage, state.pageSize, state.searchTerm, state.selectedCountryIds, state.selectedBeatIds, state.selectedRegionCodes, state.selectedLanguageCodes, state.emailVerified]);

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

// Main component render
return (
<div className="flex flex-col min-h-screen bg-muted/40 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
  {/* Brand header and action buttons */}
  <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <AppBrandHeader />
    <HeaderActionButtons onAddContactOpen={handleAddContactOpen} />
  </header>

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
pageSize={state.pageSize}
onEditContact={handleEditContactOpen} // For initiating delete from table row
onViewContact={handleViewContact}
onDataRefresh={handleDataRefresh}
/>
</div>

{state.isEditSheetOpen && (
<UpdateMediaContactSheet
isOpen={state.isEditSheetOpen}
onOpenChange={(isOpen) => updateState({ isEditSheetOpen: isOpen, editingContact: isOpen ? state.editingContact : null })}
contact={state.editingContact}
onContactUpdate={handleContactUpserted}         // Pass full Beat objects
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
);
}
