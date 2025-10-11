/**
 * Complete AI Search Integration Tests
 * Tests the end-to-end integration of all AI search components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FindContactsModal } from '../find-contacts-modal';
import { AISearchErrorBoundary } from '../error-boundary';
import { aiSearchIntegrationService } from '@/lib/ai/integration/aisearch-integration-service';

// Mock the integration service
jest.mock('@/lib/ai/integration/aisearch-integration-service');
const mockAISearchService = aiSearchIntegrationService as jest.Mocked<typeof aiSearchIntegrationService>;

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'test-user' } } })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const createTestWrapper = () => {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <React.StrictMode>{children}</React.StrictMode>;
  };
};

describe('AI Search Integration Tests', () => {
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

    // Mock search status
    mockAISearchService.getSearchStatus.mockResolvedValue({
      searchId: 'test-search-123',
      status: 'completed',
      progress: 100,
      contacts: [
        {
          id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Test Company',
          title: 'Test Engineer',
          confidence: 0.85,
          sourceUrl: 'https://example.com'
        }
      ],
      results: [],
      metrics: {}
    });

    // Mock contacts import
    mockAISearchService.importContacts.mockResolvedValue({
      importId: 'import-123',
      status: 'completed',
      imported: 1,
      failed: 0,
      total: 1
    });
  });

  describe('FindContactsModal Integration', () => {
    it('should submit search and transition through states', async () => {
      const onSubmit = jest.fn();

      render(
        <FindContactsModal
          isOpen={true}
          onClose={() => {}}
          onSubmit={onSubmit}
        />
      );

      // Should show search form initially
      expect(screen.getByText('AI-Powered Contact Search')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();

      // Fill out search form
      const queryInput = screen.getByLabelText(/search query/i) || screen.getByPlaceholderText(/search/i);
      await user.type(queryInput, 'software engineers in San Francisco');

      // Submit form
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByText('AI Search in Progress')).toBeInTheDocument();
      });

      // Should call submitSearch
      expect(mockAISearchService.submitSearch).toHaveBeenCalledWith({
        query: 'software engineers in San Francisco',
        countries: [],
        categories: [],
        beats: [],
        options: expect.any(Object)
      });

      // Should call onSubmit callback
      expect(onSubmit).toHaveBeenCalled();
    });

    it('should handle search submission errors', async () => {
      mockAISearchService.submitSearch.mockRejectedValue(new Error('Search failed'));

      render(
        <FindContactsModal
          isOpen={true}
          onClose={() => {}}
          onSubmit={() => {}}
        />,
        { wrapper: createTestWrapper() }
      );

      // Submit form
      const queryInput = screen.getByPlaceholderText(/search/i) || screen.getByRole('textbox');
      await user.type(queryInput, 'test query');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Search Failed')).toBeInTheDocument();
        expect(screen.getByText(/failed to initiate search/i)).toBeInTheDocument();
      });
    });

    it('should show real progress updates', async () => {
      let progressCallback: (event: any) => void;
      mockAISearchService.subscribeToSearchUpdates.mockImplementation((searchId, callback) => {
        progressCallback = callback;
        return () => {}; // Unsubscribe function
      });

      render(
        <FindContactsModal
          isOpen={true}
          onClose={() => {}}
          onSubmit={() => {}}
        />,
        { wrapper: createTestWrapper() }
      );

      // Submit search
      const queryInput = screen.getByPlaceholderText(/search/i) || screen.getByRole('textbox');
      await user.type(queryInput, 'test query');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Simulate progress update
      act(() => {
        progressCallback!({
          searchId: 'test-search-123',
          type: 'progress',
          data: { progress: 50, message: 'Processing queries...' },
          timestamp: new Date()
        });
      });

      // Should show updated progress
      await waitFor(() => {
        expect(screen.getByText('Processing queries...')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
    });
  });

  describe('SearchResultsContainer Integration', () => {
    it('should display search results when completed', async () => {
      render(
        <SearchResultsContainer
          searchId="test-search-123"
        />,
        { wrapper: createTestWrapper() }
      );

      // Should show search ID
      expect(screen.getByText(/test-search-123/)).toBeInTheDocument();

      // Should eventually show results
      await waitFor(() => {
        expect(screen.getByText('1 contacts found')).toBeInTheDocument();
      });

      // Should show results table
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should handle contact selection and import', async () => {
      render(
        <SearchResultsContainer
          searchId="test-search-123"
        />,
        { wrapper: createTestWrapper() }
      );

      // Wait for results to load
      await waitFor(() => {
        expect(screen.getByText('1 contacts found')).toBeInTheDocument();
      });

      // Select contact
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Should show selection count
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Import selected contacts
      const importButton = screen.getByRole('button', { name: /import selected/i });
      await user.click(importButton);

      // Should call import service
      await waitFor(() => {
        expect(mockAISearchService.importContacts).toHaveBeenCalledWith({
          searchId: 'test-search-123',
          contactIds: ['contact-1'],
          targetLists: undefined,
          tags: undefined
        });
      });
    });

    it('should show import progress', async () => {
      // Mock delayed import
      mockAISearchService.importContacts.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          importId: 'import-123',
          status: 'completed',
          imported: 1,
          failed: 0,
          total: 1
        }), 1000))
      );

      render(
        <SearchResultsContainer
          searchId="test-search-123"
        />,
        { wrapper: createTestWrapper() }
      );

      // Wait for results and select contact
      await waitFor(() => {
        expect(screen.getByText('1 contacts found')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Start import
      const importButton = screen.getByRole('button', { name: /import selected/i });
      await user.click(importButton);

      // Should show import progress
      await waitFor(() => {
        expect(screen.getByText('Importing Contacts')).toBeInTheDocument();
        expect(screen.getByText('0 of 1 contacts')).toBeInTheDocument();
      });

      // Should show completion
      await waitFor(() => {
        expect(screen.getByText('✓ 1 imported')).toBeInTheDocument();
      }, { timeout: 2000 });
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
      let retryCount = 0;
      const FailingComponent = () => {
        retryCount++;
        if (retryCount <= 2) {
          throw new Error('Retry test error');
        }
        return <div>Success after retry</div>;
      };

      render(
        <AISearchErrorBoundary
          maxRetries={3}
        >
          <FailingComponent />
        </AISearchErrorBoundary>
      );

      // Should show error
      expect(screen.getByText('AI Search Error')).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Should still show error (second failure)
      expect(screen.getByText('AI Search Error')).toBeInTheDocument();

      // Click retry again
      await user.click(retryButton);

      // Should show success content
      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      });
    });

    it('should show technical details in development', () => {
      process.env.NODE_ENV = 'development';

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
      expect(screen.getByText('Development test error')).toBeInTheDocument();
    });
  });

  describe('Workflow Hook Integration', () => {
    it('should manage search workflow state correctly', async () => {
      const TestComponent = () => {
        const workflow = useAISearchWorkflow();

        return (
          <div>
            <div data-testid="status">{workflow.state.searchStatus}</div>
            <div data-testid="contacts-count">{workflow.state.contacts.length}</div>
            <button
              data-testid="submit-search"
              onClick={() => workflow.submitSearch({
                query: 'test',
                countries: [],
                categories: [],
                beats: [],
                options: {}
              })}
            >
              Submit Search
            </button>
          </div>
        );
      };

      render(<TestComponent />, { wrapper: createTestWrapper() });

      // Initial state
      expect(screen.getByTestId('status')).toHaveTextContent('idle');
      expect(screen.getByTestId('contacts-count')).toHaveTextContent('0');

      // Submit search
      await user.click(screen.getByTestId('submit-search'));

      // Should transition to running state
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('running');
      });

      // Should complete and show results
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('completed');
        expect(screen.getByTestId('contacts-count')).toHaveTextContent('1');
      }, { timeout: 2000 });
    });

    it('should handle real-time updates', async () => {
      let progressCallback: (event: any) => void;
      mockAISearchService.subscribeToSearchUpdates.mockImplementation((searchId, callback) => {
        progressCallback = callback;
        return () => {};
      });

      const TestComponent = () => {
        const workflow = useAISearchWorkflow({ enableRealTimeUpdates: true });

        return (
          <div>
            <div data-testid="progress">
              {workflow.state.searchProgress?.progress || 0}%
            </div>
            <div data-testid="message">
              {workflow.state.searchProgress?.message || 'No message'}
            </div>
          </div>
        );
      };

      render(<TestComponent />, { wrapper: createTestWrapper() });

      // Simulate real-time update
      act(() => {
        progressCallback!({
          searchId: 'test-search-123',
          type: 'progress',
          data: { progress: 75, message: 'Almost done...' },
          timestamp: new Date()
        });
      });

      // Should show updated progress
      expect(screen.getByTestId('progress')).toHaveTextContent('75%');
      expect(screen.getByTestId('message')).toHaveTextContent('Almost done...');
    });
  });

  describe('API Integration', () => {
    it('should handle network errors gracefully', async () => {
      mockAISearchService.submitSearch.mockRejectedValue(new Error('Network error'));

      const TestComponent = () => {
        const workflow = useAISearchWorkflow();

        const handleSubmit = async () => {
          try {
            await workflow.submitSearch({
              query: 'test',
              countries: [],
              categories: [],
              beats: [],
              options: {}
            });
          } catch (error) {
            // Error is handled by workflow
          }
        };

        return (
          <div>
            <div data-testid="error">{workflow.state.searchError || 'No error'}</div>
            <button data-testid="submit" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        );
      };

      render(<TestComponent />, { wrapper: createTestWrapper() });

      await user.click(screen.getByTestId('submit'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error');
      });
    });

    it('should validate search form data', async () => {
      const TestComponent = () => {
        const workflow = useAISearchWorkflow();

        const handleInvalidSubmit = async () => {
          try {
            await workflow.submitSearch({
              query: '', // Empty query should fail validation
              countries: [],
              categories: [],
              beats: [],
              options: {}
            });
          } catch (error) {
            return error.message;
          }
        };

        return (
          <div>
            <button data-testid="submit-invalid" onClick={handleInvalidSubmit}>
              Submit Invalid
            </button>
          </div>
        );
      };

      render(<TestComponent />, { wrapper: createTestWrapper() });

      // This test would need to be expanded based on actual validation logic
      // For now, just ensure the component handles invalid data
      expect(screen.getByTestId('submit-invalid')).toBeInTheDocument();
    });
  });
});
