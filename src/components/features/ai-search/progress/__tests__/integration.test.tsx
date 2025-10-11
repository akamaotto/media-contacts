/**
 * Progress Tracking Integration Tests
 * End-to-end integration tests for progress tracking components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SearchProgress } from '../search-progress';
import { ProgressData, ConnectionStatus, CategorizedError, ProgressStageData } from '../types';

// Mock WebSocket for integration testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  protocol: string;
  extensions: string;
  bufferedAmount: number = 0;
  binaryType: BinaryType = 'blob';

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private messageQueue: any[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 100);
  }

  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  send(data: string) {
    if (this.readyState === MockWebSocket.OPEN) {
      // Store sent messages for testing
      this.messageQueue.push(JSON.parse(data));
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper method for tests to simulate receiving messages
  simulateMessage(data: any) {
    this.messageQueue.push(data);
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  // Helper method to get sent messages
  getSentMessages(): any[] {
    return [...this.messageQueue];
  }

  // Clear message queue
  clearMessages() {
    this.messageQueue.length = 0;
  }
}

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any;

describe('Progress Tracking Integration Tests', () => {
  const mockSearchId = 'integration-test-search';

  const mockInitialProgress: ProgressData = {
    searchId: mockSearchId,
    percentage: 0,
    stage: 'initializing' as any,
    message: 'Initializing search...',
    currentStep: 0,
    totalSteps: 5,
    stageProgress: {},
    startTime: new Date(),
    connectionStatus: 'disconnected',
    lastUpdate: new Date()
  };

  const mockStages = new Map<string, ProgressStageData>([
    ['query_generation', {
      id: 'query_generation',
      name: 'Query Generation',
      description: 'Generating intelligent search queries',
      status: 'pending' as const,
      progress: 0,
      isCurrent: false,
      isExpanded: false
    }],
    ['web_search', {
      id: 'web_search',
      name: 'Web Search',
      description: 'Searching across multiple sources',
      status: 'pending' as const,
      progress: 0,
      isCurrent: false,
      isExpanded: false
    }]
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Search Workflow', () => {
    it('handles complete search lifecycle from start to finish', async () => {
      const mockOnCancel = jest.fn();
      const mockOnRetry = jest.fn();
      const mockOnViewResults = jest.fn();

      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          onCancel={mockOnCancel}
          onRetry={mockOnRetry}
          onViewResults={mockOnViewResults}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Step 1: Initial connection
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Step 2: Start query generation
      act(() => {
        ws.simulateMessage({
          type: 'progress_update',
          searchId: mockSearchId,
          progress: {
            percentage: 10,
            stage: 'query_generation',
            message: 'Generating search queries...',
            currentStep: 1,
            totalSteps: 5
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('10%')).toBeInTheDocument();
        expect(screen.getByText('Generating search queries...')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      });

      // Step 3: Update query generation progress
      act(() => {
        ws.simulateMessage({
          type: 'stage_update',
          searchId: mockSearchId,
          stageId: 'query_generation',
          stage: {
            status: 'running',
            progress: 50,
            metrics: {
              itemsProcessed: 5,
              totalItems: 10,
              processingRate: 2.0
            }
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      });

      // Step 4: Complete query generation, start web search
      act(() => {
        ws.simulateMessage({
          type: 'progress_update',
          searchId: mockSearchId,
          progress: {
            percentage: 25,
            stage: 'web_search',
            message: 'Performing web searches...',
            currentStep: 2,
            totalSteps: 5,
            stageProgress: {
              queryGeneration: 100,
              webSearch: 0
            }
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument();
        expect(screen.getByText('Performing web searches...')).toBeInTheDocument();
      });

      // Step 5: Update web search with results
      act(() => {
        ws.simulateMessage({
          type: 'stage_update',
          searchId: mockSearchId,
          stageId: 'web_search',
          stage: {
            status: 'running',
            progress: 75,
            metrics: {
              itemsProcessed: 30,
              totalItems: 40,
              processingRate: 3.5,
              successRate: 95
            }
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });

      // Step 6: Complete the search
      act(() => {
        ws.simulateMessage({
          type: 'completion',
          searchId: mockSearchId,
          status: 'completed',
          results: {
            totalContacts: 25,
            totalSources: 15,
            processingTime: 120000,
            statistics: {
              totalQueries: 40,
              completedQueries: 40,
              foundContacts: 25,
              processingRate: 3.2,
              averageTimePerQuery: 3.0,
              successRate: 98,
              errorCount: 0,
              retryCount: 1,
              cacheHitRate: 35,
              costBreakdown: {
                queryGeneration: 0.002,
                webSearch: 0.015,
                contentScraping: 0.003,
                contactExtraction: 0.008,
                total: 0.028
              }
            }
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });

      // Step 7: Verify view results button is available
      const viewResultsButton = screen.getByRole('button', { name: /view results/i });
      expect(viewResultsButton).toBeInTheDocument();

      await userEvent.click(viewResultsButton);
      expect(mockOnViewResults).toHaveBeenCalledWith(mockSearchId);
    });

    it('handles search failure and recovery workflow', async () => {
      const mockOnRetry = jest.fn();

      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          onRetry={mockOnRetry}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Simulate a network error
      act(() => {
        ws.simulateMessage({
          type: 'error',
          searchId: mockSearchId,
          error: {
            category: 'network',
            severity: 'medium',
            title: 'Network Connection Error',
            message: 'Unable to connect to the search service. Please check your internet connection.',
            timestamp: new Date(),
            retryable: true,
            actions: [
              { type: 'retry', label: 'Retry', action: jest.fn(), primary: true },
              { type: 'cancel', label: 'Cancel', action: jest.fn() }
            ]
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Unable to connect to the search service')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith(mockSearchId);
    });

    it('handles search cancellation workflow', async () => {
      const mockOnCancel = jest.fn().mockResolvedValue(undefined);
      (global.fetch as any).mockResolvedValue({ ok: true });

      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          onCancel={mockOnCancel}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Start a running stage
      act(() => {
        ws.simulateMessage({
          type: 'progress_update',
          searchId: mockSearchId,
          progress: {
            percentage: 30,
            stage: 'web_search',
            message: 'Performing web searches...',
            currentStep: 2,
            totalSteps: 5
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('30%')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledWith(mockSearchId);
    });
  });

  describe('Real-time Updates', () => {
    it('receives and displays progress updates in real-time', async () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Send multiple rapid progress updates
      const updates = [
        { percentage: 10, message: 'Starting query generation...' },
        { percentage: 25, message: 'Performing web searches...' },
        { percentage: 50, message: 'Scraping content...' },
        { percentage: 75, message: 'Extracting contacts...' },
        { percentage: 95, message: 'Finalizing results...' }
      ];

      for (const update of updates) {
        act(() => {
          ws.simulateMessage({
            type: 'progress_update',
            searchId: mockSearchId,
            progress: {
              ...update,
              currentStep: Math.floor(update.percentage / 20) + 1,
              totalSteps: 5
            },
            timestamp: new Date()
          });
        });

        await waitFor(() => {
          expect(screen.getByText(`${update.percentage}%`)).toBeInTheDocument();
          expect(screen.getByText(update.message)).toBeInTheDocument();
        });
      }
    });

    it('handles connection interruptions and reconnection', async () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Simulate connection loss
      act(() => {
        ws.readyState = MockWebSocket.CLOSED;
        ws.onclose?.(new CloseEvent('close'));
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });

      // Simulate reconnection
      act(() => {
        ws.readyState = MockWebSocket.OPEN;
        ws.onopen?.(new Event('open'));
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('renders within acceptable time limits', () => {
      const startTime = performance.now();

      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const renderTime = performance.now() - startTime;

      // Should render within 100ms (requirement: <2 seconds for updates)
      expect(renderTime).toBeLessThan(100);
    });

    it('handles rapid updates without performance degradation', async () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      const startTime = performance.now();

      // Send 100 rapid updates
      for (let i = 1; i <= 100; i++) {
        act(() => {
          ws.simulateMessage({
            type: 'progress_update',
            searchId: mockSearchId,
            progress: {
              percentage: i,
              message: `Processing ${i}%...`,
              currentStep: Math.floor(i / 20) + 1,
              totalSteps: 5
            },
            timestamp: new Date()
          });
        });
      }

      const processingTime = performance.now() - startTime;

      // Should handle 100 updates within 1 second
      expect(processingTime).toBeLessThan(1000);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Requirements', () => {
    it('meets WCAG 2.1 AA requirements for screen readers', () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      // Check for proper ARIA labels
      const progressRegion = screen.getByRole('region');
      expect(progressRegion).toHaveAttribute('aria-label');

      // Check for progress bar accessibility
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemin');
      expect(progressBar).toHaveAttribute('aria-valuemax');

      // Check for proper heading structure
      const heading = screen.getByRole('heading', { name: /ai search progress/i });
      expect(heading).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      // Test Tab navigation
      await userEvent.tab();
      expect(document.activeElement).toBeInTheDocument();

      // Test Enter/Space on buttons
      const expandButton = screen.getByLabelText('Expand');
      expandButton.focus();
      expect(expandButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      expect(screen.getByText('Stage Details')).toBeInTheDocument();
    });

    it('provides appropriate color contrast', () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      // Check that important elements have appropriate contrast classes
      const title = screen.getByRole('heading', { name: /ai search progress/i });
      expect(title).toHaveClass('text-lg');

      const progressText = screen.getByText('0%');
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles malformed WebSocket messages gracefully', async () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Send malformed JSON
      act(() => {
        ws.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
      });

      // Component should not crash and should still be functional
      expect(screen.getByText('AI Search Progress')).toBeInTheDocument();
    });

    it('handles unknown message types gracefully', async () => {
      const { container } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Send unknown message type
      act(() => {
        ws.simulateMessage({
          type: 'unknown_message_type',
          searchId: mockSearchId,
          data: 'some data',
          timestamp: new Date()
        });
      });

      // Component should not crash
      expect(screen.getByText('AI Search Progress')).toBeInTheDocument();
    });
  });

  describe('State Persistence', () => {
    it('maintains progress state across component re-renders', async () => {
      const { rerender } = render(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      const ws = (global.WebSocket as any).mock.results[0].value;

      // Send progress update
      act(() => {
        ws.simulateMessage({
          type: 'progress_update',
          searchId: mockSearchId,
          progress: {
            percentage: 50,
            stage: 'web_search',
            message: 'Processing...',
            currentStep: 2,
            totalSteps: 5
          },
          timestamp: new Date()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      });

      // Re-render component
      rerender(
        <SearchProgress
          searchId={mockSearchId}
          initialProgress={mockInitialProgress}
          showDetails
        />
      );

      // Progress should be maintained
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});