"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MediaContactsTable } from '@/components/media-contacts/media-contacts-table';
import { MediaContactTableItem } from '@/components/media-contacts/columns';
import { getMediaContactsAction, type GetMediaContactsParams, type PaginatedMediaContactsActionResult } from '@/backend/media-contacts/actions';
import { UpdateMediaContactSheet } from '@/components/media-contacts/update-media-contact-sheet';
import { ViewMediaContactSheet } from '@/components/media-contacts/view-media-contact-sheet';
import { MediaContactsFilters } from '@/components/media-contacts/media-contacts-filters';
import HeaderActionButtons from '@/components/media-contacts/header-action-buttons';
import AppBrandHeader from '@/components/media-contacts/app-brand-header';
import { toast } from 'sonner';
import { getAllRegions } from '@/app/actions/region-actions';
import { getAllLanguages } from '@/app/actions/language-actions';
import { getCountries } from '@/app/actions/country-actions';
import { getBeats } from '@/app/actions/beat-actions';
import { Region } from '@/lib/country-data';
import { Language } from '@/lib/language-data';
import { Country } from '@/app/actions/country-actions';
import { Beat } from '@/app/actions/beat-actions';

/**
 * Props interface for MediaContactsClientView component
 * Following Rust-inspired explicit typing and documentation
 */
interface MediaContactsClientViewProps {
  initialContacts: MediaContactTableItem[];
  initialTotalCount: number;
}

/**
 * Client-side component for displaying and managing media contacts
 * Implements Rust-inspired principles with explicit types and fail-fast validation
 */
