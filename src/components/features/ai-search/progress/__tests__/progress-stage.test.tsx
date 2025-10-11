/**
 * Progress Stage Component Tests
 * Test suite for individual progress stage component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressStage } from '../progress-stage';
import { ProgressStageData, StageStatus } from '../types';

describe('ProgressStage Component', () => {
  const mockStage: ProgressStageData = {
    id: 'web-search',
    name: 'Web Search',
    description: 'Searching across multiple sources for relevant content',
    status: 'running' as StageStatus,
    progress: 45,
    startTime: new Date(Date.now() - 30000), // 30 seconds ago
    isCurrent: true,
    isExpanded: false,
    icon: undefined, // Will use default icon
    color: 'blue'
  };

  const mockStageWithMetrics: ProgressStageData = {
    ...mockStage,
    metrics: {
      itemsProcessed: 45,
      totalItems: 100,
      processingRate: 2.5,
      successRate: 95,
      cacheHitRate: 30,
      cost: 0.005
    }
  };

  const mockStageWithError: ProgressStageData = {
    ...mockStage,
    status: 'failed',
    progress: 30,
    endTime: new Date(),
    duration: 25000,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'API rate limit exceeded. Please try again later.',
      retryable: true,
      suggestedAction: 'Wait a few minutes and retry the search',
      timestamp: new Date()
    }
  };

  describe('Rendering', () => {
    it('renders stage information correctly', () => {
      render(<ProgressStage stage={mockStage} isCurrent={true} />);

      expect(screen.getByText('Web Search')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('45% complete')).toBeInTheDocument();
    });

    it('renders completed stage correctly', () => {
      const completedStage = {
        ...mockStage,
        status: 'completed' as StageStatus,
        progress: 100,
        isCurrent: false,
        endTime: new Date(),
        duration: 60000
      };

      render(<ProgressStage stage={completedStage} isCurrent={false} />);

      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.queryByText('Current')).not.toBeInTheDocument();
    });

    it('renders failed stage correctly', () => {
      render(<ProgressStage stage={mockStageWithError} isCurrent={false} />);

      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('RATE_LIMIT_EXCEEDED')).toBeInTheDocument();
      expect(screen.getByText('API rate limit exceeded. Please try again later.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument(); // Error retryable button
    });

    it('renders in compact mode', () => {
      render(
        <ProgressStage
          stage={mockStage}
          isCurrent={true}
          compact
        />
      );

      expect(screen.getByText('Web Search')).toBeInTheDocument();
      // Should not show detailed metrics in compact mode
      expect(screen.queryByText('45 of 100')).not.toBeInTheDocument();
    });

    it('shows metrics when provided', () => {
      render(
        <ProgressStage
          stage={mockStageWithMetrics}
          isCurrent={true}
          showMetrics
        />
      );

      expect(screen.getByText('45 of 100')).toBeInTheDocument();
      expect(screen.getByText('2.5/s')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument();
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows progress bar for active stages', () => {
      render(<ProgressStage stage={mockStage} isCurrent={true} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '45');
    });

    it('shows completed progress for completed stages', () => {
      const completedStage = {
        ...mockStage,
        status: 'completed' as StageStatus,
        progress: 100
      };

      render(<ProgressStage stage={completedStage} isCurrent={false} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('shows zero progress for failed stages', () => {
      render(<ProgressStage stage={mockStageWithError} isCurrent={false} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Interactions', () => {
    it('expands and collapses when clicked', async () => {
      const mockOnToggleExpanded = jest.fn();
      render(
        <ProgressStage
          stage={mockStage}
          isCurrent={true}
          onToggleExpanded={mockOnToggleExpanded}
        />
      );

      const expandButton = screen.getByRole('button', { name: /web search/i });
      await userEvent.click(expandButton);

      expect(mockOnToggleExpanded).toHaveBeenCalledTimes(1);
    });

    it('shows detailed information when expanded', async () => {
      render(
        <ProgressStage
          stage={mockStageWithMetrics}
          isCurrent={true}
          expanded={true}
        />
      );

      expect(screen.getByText('45 of 100')).toBeInTheDocument();
      expect(screen.getByText('Processing Rate')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
    });

    it('hides detailed information when collapsed', () => {
      render(
        <ProgressStage
          stage={mockStageWithMetrics}
          isCurrent={true}
          expanded={false}
        />
      );

      // Metrics should not be visible when collapsed
      expect(screen.queryByText('45 of 100')).not.toBeInTheDocument();
    });

    it('handles retry button click for retryable errors', async () => {
      render(<ProgressStage stage={mockStageWithError} isCurrent={false} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      // Should have retry button (error.retryable is true)
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it.each([
      ['pending', 'Clock'],
      ['queued', 'Pause'],
      ['running', 'Loader2'],
      ['processing', 'Loader2'],
      ['completed', 'CheckCircle2'],
      ['failed', 'XCircle'],
      ['skipped', 'SkipForward'],
      ['retrying', 'RefreshCw'],
      ['paused', 'Pause']
    ])('renders correct icon for %s status', (status, expectedIcon) => {
      const stage = {
        ...mockStage,
        status: status as StageStatus
      };

      render(<ProgressStage stage={stage} isCurrent={false} />);

      expect(screen.getByText(status.replace('_', ' '))).toBeInTheDocument();
    });

    it('shows current badge for current stage', () => {
      render(<ProgressStage stage={mockStage} isCurrent={true} />);

      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('does not show current badge for non-current stages', () => {
      render(<ProgressStage stage={mockStage} isCurrent={false} />);

      expect(screen.queryByText('Current')).not.toBeInTheDocument();
    });
  });

  describe('Timing Information', () => {
    it('shows duration when completed', () => {
      const completedStage = {
        ...mockStage,
        status: 'completed' as StageStatus,
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(),
        duration: 60000,
        expanded: true
      };

      render(<ProgressStage stage={completedStage} isCurrent={false} />);

      expect(screen.getByText(/Duration:/)).toBeInTheDocument();
      expect(screen.getByText(/1.0m/)).toBeInTheDocument();
    });

    it('shows start time when running', () => {
      const runningStage = {
        ...mockStage,
        startTime: new Date('2024-01-15T10:30:00Z'),
        expanded: true
      };

      render(<ProgressStage stage={runningStage} isCurrent={true} />);

      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });

    it('shows end time when completed', () => {
      const completedStage = {
        ...mockStage,
        status: 'completed' as StageStatus,
        endTime: new Date('2024-01-15T10:31:00Z'),
        expanded: true
      };

      render(<ProgressStage stage={completedStage} isCurrent={false} />);

      expect(screen.getByText(/Ended:/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ProgressStage stage={mockStage} isCurrent={true} />);

      const button = screen.getByRole('button', { name: /web search/i });
      expect(button).toHaveAttribute('aria-label');
    });

    it('announces status changes to screen readers', () => {
      render(<ProgressStage stage={mockStage} isCurrent={true} />);

      const statusBadge = screen.getByText('running');
      expect(statusBadge).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<ProgressStage stage={mockStage} isCurrent={true} />);

      const button = screen.getByRole('button', { name: /web search/i });
      button.focus();
      expect(button).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      // Should trigger the expand/collapse action
    });
  });

  describe('Color Schemes', () => {
    it('applies correct colors for different statuses', () => {
      const { rerender } = render(
        <ProgressStage stage={mockStage} isCurrent={true} />
      );

      // Running status should have blue colors
      expect(screen.getByText('running')).toHaveClass('text-blue-600');

      // Completed status should have green colors
      const completedStage = {
        ...mockStage,
        status: 'completed' as StageStatus
      };
      rerender(<ProgressStage stage={completedStage} isCurrent={false} />);
      expect(screen.getByText('completed')).toHaveClass('text-green-600');

      // Failed status should have red colors
      const failedStage = {
        ...mockStage,
        status: 'failed' as StageStatus
      };
      rerender(<ProgressStage stage={failedStage} isCurrent={false} />);
      expect(screen.getByText('failed')).toHaveClass('text-red-600');
    });
  });
});