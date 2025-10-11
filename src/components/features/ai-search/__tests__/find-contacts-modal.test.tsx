/**
 * Unit Tests for FindContactsModal Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FindContactsModal } from '../find-contacts-modal';
import { FindContactsModalProps } from '../types';

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now())
};

const defaultProps: FindContactsModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
  loading: false
};

describe('FindContactsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the modal when isOpen is true', () => {
      render(<FindContactsModal {...defaultProps} />);

      expect(screen.getByText('AI-Powered Contact Search')).toBeInTheDocument();
      expect(screen.getByText('Configure your search criteria and let AI find relevant media contacts')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render the modal when isOpen is false', () => {
      const props = { ...defaultProps, isOpen: false };
      render(<FindContactsModal {...props} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display initial data when provided', () => {
      const props = {
        ...defaultProps,
        initialData: {
          query: 'Technology journalists',
          countries: ['United States'],
          categories: ['Technology'],
          beats: ['AI'],
          options: {
            maxQueries: 20
          }
        }
      };

      render(<FindContactsModal {...props} />);

      expect(screen.getByDisplayValue('Technology journalists')).toBeInTheDocument();
    });

    it('should show correct title and description in different states', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockImplementation(() => {
        // Simulate successful submission
        return Promise.resolve();
      });
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Initial state
      expect(screen.getByText('AI-Powered Contact Search')).toBeInTheDocument();

      // Fill form and submit to see different states
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists in Europe');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United Kingdom');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByText('Processing Search')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      const props = { ...defaultProps, onClose: mockOnClose };

      render(<FindContactsModal {...props} />);

      const closeButton = screen.getByLabelText('Close search form');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when escape key is pressed', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      const props = { ...defaultProps, onClose: mockOnClose };

      render(<FindContactsModal {...props} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close during submission', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      const mockOnSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      const props = {
        ...defaultProps,
        onClose: mockOnClose,
        onSubmit: mockOnSubmit
      };

      render(<FindContactsModal {...props} />);

      // Start submission
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Try to close during submission
      const closeButton = screen.getByLabelText('Close search form');
      await user.click(closeButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission Flow', () => {
    it('should show progress steps during submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockImplementation(() => {
        // Simulate the progress steps
        return new Promise(resolve => {
          setTimeout(resolve, 500);
        });
      });
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Fill form
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByText('AI Search in Progress')).toBeInTheDocument();
        expect(screen.getByText('Initializing AI search...')).toBeInTheDocument();
      });

      // Advance timers to see progress updates
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(screen.getByText('Analyzing search criteria...')).toBeInTheDocument();
      });
    });

    it('should show success state when submission completes', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Fill and submit form
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Fast forward through all progress steps
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.getByText('Search Initiated Successfully!')).toBeInTheDocument();
        expect(screen.getByText('Your AI-powered search has been initiated successfully!')).toBeInTheDocument();
      });
    });

    it('should show error state when submission fails', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('API Error'));
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Fill and submit form
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Search Failed')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should call onSubmit with correct form data', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Fill form with specific data
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'AI researchers and journalists in Europe');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'Germany, France');

      const maxQueriesInput = screen.getByTestId('max-queries-input');
      await user.clear(maxQueriesInput);
      await user.type(maxQueriesInput, '15');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          query: 'AI researchers and journalists in Europe',
          countries: ['Germany', 'France'],
          categories: [],
          beats: [],
          options: expect.objectContaining({
            maxQueries: 15
          })
        });
      });
    });
  });

  describe('State Management', () => {
    it('should reset to form state after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Complete submission flow
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Complete the progress
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.getByText('View Results')).toBeInTheDocument();
      });

      // Click "Start New Search" to reset
      const newSearchButton = screen.getByRole('button', { name: 'Start New Search' });
      await user.click(newSearchButton);

      await waitFor(() => {
        expect(screen.getByText('AI-Powered Contact Search')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/describe what type of media contacts/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error state', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // First submission fails
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Search Failed')).toBeInTheDocument();
      });

      // Try again
      const retryButton = screen.getByRole('button', { name: 'Try Again' });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('AI-Powered Contact Search')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tracking', () => {
    it('should track modal open time', () => {
      render(<FindContactsModal {...defaultProps} />);

      expect(performance.now).toHaveBeenCalled();
    });

    it('should log performance warnings in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<FindContactsModal {...defaultProps} />);

      // Simulate slow modal open
      jest.advanceTimersByTime(150);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Modal open time')
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FindContactsModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'AI Search Configuration');
    });

    it('should trap focus within modal', () => {
      render(<FindContactsModal {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      expect(queryInput).toHaveFocus();
    });

    it('should update ARIA label based on state', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Initial state
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'AI Search Configuration');

      // Start submission
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(dialog).toHaveAttribute('aria-label', 'AI Search Progress');
      });
    });

    it('should announce progress to screen readers', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Start submission
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Progress information should be available to screen readers
        expect(screen.getByText('Progress')).toBeInTheDocument();
        expect(screen.getByText('10%')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when loading prop is true', () => {
      const props = {
        ...defaultProps,
        loading: true
      };

      render(<FindContactsModal {...props} />);

      // Form should be disabled
      expect(screen.getByPlaceholderText(/describe what type of media contacts/i)).toBeDisabled();
    });
  });

  describe('Feature Highlights', () => {
    it('should display feature highlights during generation', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<FindContactsModal {...props} />);

      // Start submission
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('AI-Powered')).toBeInTheDocument();
        expect(screen.getByText('Intelligent query generation')).toBeInTheDocument();
        expect(screen.getByText('Multi-Source')).toBeInTheDocument();
        expect(screen.getByText('Search across multiple platforms')).toBeInTheDocument();
        expect(screen.getByText('Verified')).toBeInTheDocument();
        expect(screen.getByText('Contact verification process')).toBeInTheDocument();
      });
    });
  });
});