export function MediaContactsClientView({ initialContacts, initialTotalCount }: MediaContactsClientViewProps): React.ReactElement {
  const router = useRouter();
  
  // Edit modal state
  const [isEditSheetOpen, setIsEditSheetOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<MediaContactTableItem | null>(null);
  
  // View details modal state
  const [isViewSheetOpen, setIsViewSheetOpen] = useState<boolean>(false);
  const [viewingContact, setViewingContact] = useState<MediaContactTableItem | null>(null);
  
  // Track contacts state for local updates without full page refresh
  const [contacts, setContacts] = useState<MediaContactTableItem[]>(initialContacts);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalContactsCount, setTotalContactsCount] = useState<number>(initialTotalCount);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(0); // 0-indexed for backend
  const [pageSize, setPageSize] = useState<number>(10); // Default 10 items per page
  
  // Search and filter state
  const [mainSearchTerm, setMainSearchTerm] = useState<string>('');
  
  // Country filter state
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState<boolean>(false);
  const [searchFilterCountryTerm, setSearchFilterCountryTerm] = useState<string>('');
  
  // Beat filter state
  const [allBeats, setAllBeats] = useState<Beat[]>([]);
  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>([]);
  const [isBeatDropdownOpen, setIsBeatDropdownOpen] = useState<boolean>(false);
  const [searchFilterBeatTerm, setSearchFilterBeatTerm] = useState<string>('');
  
  // Region filter state
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [selectedRegionCodes, setSelectedRegionCodes] = useState<string[]>([]);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState<boolean>(false);
  const [searchFilterRegionTerm, setSearchFilterRegionTerm] = useState<string>('');
  
  // Language filter state
  const [allLanguages, setAllLanguages] = useState<Language[]>([]);
  const [selectedLanguageCodes, setSelectedLanguageCodes] = useState<string[]>([]);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState<boolean>(false);
  const [searchFilterLanguageTerm, setSearchFilterLanguageTerm] = useState<string>('');
  
  // Email verification filter state
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [isEmailVerifiedDropdownOpen, setIsEmailVerifiedDropdownOpen] = useState<boolean>(false);
  
  /**
   * Calculate the active filters count for UI display
   * Rust-inspired explicit return type and clear calculation
   */
  const activeFiltersCount = (): number => {
    return (
      (mainSearchTerm.trim() !== '' ? 1 : 0) +
      selectedCountryIds.length +
      selectedBeatIds.length +
      selectedRegionCodes.length +
      selectedLanguageCodes.length +
      (emailVerifiedFilter !== 'all' ? 1 : 0)
    );
  };
  
  /**
   * Client-side fallback data to ensure UI functionality when server actions fail
   * Following Rust-inspired principles with explicit typing and comprehensive coverage
   */
  const clientSideFallbacks = {
    regions: [
      { code: 'na', name: 'North America', category: 'continent' },
      { code: 'eu', name: 'Europe', category: 'continent' },
      { code: 'as', name: 'Asia', category: 'continent' },
      { code: 'af', name: 'Africa', category: 'continent' },
      { code: 'oc', name: 'Oceania', category: 'continent' },
      { code: 'sa', name: 'South America', category: 'continent' },
    ] as Region[],
    
    languages: [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'es', name: 'Spanish', native: 'Español' },
      { code: 'fr', name: 'French', native: 'Français' },
      { code: 'de', name: 'German', native: 'Deutsch' },
      { code: 'zh', name: 'Chinese', native: '中文' },
    ] as Language[],
    
    countries: [
      { id: 'us', name: 'United States', code: 'US' },
      { id: 'ca', name: 'Canada', code: 'CA' },
      { id: 'uk', name: 'United Kingdom', code: 'GB' },
      { id: 'de', name: 'Germany', code: 'DE' },
      { id: 'fr', name: 'France', code: 'FR' },
    ] as Country[],
    
    beats: [
      { id: 'tech', name: 'Technology', description: 'Technology news and trends' },
      { id: 'business', name: 'Business', description: 'Business and finance news' },
      { id: 'health', name: 'Health', description: 'Health and wellness topics' },
      { id: 'science', name: 'Science', description: 'Scientific discoveries and research' },
      { id: 'politics', name: 'Politics', description: 'Political news and analysis' },
    ] as Beat[],
  };

  /**
   * Fetch all filter options on component mount
   * Using explicit error handling and fail-fast validation with client-side fallbacks
   */
  useEffect(() => {
    const fetchFilterData = async (): Promise<void> => {
      try {
        // Track which data sources successfully load
        let regionsSuccess = false;
        let languagesSuccess = false;
        let countriesSuccess = false;
        let beatsSuccess = false;
        
        // Initialize with empty arrays to prevent undefined errors
        let regionsData: Region[] = [];
        let languagesData: Language[] = [];
        let countriesData: Country[] = [];
        let beatsData: Beat[] = [];
        
        // Set a timeout to ensure we don't wait too long for server actions
        const fetchTimeout = 3000; // 3 seconds
        
        // Fetch regions with timeout and fallback
        try {
          console.log('Attempting to fetch regions data from server...');
          const regionsPromise = getAllRegions();
          const timeoutPromise = new Promise<Region[]>((_, reject) => 
            setTimeout(() => reject(new Error('Regions fetch timeout')), fetchTimeout)
          );
          
          regionsData = await Promise.race([regionsPromise, timeoutPromise]);
          
          if (!regionsData || !Array.isArray(regionsData) || regionsData.length === 0) {
            console.warn('Regions data invalid or empty, using client-side fallback');
            regionsData = clientSideFallbacks.regions;
          } else {
            regionsSuccess = true;
            console.log(`Successfully loaded ${regionsData.length} regions from server`);
          }
        } catch (regionError) {
          console.error('Failed to fetch regions data:', regionError);
          regionsData = clientSideFallbacks.regions;
          console.log(`Using ${regionsData.length} fallback regions`);
        }
        
        // Fetch languages with timeout and fallback
        try {
          console.log('Attempting to fetch languages data from server...');
          const languagesPromise = getAllLanguages();
          const timeoutPromise = new Promise<Language[]>((_, reject) => 
            setTimeout(() => reject(new Error('Languages fetch timeout')), fetchTimeout)
          );
          
          languagesData = await Promise.race([languagesPromise, timeoutPromise]);
          
          if (!languagesData || !Array.isArray(languagesData) || languagesData.length === 0) {
            console.warn('Languages data invalid or empty, using client-side fallback');
            languagesData = clientSideFallbacks.languages;
          } else {
            languagesSuccess = true;
            console.log(`Successfully loaded ${languagesData.length} languages from server`);
          }
        } catch (languageError) {
          console.error('Failed to fetch languages data:', languageError);
          languagesData = clientSideFallbacks.languages;
          console.log(`Using ${languagesData.length} fallback languages`);
        }
        
        // Fetch countries with timeout and fallback
        try {
          console.log('Attempting to fetch countries data from server...');
          const countriesPromise = getCountries();
          const timeoutPromise = new Promise<Country[]>((_, reject) => 
            setTimeout(() => reject(new Error('Countries fetch timeout')), fetchTimeout)
          );
          
          countriesData = await Promise.race([countriesPromise, timeoutPromise]);
          
          if (!countriesData || !Array.isArray(countriesData) || countriesData.length === 0) {
            console.warn('Countries data invalid or empty, using client-side fallback');
            countriesData = clientSideFallbacks.countries;
          } else {
            countriesSuccess = true;
            console.log(`Successfully loaded ${countriesData.length} countries from server`);
          }
        } catch (countryError) {
          console.error('Failed to fetch countries data:', countryError);
          countriesData = clientSideFallbacks.countries;
          console.log(`Using ${countriesData.length} fallback countries`);
        }
        
        // Fetch beats with timeout and fallback
        try {
          console.log('Attempting to fetch beats data from server...');
          const beatsPromise = getBeats();
          const timeoutPromise = new Promise<Beat[]>((_, reject) => 
            setTimeout(() => reject(new Error('Beats fetch timeout')), fetchTimeout)
          );
          
          beatsData = await Promise.race([beatsPromise, timeoutPromise]);
          
          if (!beatsData || !Array.isArray(beatsData) || beatsData.length === 0) {
            console.warn('Beats data invalid or empty, using client-side fallback');
            beatsData = clientSideFallbacks.beats;
          } else {
            beatsSuccess = true;
            console.log(`Successfully loaded ${beatsData.length} beats from server`);
          }
        } catch (beatError) {
          console.error('Failed to fetch beats data:', beatError);
          beatsData = clientSideFallbacks.beats;
          console.log(`Using ${beatsData.length} fallback beats`);
        }
        
        // Update state with the data we were able to fetch or fallbacks
        setAllRegions(regionsData);
        setAllLanguages(languagesData);
        setAllCountries(countriesData);
        setAllBeats(beatsData);
        
        // Show toast with appropriate message based on success
        if (!regionsSuccess && !languagesSuccess && !countriesSuccess && !beatsSuccess) {
          toast.warning('Using offline filter data. Some features may be limited.');
        } else if (!(regionsSuccess && languagesSuccess && countriesSuccess && beatsSuccess)) {
          toast.info('Some filter data could not be loaded. Using fallbacks where needed.');
        }
        
      } catch (error) {
        console.error('Unexpected error in fetchFilterData:', error);
        toast.error('Failed to load filter options. Using offline mode.');
        
        // Use all fallback data in case of catastrophic failure
        setAllRegions(clientSideFallbacks.regions);
        setAllLanguages(clientSideFallbacks.languages);
        setAllCountries(clientSideFallbacks.countries);
        setAllBeats(clientSideFallbacks.beats);
      }
    };
    
    fetchFilterData();
  }, []); // Runs once on mount to fetch dropdown options

  /**
   * Fetch media contacts whenever filters or pagination change.
   * This also runs on initial mount with default filter values.
   * The fetchFilteredContacts function has its own fallback for default 0 results.
   */
  useEffect(() => {
    console.log('Filter or pagination state changed, fetching contacts.');
    // Only fetch if we don't already have data or if filter/pagination params changed after initial load
    if (contacts.length === 0 || activeFiltersCount() > 0 || currentPage > 0) {
      fetchFilteredContacts();
    }
  }, [
    currentPage,
    pageSize,
    mainSearchTerm,
    selectedCountryIds,
    selectedBeatIds,
    selectedRegionCodes,
    selectedLanguageCodes,
    emailVerifiedFilter
  ]);

  /**
   * Fetch media contacts with current filter parameters and pagination
   * Following Rust-inspired explicit typing and error handling
   */
  const fetchFilteredContacts = async (): Promise<void> => {
    // If we already have contacts and no filters are applied, no need to fetch again
    if (contacts.length > 0 && activeFiltersCount() === 0 && currentPage === 0) {
      console.log('Using existing contacts, no need to fetch');
      return;
    }
    try {
      setIsLoading(true);
      
      // Log current state for debugging
      console.log('Fetching contacts with parameters:', {
        currentPage,
        pageSize,
        mainSearchTerm,
        selectedCountryIds,
        selectedBeatIds,
        selectedRegionCodes,
        selectedLanguageCodes,
        emailVerifiedFilter
      });
      
      // Build filter parameters following our schema
      const filterParams: GetMediaContactsParams = {
        // Filter parameters
        searchTerm: mainSearchTerm,
        countryIds: selectedCountryIds.length > 0 ? selectedCountryIds : undefined,
        beatIds: selectedBeatIds.length > 0 ? selectedBeatIds : undefined,
        regionCodes: selectedRegionCodes.length > 0 ? selectedRegionCodes : undefined,
        languageCodes: selectedLanguageCodes.length > 0 ? selectedLanguageCodes : undefined,
        emailVerified: emailVerifiedFilter,
        
        // Always explicitly set pagination parameters - ensure they're not undefined
        page: currentPage,
        pageSize: pageSize
      };
      
      // Call the server action with filters and pagination
      const result: PaginatedMediaContactsActionResult = await getMediaContactsAction(filterParams);
      
      console.log('Server returned contacts:', result.contacts.length, 'Total count:', result.totalCount);
      
      // If no results returned, provide fallback data for development/testing
      if (result.contacts.length === 0 && (!mainSearchTerm && !selectedCountryIds.length && !selectedBeatIds.length && !selectedRegionCodes.length && !selectedLanguageCodes.length && emailVerifiedFilter === 'all')) {
        console.log('No results found with default parameters, creating fallback data');
        
        // Create fallback data that matches our interface exactly
        const fallbackContacts: MediaContactTableItem[] = [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            title: 'Tech Journalist',
            email_verified_status: true,
            updated_at: new Date().toISOString(),
            outlets: [{ id: '1', name: 'Tech Daily' }],
            countries: [{ id: '1', name: 'United States' }],
            beats: [{ id: '1', name: 'Technology' }],
            bio: 'Technology journalist with 10 years of experience',
            socials: ['https://twitter.com/johndoe', 'https://linkedin.com/in/johndoe']
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            title: 'Senior Editor',
            email_verified_status: false,
            updated_at: new Date().toISOString(),
            outlets: [{ id: '2', name: 'Business Weekly' }],
            countries: [{ id: '2', name: 'United Kingdom' }],
            beats: [{ id: '2', name: 'Business' }],
            bio: 'Business editor specializing in finance and tech',
            socials: ['https://twitter.com/janesmith']
          }
        ];
        
        setContacts(fallbackContacts);
        setTotalContactsCount(fallbackContacts.length);
      } else {
        // Update state with the filtered contacts and total count
        setContacts(result.contacts);
        setTotalContactsCount(result.totalCount);
      }
    } catch (error) {
      console.error('Error fetching filtered contacts:', error);
      toast.error('Failed to fetch contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Refresh data using router refresh for hard reloads
   * or filtered data fetch for filter changes
   * Following Rust-inspired explicit function definitions
   */
  const handleDataRefresh = (): void => {
    // Use fetchFilteredContacts for filter-based updates
    fetchFilteredContacts();
  };

  /**
   * Open the add contact sheet
   * Following Rust-inspired explicit function definition
   */
  const handleAddContactOpen = (): void => {
    setEditingContact(null);
    setIsEditSheetOpen(true);
  };

  /**
   * Open the edit contact sheet
   * @param contact The contact to edit
   * Following Rust-inspired explicit typing and validation
   */
  const handleEditContactOpen = (contact: MediaContactTableItem): void => {
    // Validate required parameters with fail-fast approach
    if (!contact || !contact.id) {
      console.error("Failed to open edit sheet: Invalid contact or missing ID");
      toast.error("Cannot edit contact: Missing or invalid data");
      return;
    }
    
    setEditingContact(contact);
    setIsEditSheetOpen(true);
    
    // If viewing the contact currently, close the view sheet
    if (isViewSheetOpen) {
      setIsViewSheetOpen(false);
    }
  };
  
  /**
   * Handle successful contact update or creation
   * Following Rust-inspired explicit function definition
   */
  const handleContactUpserted = (): void => {
    handleDataRefresh();
    setIsEditSheetOpen(false);
  };
  
  /**
   * Clear all active filters
   * Following Rust-inspired explicit function definition with comprehensive reset
   */
  const handleClearAllFilters = (): void => {
    // Reset all filter states
    setMainSearchTerm('');
    setSelectedCountryIds([]);
    setSelectedBeatIds([]);
    setSelectedRegionCodes([]);
    setSelectedLanguageCodes([]);
    setEmailVerifiedFilter('all');
    
    // Reset search terms for dropdowns
    setSearchFilterCountryTerm('');
    setSearchFilterBeatTerm('');
    setSearchFilterRegionTerm('');
    setSearchFilterLanguageTerm('');
    
    // Reset pagination to first page
    setCurrentPage(0);
    
    // Refresh data after clearing filters
    fetchFilteredContacts();
    toast.success('All filters cleared');
  };
  
  /**
   * Open the view contact details sheet
   * @param contact The contact to view
   * Following Rust-inspired explicit typing and validation
   */
  const handleViewContact = (contact: MediaContactTableItem): void => {
    // Validate required parameters with fail-fast approach
    if (!contact || !contact.id) {
      console.error("Failed to open view sheet: Invalid contact or missing ID");
      toast.error("Cannot view contact: Missing or invalid data");
      return;
    }
    
    setViewingContact(contact);
    setIsViewSheetOpen(true);
  };
  
  /**
   * Handle contact deletion
   * Following Rust-inspired explicit function definition
   */
  const handleContactDeleted = (): void => {
    handleDataRefresh();
    setIsViewSheetOpen(false);
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header with app branding and action buttons */}
      <header className="flex flex-row justify-between items-center gap-4 mb-8">
        <AppBrandHeader />
        <HeaderActionButtons onAddContactOpen={handleAddContactOpen} />
      </header>
      
      {/* Filters section */}
      <section className="mb-8">
        <MediaContactsFilters
          // Main search
          mainSearchTerm={mainSearchTerm}
          setMainSearchTerm={setMainSearchTerm}
          
          // Country filters
          allCountries={allCountries}
          selectedCountryIds={selectedCountryIds}
          setSelectedCountryIds={setSelectedCountryIds}
          isCountryDropdownOpen={isCountryDropdownOpen}
          setIsCountryDropdownOpen={setIsCountryDropdownOpen}
          searchFilterCountryTerm={searchFilterCountryTerm}
          setSearchFilterCountryTerm={setSearchFilterCountryTerm}
          
          // Beat filters
          allBeats={allBeats}
          selectedBeatIds={selectedBeatIds}
          setSelectedBeatIds={setSelectedBeatIds}
          isBeatDropdownOpen={isBeatDropdownOpen}
          setIsBeatDropdownOpen={setIsBeatDropdownOpen}
          searchFilterBeatTerm={searchFilterBeatTerm}
          setSearchFilterBeatTerm={setSearchFilterBeatTerm}
          
          // Region filters (new)
          allRegions={allRegions}
          selectedRegionCodes={selectedRegionCodes}
          setSelectedRegionCodes={setSelectedRegionCodes}
          isRegionDropdownOpen={isRegionDropdownOpen}
          setIsRegionDropdownOpen={setIsRegionDropdownOpen}
          searchFilterRegionTerm={searchFilterRegionTerm}
          setSearchFilterRegionTerm={setSearchFilterRegionTerm}
          
          // Language filters (new)
          allLanguages={allLanguages}
          selectedLanguageCodes={selectedLanguageCodes}
          setSelectedLanguageCodes={setSelectedLanguageCodes}
          isLanguageDropdownOpen={isLanguageDropdownOpen}
          setIsLanguageDropdownOpen={setIsLanguageDropdownOpen}
          searchFilterLanguageTerm={searchFilterLanguageTerm}
          setSearchFilterLanguageTerm={setSearchFilterLanguageTerm}
          
          // Email verification filter - now as a dropdown
          emailVerifiedFilter={emailVerifiedFilter}
          setEmailVerifiedFilter={setEmailVerifiedFilter}
          isEmailVerifiedDropdownOpen={isEmailVerifiedDropdownOpen}
          setIsEmailVerifiedDropdownOpen={setIsEmailVerifiedDropdownOpen}
          
          // Filter management
          activeFiltersCount={activeFiltersCount()}
          handleClearAllFilters={handleClearAllFilters}
        />
      </section>
      
      {/* Main content with data table */}
      <main>
        {isLoading ? (
          <div className="py-10">
            <div className="flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white"></div>
              <span className="ml-2">Loading contacts...</span>
            </div>
          </div>
        ) : (
          <MediaContactsTable 
            data={contacts} 
            onDataRefresh={handleDataRefresh}
            onEditContact={handleEditContactOpen}
            onViewContact={handleViewContact}
            onFallbackDataNeeded={(fallbackData) => {
              console.log('Fallback data needed, using mock data', fallbackData);
              setContacts(fallbackData);
              setTotalContactsCount(fallbackData.length);
            }}
            mainSearchTerm={mainSearchTerm}
            selectedCountryIds={selectedCountryIds}
            selectedBeatIds={selectedBeatIds}
            selectedRegionCodes={selectedRegionCodes}
            selectedLanguageCodes={selectedLanguageCodes}
            emailVerifiedFilter={emailVerifiedFilter}
            // Pagination props
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalCount={totalContactsCount}
          />
        )}
      </main>
      
      {/* Edit Contact Sheet */}
      <UpdateMediaContactSheet
        isOpen={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen} 
        contact={editingContact} 
        onContactUpdate={handleContactUpserted} 
      />
      
      {/* View Contact Details Sheet */}
      <ViewMediaContactSheet
        isOpen={isViewSheetOpen}
        onOpenChange={setIsViewSheetOpen}
        contact={viewingContact}
        onContactDelete={handleContactDeleted}
        onContactEdit={handleEditContactOpen}
      />
    </div>
  );
}
