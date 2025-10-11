/**
 * AI Search Integration Service
 * Provides a unified interface for frontend components to interact with AI search APIs
 */

import { SearchFormData, SearchProgress } from '@/components/features/ai-search/types';
import { Contact } from '@/components/features/contacts/types';
import { SearchConfiguration, SearchRequest, SearchResponse } from '@/lib/ai/search-orchestration/types';
import { AIResponse, AISearchRequest, AISearchResponse } from '@/app/api/ai/shared/types';
import { executeOptimizedAIRequest, batchAIRequests } from '@/lib/performance/performance-integration';
import { performanceMonitor } from '@/lib/performance/performance-monitor';

// Define type for real-time update events
export interface SearchUpdateEvent {
  searchId: string;
  type: 'progress' | 'status' | 'results' | 'error' | 'completed';
  data: any;
  timestamp: Date;
}

// Define type for search submission response
export interface SearchSubmissionResponse {
  searchId: string;
  status: string;
  estimatedDuration?: {
    min: number;
    max: number;
    average: number;
  };
}

// Define type for contact import request
export interface ContactImportRequest {
  searchId: string;
  contactIds: string[];
  targetLists?: string[];
  tags?: string[];
}

// Define type for contact import response
export interface ContactImportResponse {
  importId: string;
  status: string;
  imported: number;
  failed: number;
  errors?: string[];
}

