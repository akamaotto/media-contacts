/**
 * AI Search Workflow Hook
 * Manages the end-to-end AI search workflow with state management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchFormData } from '@/components/features/ai-search/types';
import { Contact } from '@/components/features/contacts/types';
import {
  aiSearchIntegrationService,
  SearchSubmissionResponse,
  SearchUpdateEvent,
  ContactImportRequest
} from './aisearch-integration-service';

export interface SearchWorkflowState {
  // Search state
  currentSearch: string | null;
  searchStatus: 'idle' | 'submitting' | 'running' | 'completed' | 'failed' | 'cancelled';
  searchProgress: any;
  searchResults: any;
  searchError: string | null;

  // Results state
  contacts: Contact[];
  selectedContacts: string[];
  loadingContacts: boolean;

  // Import state
  importing: boolean;
  importProgress: {
    total: number;
    imported: number;
    failed: number;
    errors: string[];
  };

  // UI state
  showProgress: boolean;
  showResults: boolean;
  realTimeUpdates: boolean;
}

export interface UseAISearchWorkflowOptions {
  onSearchComplete?: (searchId: string, results: any) => void;
  onSearchError?: (error: string) => void;
  onContactsImported?: (imported: number, failed: number) => void;
  enableRealTimeUpdates?: boolean;
  autoShowResults?: boolean;
}

export function useAISearchWorkflow(options: UseAISearchWorkflowOptions = {}) {
  const {
    onSearchComplete,
    onSearchError,
    onContactsImported,
    enableRealTimeUpdates = true,
    autoShowResults = true
  } = options;

  // State management
  const [state, setState] = useState<SearchWorkflowState>({
    currentSearch: null,
    searchStatus: 'idle',
    searchProgress: null,
    searchResults: null,
    searchError: null,
    contacts: [],
    selectedContacts: [],
    loadingContacts: false,
    importing: false,
    importProgress: {
      total: 0,
      imported: 0,
      failed: 0,
      errors: []
    },
    showProgress: false,
    showResults: false,
    realTimeUpdates: enableRealTimeUpdates
  });

  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const searchIdRef = useRef<string | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    searchIdRef.current = null;
  }, []);

  // Handle search updates
  const handleSearchUpdate = useCallback((event: SearchUpdateEvent) => {
    setState(prev => {
      switch (event.type) {
        case 'progress':
          return {
            ...prev,
            searchProgress: event.data,
            searchStatus: 'running',
            showProgress: true
          };

        case 'completed':
          return {
            ...prev,
            searchStatus: 'completed',
            searchResults: event.data,
            searchProgress: null,
            showProgress: false,
            showResults: autoShowResults
          };

        case 'failed':
        case 'error':
          return {
            ...prev,
            searchStatus: 'failed',
            searchError: event.data.message || 'Search failed',
            searchProgress: null,
            showProgress: false
          };

        default:
          return prev;
      }
    });
  }, [autoShowResults]);

  // Submit new search
  const submitSearch = useCallback(async (searchData: SearchFormData) => {
    try {
      // Clean up previous search
      cleanup();

      // Update state to submitting
      setState(prev => ({
        ...prev,
        searchStatus: 'submitting',
        searchError: null,
        showProgress: true,
        showResults: false,
        contacts: [],
        selectedContacts: []
      }));

      // Submit search
      const response: SearchSubmissionResponse = await aiSearchIntegrationService.submitSearch(searchData);

      // Store search ID
      searchIdRef.current = response.searchId;

      // Update state
      setState(prev => ({
        ...prev,
        currentSearch: response.searchId,
        searchStatus: 'running',
        searchProgress: {
          status: response.status,
          progress: 0,
          message: 'Search initiated',
          estimatedDuration: response.estimatedDuration
        }
      }));

      // Subscribe to real-time updates if enabled
      if (enableRealTimeUpdates) {
        unsubscribeRef.current = aiSearchIntegrationService.subscribeToSearchUpdates(
          response.searchId,
          handleSearchUpdate
        );
      }

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search submission failed';

      setState(prev => ({
        ...prev,
        searchStatus: 'failed',
        searchError: errorMessage,
        showProgress: false
      }));

      onSearchError?.(errorMessage);
      throw error;
    }
  }, [cleanup, enableRealTimeUpdates, handleSearchUpdate, onSearchError]);

  // Cancel active search
  const cancelSearch = useCallback(async (reason?: string) => {
    if (!state.currentSearch) return;

    try {
      await aiSearchIntegrationService.cancelSearch(state.currentSearch, reason);

      setState(prev => ({
        ...prev,
        searchStatus: 'cancelled',
        searchProgress: null,
        showProgress: false
      }));

      cleanup();

    } catch (error) {
      console.error('Failed to cancel search:', error);
    }
  }, [state.currentSearch, cleanup]);

  // Get search status manually
  const refreshSearchStatus = useCallback(async () => {
    if (!state.currentSearch) return;

    try {
      const status = await aiSearchIntegrationService.getSearchStatus(state.currentSearch);

      if (status) {
        handleSearchUpdate({
          searchId: state.currentSearch,
          type: status.status as any,
          data: status,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to refresh search status:', error);
    }
  }, [state.currentSearch, handleSearchUpdate]);

  // Load search results
  const loadSearchResults = useCallback(async () => {
    if (!state.currentSearch || state.searchStatus !== 'completed') return;

    setState(prev => ({ ...prev, loadingContacts: true }));

    try {
      const status = await aiSearchIntegrationService.getSearchStatus(state.currentSearch!);

      if (status?.contacts) {
        // Transform API contacts to frontend format
        const contacts: Contact[] = status.contacts.map((contact: any, index: number) => ({
          id: contact.id || `contact-${index}`,
          firstName: contact.firstName || contact.name?.split(' ')[0] || '',
          lastName: contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
          email: contact.email,
          title: contact.title || contact.position,
          company: contact.company || contact.outlet,
          confidenceScore: contact.confidence || contact.confidenceScore || 0.8,
          verificationStatus: contact.verified ? 'verified' : 'pending',
          sourceUrl: contact.sourceUrl || contact.url,
          createdAt: contact.createdAt || new Date().toISOString(),
          updatedAt: contact.updatedAt || new Date().toISOString(),
          // Additional fields from your contact schema
          phone: contact.phone,
          linkedInUrl: contact.linkedInUrl,
          bio: contact.bio,
          location: contact.location,
          languages: contact.languages,
          beats: contact.beats || [],
          categories: contact.categories || [],
          outlets: contact.outlets || [],
          contactInfo: {
            avatar: contact.avatar,
            socialMedia: contact.socialMedia
          }
        }));

        setState(prev => ({
          ...prev,
          contacts,
          loadingContacts: false,
          showResults: true
        }));
      }
    } catch (error) {
      console.error('Failed to load search results:', error);
      setState(prev => ({ ...prev, loadingContacts: false }));
    }
  }, [state.currentSearch, state.searchStatus]);

  // Replace selected contacts list
  const setSelectedContacts = useCallback((contactIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectedContacts: Array.from(new Set(contactIds))
    }));
  }, []);

  // Toggle a single contact selection
  const toggleContactSelection = useCallback((contactId: string, selected?: boolean) => {
    setState(prev => {
      const isSelected = selected !== undefined
        ? selected
        : !prev.selectedContacts.includes(contactId);

      if (isSelected) {
        return {
          ...prev,
          selectedContacts: Array.from(new Set([...prev.selectedContacts, contactId]))
        };
      }

      return {
        ...prev,
        selectedContacts: prev.selectedContacts.filter(id => id !== contactId)
      };
    });
  }, []);

  // Select all contacts
  const selectAllContacts = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedContacts: prev.contacts.map(c => c.id)
    }));
  }, []);

  // Clear contact selection
  const clearContactSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedContacts: []
    }));
  }, []);

  // Import selected contacts
  const importSelectedContacts = useCallback(async (
    contactIds?: string[],
    targetLists?: string[],
    tags?: string[]
  ) => {
    if (!state.currentSearch) {
      throw new Error('No active search to import results from');
    }

    const contactsToImport = contactIds ?? state.selectedContacts;

    if (contactsToImport.length === 0) {
      throw new Error('No contacts selected for import');
    }

    setState(prev => ({
      ...prev,
      importing: true,
      importProgress: {
        total: contactsToImport.length,
        imported: 0,
        failed: 0,
        errors: []
      }
    }));

    try {
      const importRequest: ContactImportRequest = {
        searchId: state.currentSearch,
        contactIds: contactsToImport,
        targetLists,
        tags
      };

      const response = await aiSearchIntegrationService.importContacts(importRequest);

      setState(prev => ({
        ...prev,
        importing: false,
        importProgress: {
          total: response.total,
          imported: response.imported,
          failed: response.failed,
          errors: response.errors || []
        },
        selectedContacts: prev.selectedContacts.filter(
          id => !contactsToImport.includes(id)
        )
      }));

      onContactsImported?.(response.imported, response.failed);

      return response;

    } catch (error) {
      setState(prev => ({
        ...prev,
        importing: false,
        importProgress: {
          ...prev.importProgress,
          errors: [error instanceof Error ? error.message : 'Import failed']
        }
      }));
      throw error;
    }
  }, [state.currentSearch, state.selectedContacts, onContactsImported]);

  // Reset workflow
  const resetWorkflow = useCallback(() => {
    cleanup();
    setState({
      currentSearch: null,
      searchStatus: 'idle',
      searchProgress: null,
      searchResults: null,
      searchError: null,
      contacts: [],
      selectedContacts: [],
      loadingContacts: false,
      importing: false,
      importProgress: {
        total: 0,
        imported: 0,
        failed: 0,
        errors: []
      },
      showProgress: false,
      showResults: false,
      realTimeUpdates: enableRealTimeUpdates
    });
  }, [cleanup, enableRealTimeUpdates]);

  // Toggle real-time updates
  const toggleRealTimeUpdates = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, realTimeUpdates: enabled }));

    if (enabled && state.currentSearch && state.searchStatus === 'running') {
      // Subscribe to updates if not already subscribed
      if (!unsubscribeRef.current) {
        unsubscribeRef.current = aiSearchIntegrationService.subscribeToSearchUpdates(
          state.currentSearch,
          handleSearchUpdate
        );
      }
    } else if (!enabled && unsubscribeRef.current) {
      // Unsubscribe from updates
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, [state.currentSearch, state.searchStatus, handleSearchUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-load results when search completes
  useEffect(() => {
    if (state.searchStatus === 'completed' && state.currentSearch) {
      loadSearchResults();
    }
  }, [state.searchStatus, state.currentSearch, loadSearchResults]);

  return {
    // State
    state,

    // Search actions
    submitSearch,
    cancelSearch,
    refreshSearchStatus,

    // Results actions
    loadSearchResults,
    toggleContactSelection,
    setSelectedContacts,
    selectAllContacts,
    clearContactSelection,

    // Import actions
    importSelectedContacts,

    // UI actions
    toggleRealTimeUpdates,
    resetWorkflow,

    // Computed values
    hasActiveSearch: state.searchStatus === 'running' || state.searchStatus === 'submitting',
    hasResults: state.contacts.length > 0,
    hasSelection: state.selectedContacts.length > 0,
    canImport: state.selectedContacts.length > 0 && !state.importing,

    // Status helpers
    isIdle: state.searchStatus === 'idle',
    isSubmitting: state.searchStatus === 'submitting',
    isRunning: state.searchStatus === 'running',
    isCompleted: state.searchStatus === 'completed',
    isFailed: state.searchStatus === 'failed',
    isCancelled: state.searchStatus === 'cancelled'
  };
}

export type UseAISearchWorkflowReturn = ReturnType<typeof useAISearchWorkflow>;
