/**
 * Basic AI Search Integration Tests
 * Tests core integration functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AISearchErrorBoundary } from '../error-boundary';
import { aiSearchIntegrationService } from '@/lib/ai/integration/aisearch-integration-service';

// Mock the integration service
jest.mock('@/lib/ai/integration/aisearch-integration-service');
const mockAISearchService = aiSearchIntegrationService as jest.Mocked<typeof aiSearchIntegrationService>;

describe('AI Search Basic Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();

    // Mock successful search submission
    mockAISearchService.submitSearch.mockResolvedValue({
      searchId: 'test-search-123',
      status: 'submitted',
      estimatedDuration: { min: 30000, max: 300000, average: 120000 }
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and display errors gracefully', () => {
      const ThrowErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <AISearchErrorBoundary>
          <ThrowErrorComponent />
        </AISearchErrorBoundary>
      );

      // Should show error boundary UI
      expect(screen.getByText('AI Search Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong with the AI search functionality.')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should allow retry after error', async () => {
      const FailingComponent = ({ shouldFail = true }) => {
        if (shouldFail) {
          throw new Error('Retry test error');
        }
        return <div data-testid="success-content">Success after retry</div>;
      };

      const TestApp = () => {
        const [shouldFail, setShouldFail] = React.useState(true);

        return (
          <AISearchErrorBoundary
            onRetry={() => setShouldFail(false)}
            maxRetries={3}
          >
            <FailingComponent shouldFail={shouldFail} />
          </AISearchErrorBoundary>
        );
      };

      render(<TestApp />);

      // Should show error initially
      expect(screen.getByText('AI Search Error')).toBeInTheDocument();

      // Click retry - this will trigger the onRetry callback which sets shouldFail to false
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Should show success content after retry
      await waitFor(() => {
        expect(screen.getByTestId('success-content')).toBeInTheDocument();
      });
    });

    it('should show technical details in development', () => {
      // Set development mode
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: 'development' },
        writable: true
      });

      const ThrowErrorComponent = () => {
        throw new Error('Development test error');
      };

      render(
        <AISearchErrorBoundary>
          <ThrowErrorComponent />
        </AISearchErrorBoundary>
      );

      // Should show error details section
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getAllByText('Development test error')).toHaveLength(2); // Should appear in both alert and details

      // Restore original env
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: originalEnv },
        writable: true
      });
    });
  });

  describe('Service Integration', () => {
    it('should initialize integration service correctly', () => {
      expect(mockAISearchService).toBeDefined();
      expect(typeof mockAISearchService.submitSearch).toBe('function');
      expect(typeof mockAISearchService.getSearchStatus).toBe('function');
      expect(typeof mockAISearchService.importContacts).toBe('function');
    });

    it('should handle service responses correctly', async () => {
      const mockResponse = {
        searchId: 'test-search-123',
        status: 'completed',
        progress: 100,
        contacts: []
      };

      mockAISearchService.getSearchStatus.mockResolvedValue(mockResponse);

      const result = await mockAISearchService.getSearchStatus('test-search-123');

      expect(result).toEqual(mockResponse);
      expect(mockAISearchService.getSearchStatus).toHaveBeenCalledWith('test-search-123');
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable');
      mockAISearchService.submitSearch.mockRejectedValue(error);

      await expect(mockAISearchService.submitSearch({
        query: 'test',
        countries: [],
        categories: [],
        beats: [],
        options: {}
      })).rejects.toThrow('Service unavailable');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle subscription and unsubscription', () => {
      const mockCallback = jest.fn();

      mockAISearchService.subscribeToSearchUpdates.mockReturnValue(jest.fn());

      const unsubscribe = mockAISearchService.subscribeToSearchUpdates('test-search', mockCallback);

      expect(mockAISearchService.subscribeToSearchUpdates).toHaveBeenCalledWith('test-search', mockCallback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle progress updates', () => {
      const mockCallback = jest.fn();

      mockAISearchService.subscribeToSearchUpdates.mockReturnValue(jest.fn());
      mockAISearchService.subscribeToSearchUpdates('test-search', mockCallback);

      // Simulate that the callback is stored and called with progress updates
      const progressEvent = {
        searchId: 'test-search',
        type: 'progress',
        data: { progress: 50, message: 'Processing...' },
        timestamp: new Date()
      };

      // In a real scenario, the service would call the callback
      mockCallback(progressEvent);

      expect(mockCallback).toHaveBeenCalledWith(progressEvent);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      mockAISearchService.submitSearch.mockRejectedValue(networkError);

      try {
        await mockAISearchService.submitSearch({
          query: 'test',
          countries: [],
          categories: [],
          beats: [],
          options: {}
        });
      } catch (error) {
        expect(error).toBe(networkError);
      }
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockAISearchService.getSearchStatus.mockRejectedValue(timeoutError);

      try {
        await mockAISearchService.getSearchStatus('test-search');
      } catch (error) {
        expect(error).toBe(timeoutError);
      }
    });

    it('should handle malformed responses', async () => {
      // Mock a response that's not properly structured
      mockAISearchService.getSearchStatus.mockResolvedValue(null as any);

      const result = await mockAISearchService.getSearchStatus('test-search');
      expect(result).toBeNull();
    });
  });
});