export class AISearchIntegrationService {
  private baseUrl: string;
  private eventListeners: Map<string, Set<(event: SearchUpdateEvent) => void>> = new Map();
  private activePolling: Map<string, NodeJS.Timeout> = new Map();
  private pollingInterval = 2000; // 2 seconds
  private requestQueue: Map<string, any> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(baseUrl?: string) {
    // Default to current origin if no base URL provided
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  /**
   * Submit a new search request
   */
  async submitSearch(searchData: SearchFormData): Promise<SearchSubmissionResponse> {
    const startTime = Date.now();
    
    try {
      // Transform frontend data to backend API format
      const searchRequest: any = {
        query: searchData.query,
        countries: searchData.countries,
        categories: searchData.categories,
        beats: searchData.beats,
        maxResults: searchData.options.maxQueries || 50,
        maxContactsPerSource: 10,
        confidenceThreshold: searchData.options.minRelevanceScore || 0.5,
        enableAIEnhancement: searchData.options.enableAIEnhancement ?? true,
        enableContactExtraction: true,
        enableContentScraping: true,
        enableCaching: searchData.options.cacheEnabled ?? true,
        strictValidation: false,
        priority: searchData.options.priority || 'normal',
        trackProgress: true
      };

      // Use optimized AI service request
      const searchId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await executeOptimizedAIRequest({
        id: searchId,
        type: 'search',
        payload: {
          query: searchData.query,
          filters: {
            countries: searchData.countries,
            categories: searchData.categories,
            beats: searchData.beats
          },
          options: {
            maxResults: searchData.options.maxQueries || 50,
            priority: searchData.options.priority || 'normal',
            includeSummaries: true,
            extractContacts: true,
            scrapeContent: true
          }
        },
        priority: searchData.options.priority || 'normal',
        timeout: 30000
      });

      // Track performance
      const duration = Date.now() - startTime;
      performanceMonitor.trackAISearchPerformance(duration, result.cost || 0, true);

      // Start polling for updates
      this.startProgressTracking(searchId);

      return {
        searchId,
        status: 'submitted',
        estimatedDuration: {
          min: 10000,
          max: 30000,
          average: 20000
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.trackAISearchPerformance(duration, 0, false);
      
      console.error('Search submission failed:', error);
      throw error;
    }
  }

  /**
   * Get current search status and progress
   */
  async getSearchStatus(searchId: string): Promise<SearchResponse | null> {
    const startTime = Date.now();
    
    try {
      // Use optimized request with caching for status checks
      const result = await executeOptimizedAIRequest({
        id: `status-${searchId}`,
        type: 'query-generation', // Use existing type for status checks
        payload: { searchId, operation: 'status' },
        priority: 'low',
        timeout: 5000
      });

      const duration = Date.now() - startTime;
      performanceMonitor.trackAISearchPerformance(duration, result.cost || 0, true);

      return result.data || null;

    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.trackAISearchPerformance(duration, 0, false);
      
      console.error('Failed to get search status:', error);
      throw error;
    }
  }

  /**
   * Cancel an active search
   */
  async cancelSearch(searchId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const params = new URLSearchParams({
        action: 'cancel',
        searchId,
        ...(reason && { reason })
      });

      const response = await fetch(`${this.baseUrl}/api/ai/search/orchestration?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Search cancellation failed with status ${response.status}`);
      }

      const apiResponse: AIResponse = await response.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error?.message || 'Unknown error occurred');
      }

      // Stop polling for updates
      this.stopProgressTracking(searchId);

      return apiResponse.data;

    } catch (error) {
      console.error('Search cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Import selected contacts to the main contact database
   */
  async importContacts(importRequest: ContactImportRequest): Promise<ContactImportResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/contacts/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Contact import failed with status ${response.status}`);
      }

      const apiResponse: AIResponse = await response.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error?.message || 'Unknown error occurred');
      }

      return apiResponse.data;

    } catch (error) {
      console.error('Contact import failed:', error);
      throw error;
    }
  }

  /**
   * Get search statistics for the current user
   */
  async getSearchStatistics(timeRange?: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        action: 'statistics',
        ...(timeRange && { timeRange })
      });

      const response = await fetch(`${this.baseUrl}/api/ai/search/orchestration?${params}`);
      
      if (!response.ok) {
        throw new Error(`Statistics fetch failed with status ${response.status}`);
      }

      const apiResponse: AIResponse = await response.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error?.message || 'Unknown error occurred');
      }

      return apiResponse.data;

    } catch (error) {
      console.error('Failed to get search statistics:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for a specific search
   */
  subscribeToSearchUpdates(
    searchId: string,
    callback: (event: SearchUpdateEvent) => void
  ): () => void {
    // Initialize listener set for this search if it doesn't exist
    if (!this.eventListeners.has(searchId)) {
      this.eventListeners.set(searchId, new Set());
    }

    // Add the callback to the listener set
    this.eventListeners.get(searchId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(searchId);
      if (listeners) {
        listeners.delete(callback);
        // Clean up if no more listeners
        if (listeners.size === 0) {
          this.eventListeners.delete(searchId);
          this.stopProgressTracking(searchId);
        }
      }
    };
  }

  /**
   * Start polling for search progress updates
   */
  private startProgressTracking(searchId: string): void {
    // Clear any existing polling for this search
    this.stopProgressTracking(searchId);

    // Use exponential backoff for polling
    let pollingInterval = this.pollingInterval;
    let retryCount = 0;

    const poll = async () => {
      try {
        const status = await this.getSearchStatus(searchId);
        
        if (status) {
          // Reset retry count on successful request
          retryCount = 0;
          pollingInterval = this.pollingInterval;
          
          // Emit progress update event
          this.emitUpdateEvent(searchId, {
            type: 'progress',
            data: {
              status: status.status,
              progress: status.progress,
              resultsCount: status.contacts?.length || 0,
              errors: status.errors
            }
          });

          // Check if search is completed or failed
          if (status.status === 'completed' || status.status === 'failed') {
            // Emit final status event
            this.emitUpdateEvent(searchId, {
              type: status.status,
              data: {
                status: status.status,
                results: status.results,
                contacts: status.contacts,
                metrics: status.metrics,
                errors: status.errors
              }
            });

            // Stop polling for this search
            this.stopProgressTracking(searchId);
            return;
          }
        } else {
          // Search not found, stop polling
          this.stopProgressTracking(searchId);
          this.emitUpdateEvent(searchId, {
            type: 'error',
            data: { message: 'Search not found' }
          });
          return;
        }
      } catch (error) {
        console.error('Error polling for search updates:', error);
        
        // Implement exponential backoff
        retryCount++;
        if (retryCount > 3) {
          pollingInterval = Math.min(pollingInterval * 2, 10000); // Max 10 seconds
        }
      }

      // Schedule next poll
      const intervalId = setTimeout(poll, pollingInterval);
      this.activePolling.set(searchId, intervalId);
    };

    // Start polling
    poll();
  }

  /**
   * Stop polling for search progress updates
   */
  private stopProgressTracking(searchId: string): void {
    const intervalId = this.activePolling.get(searchId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activePolling.delete(searchId);
    }
  }

  /**
   * Emit an update event to all subscribed listeners
   */
  private emitUpdateEvent(searchId: string, eventData: Omit<SearchUpdateEvent, 'searchId' | 'timestamp'>): void {
    const listeners = this.eventListeners.get(searchId);
    if (listeners && listeners.size > 0) {
      const event: SearchUpdateEvent = {
        searchId,
        ...eventData,
        timestamp: new Date()
      };

      // Notify all listeners
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in search update listener:', error);
        }
      });
    }
  }

  /**
   * Batch multiple search requests for efficiency
   */
  async batchSearchRequests(searchRequests: SearchFormData[]): Promise<SearchSubmissionResponse[]> {
    const startTime = Date.now();
    
    try {
      // Transform requests to AI service format
      const aiRequests = searchRequests.map((searchData, index) => ({
        id: `batch-search-${Date.now()}-${index}`,
        type: 'search' as const,
        payload: {
          query: searchData.query,
          filters: {
            countries: searchData.countries,
            categories: searchData.categories,
            beats: searchData.beats
          },
          options: {
            maxResults: searchData.options.maxQueries || 50,
            priority: searchData.options.priority || 'normal',
            includeSummaries: true,
            extractContacts: true,
            scrapeContent: true
          }
        },
        priority: searchData.options.priority || 'normal'
      }));

      // Execute batch request
      const results = await batchAIRequests(aiRequests);
      
      const duration = Date.now() - startTime;
      const totalCost = results.reduce((sum, result) => sum + (result.cost || 0), 0);
      performanceMonitor.trackAISearchPerformance(duration, totalCost, true);

      // Transform results back to frontend format
      return results.map((result, index) => ({
        searchId: result.id,
        status: 'submitted',
        estimatedDuration: {
          min: 10000,
          max: 30000,
          average: 20000
        }
      }));

    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.trackAISearchPerformance(duration, 0, false);
      
      console.error('Batch search submission failed:', error);
      throw error;
    }
  }

  /**
   * Clean up all active polling and listeners
   */
  cleanup(): void {
    // Stop all active polling
    for (const [searchId, intervalId] of this.activePolling) {
      clearTimeout(intervalId);
    }
    this.activePolling.clear();

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Clear all event listeners
    this.eventListeners.clear();
    this.requestQueue.clear();
  }
}

// Create a singleton instance for use throughout the application
export const aiSearchIntegrationService = new AISearchIntegrationService();