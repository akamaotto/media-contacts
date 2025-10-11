/**
 * Search Progress Component Tests
 * Comprehensive test suite for the SearchProgress component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SearchProgress } from '../search-progress';
import { ProgressData, ConnectionStatus, CategorizedError } from '../types';

// Mock WebSocket
const mockWebSocket = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN,
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED
};

// Mock WebSocket global
global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock fetch API
global.fetch = jest.fn();

describe('SearchProgress Component', () => {
  const mockSearchId = 'test-search-123';
  const mockInitialProgress: ProgressData = {
    searchId: mockSearchId,
    percentage: 25,
    stage: 'web_search' as any,
    message: 'Performing web searches...',
    currentStep: 2,
    totalSteps: 5,
    stageProgress: {
      queryGeneration: 100,
      webSearch: 25,
      contentScraping: 0,
      contactExtraction: 0,
      resultAggregation: 0,
      finalization: 0
    },
    startTime: new Date(),
    connectionStatus: 'connected',
    lastUpdate: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders with basic props', () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      expect(screen.getByText('AI Search Progress')).toBeInTheDocument();
      expect(screen.getByText('Search ID: test-search...')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('renders progress information correctly', () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('Performing web searches...')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          compact
        />
      );

      expect(screen.getByText('AI Search Progress')).toBeInTheDocument();
      // Should not show detailed elements in compact mode
      expect(screen.queryByText('Stage Details')).not.toBeInTheDocument();
    });

    it('hides when completed with autoHide', async () => {
      const completedProgress = {
        ...mockInitialProgress,
        percentage: 100,
        stage: 'completed' as any,
        message: 'Search completed successfully'
      };

      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={completedProgress}
          autoHide
        />
      );

      expect(container).toBeInTheDocument();

      // Fast-forward 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Component should be hidden (auto-hide)
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });
  });

  describe('Connection Status', () => {
    it('displays connected status', async () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('displays error status on connection failure', async () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });
    });

    it('shows reconnect button when disconnected', async () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      await waitFor(() => {
        const reconnectButton = screen.getByLabelText('Reconnect');
        expect(reconnectButton).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    const mockError: CategorizedError = {
      category: 'network',
      severity: 'medium',
      title: 'Network Connection Error',
      message: 'Unable to connect to the search service',
      timestamp: new Date(),
      retryable: true,
      actions: [
        {
          type: 'retry',
          label: 'Retry',
          action: jest.fn(),
          primary: true
        }
      ]
    };

    it('displays error information correctly', async () => {
      // Mock WebSocket to send an error message
      const mockOnMessage = jest.fn();
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'message') {
          mockOnMessage.mockImplementation(callback);
        }
      });

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      // Simulate receiving an error message
      act(() => {
        mockOnMessage({
          data: JSON.stringify({
            type: 'error',
            searchId: mockSearchId,
            error: mockError,
            timestamp: new Date()
          })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Unable to connect to the search service')).toBeInTheDocument();
      });
    });

    it('calls retry handler when retry button is clicked', async () => {
      const mockOnRetry = jest.fn();

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          onRetry={mockOnRetry}
        />
      );

      // Simulate error state
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith(mockSearchId);
    });
  });

  describe('Progress Updates', () => {
    it('updates progress when receiving WebSocket messages', async () => {
      const mockOnMessage = jest.fn();
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'message') {
          mockOnMessage.mockImplementation(callback);
        }
      });

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      // Simulate receiving a progress update
      act(() => {
        mockOnMessage({
          data: JSON.stringify({
            type: 'progress_update',
            searchId: mockSearchId,
            progress: {
              percentage: 50,
              stage: 'content_scraping',
              message: 'Scraping content...',
              currentStep: 3
            },
            timestamp: new Date()
          })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('Scraping content...')).toBeInTheDocument();
        expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
      });
    });

    it('handles completion message correctly', async () => {
      const mockOnComplete = jest.fn();
      const mockOnViewResults = jest.fn();

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          onViewResults={mockOnViewResults}
        />
      );

      // Simulate receiving completion message
      const mockOnMessage = jest.fn();
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'message') {
          mockOnMessage.mockImplementation(callback);
        }
      });

      act(() => {
        mockOnMessage({
          data: JSON.stringify({
            type: 'completion',
            searchId: mockSearchId,
            status: 'completed',
            results: {
              totalContacts: 15,
              totalSources: 8,
              processingTime: 45000,
              statistics: {
                totalQueries: 10,
                completedQueries: 10,
                foundContacts: 15,
                processingRate: 2.5,
                averageTimePerQuery: 4.5,
                successRate: 100,
                errorCount: 0,
                retryCount: 0,
                cacheHitRate: 30,
                costBreakdown: {
                  queryGeneration: 0.001,
                  webSearch: 0.008,
                  contentScraping: 0.002,
                  contactExtraction: 0.004,
                  total: 0.015
                }
              }
            },
            timestamp: new Date()
          })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('expands and collapses details when clicking expand button', async () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const expandButton = screen.getByLabelText('Expand');
      expect(expandButton).toBeInTheDocument();

      await userEvent.click(expandButton);

      // Should show stage details when expanded
      expect(screen.getByText('Stage Details')).toBeInTheDocument();

      const collapseButton = screen.getByLabelText('Collapse');
      await userEvent.click(collapseButton);

      // Stage details should be hidden when collapsed
      expect(screen.queryByText('Stage Details')).not.toBeInTheDocument();
    });

    it('calls cancel handler when cancel button is clicked', async () => {
      const mockOnCancel = jest.fn().mockResolvedValue(undefined);
      (global.fetch as any).mockResolvedValue({ ok: true });

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();

      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledWith(mockSearchId);
      });
    });

    it('calls view results handler when view results button is clicked', async () => {
      const mockOnViewResults = jest.fn();

      const completedProgress = {
        ...mockInitialProgress,
        percentage: 100,
        stage: 'completed' as any,
        message: 'Search completed successfully'
      };

      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={completedProgress}
          onViewResults={mockOnViewResults}
        />
      );

      const viewResultsButton = screen.getByRole('button', { name: /view results/i });
      await userEvent.click(viewResultsButton);

      expect(mockOnViewResults).toHaveBeenCalledWith(mockSearchId);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      const progressRegion = screen.getByRole('region');
      expect(progressRegion).toHaveAttribute('aria-label');
      expect(progressRegion.getAttribute('aria-label')).toContain('Search progress');
    });

    it('announces progress updates to screen readers', async () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      // Check for live region attributes
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      const expandButton = screen.getByLabelText('Expand');
      expandButton.focus();
      expect(expandButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      expect(screen.getByText('Stage Details')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large progress data', () => {
      const largeProgress = {
        ...mockInitialProgress,
        stageProgress: {
          queryGeneration: 100,
          webSearch: 75,
          contentScraping: 50,
          contactExtraction: 25,
          resultAggregation: 10,
          finalization: 0
        }
      };

      const startTime = performance.now();
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={largeProgress}
        />
      );
      const renderTime = performance.now() - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('handles rapid progress updates efficiently', async () => {
      render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
        />
      );

      const mockOnMessage = jest.fn();
      mockWebSocket.addEventListener.mockImplementation((event, callback) => {
        if (event === 'message') {
          mockOnMessage.mockImplementation(callback);
        }
      });

      // Send multiple rapid updates
      for (let i = 30; i <= 70; i += 10) {
        act(() => {
          mockOnMessage({
            data: JSON.stringify({
              type: 'progress_update',
              searchId: mockSearchId,
              progress: {
                percentage: i,
                message: `Processing ${i}% complete...`
              },
              timestamp: new Date()
            })
          });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('70%')).toBeInTheDocument();
      });
    });
  });
});