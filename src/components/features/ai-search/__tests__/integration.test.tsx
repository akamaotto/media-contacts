/**
 * Integration Tests for AI Search Components
 * Tests the complete user flow from modal opening to search submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FindContactsModal } from '../find-contacts-modal';

// Mock fetch API for all components
global.fetch = jest.fn();

// Mock data for API responses
const mockCountries = [
  { id: '1', name: 'United States', code: 'US', count: 100, region: 'North America' },
  { id: '2', name: 'United Kingdom', code: 'GB', count: 50, region: 'Europe' },
  { id: '3', name: 'Germany', code: 'DE', count: 40, region: 'Europe' },
  { id: '4', name: 'Canada', code: 'CA', count: 30, region: 'North America' },
  { id: '5', name: 'France', code: 'FR', count: 35, region: 'Europe' }
];

const mockCategories = [
  {
    id: '1',
    name: 'Technology',
    description: 'Tech news and analysis',
    children: [
      { id: '1.1', name: 'AI & Machine Learning', description: 'AI coverage' },
      { id: '1.2', name: 'Software', description: 'Software development' }
    ]
  },
  {
    id: '2',
    name: 'Business',
    description: 'Business news',
    children: [
      { id: '2.1', name: 'Startups', description: 'Startup coverage' }
    ]
  }
];

const mockBeats = [
  { id: '1', name: 'Artificial Intelligence', description: 'AI and ML coverage', count: 25 },
  { id: '2', name: 'Machine Learning', description: 'ML algorithms and applications', count: 15 },
  { id: '3', name: 'Technology Policy', description: 'Tech regulation and policy', count: 10 },
  { id: '4', name: 'Startups', description: 'Startup ecosystem', count: 20 }
];

describe('AI Search Components Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup fetch mocks
    (fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/countries')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: mockCountries })
        });
      } else if (url.includes('/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: mockCategories })
        });
      } else if (url.includes('/beats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: mockBeats })
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });
    });

    // Mock performance API
    global.performance = {
      ...global.performance,
      now: jest.fn(() => Date.now())
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Complete User Flow', () => {
    it('should handle complete user flow from modal opening to successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const mockOnClose = jest.fn();

      render(
        <FindContactsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Step 1: Modal opens and shows form
      expect(screen.getByText('AI-Powered Contact Search')).toBeInTheDocument();
      expect(screen.getByText('Configure your search criteria and let AI find relevant media contacts')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/describe what type of media contacts/i)).toBeInTheDocument();

      // Step 2: User fills in search query
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists covering AI and machine learning innovations in European startups');

      // Step 3: User opens country selector and selects countries
      const countryTrigger = screen.getByRole('combobox', { name: /select countries/i });
      await user.click(countryTrigger);

      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      });

      // Select United Kingdom
      const ukOption = screen.getByText('United Kingdom');
      await user.click(ukOption);

      // Select Germany
      const germanyOption = screen.getByText('Germany');
      await user.click(germanyOption);

      // Close country selector
      await user.keyboard('{Escape}');

      // Verify countries are selected
      expect(screen.getByText('GB')).toBeInTheDocument();
      expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      expect(screen.getByText('DE')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();

      // Step 4: User expands media categories
      const categoriesCard = screen.getByText('Media Categories');
      expect(categoriesCard).toBeInTheDocument();

      // Note: Category selector would need to be implemented to test this part fully

      // Step 5: User expands beats selector
      const beatsCard = screen.getByText('Topics & Beats');
      expect(beatsCard).toBeInTheDocument();

      const beatTrigger = screen.getByRole('combobox', { name: /select beats/i });
      await user.click(beatTrigger);

      await waitFor(() => {
        expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
      });

      // Select AI beat
      const aiBeat = screen.getByText('Artificial Intelligence');
      await user.click(aiBeat);

      // Add custom beat
      const customBeatInput = screen.getByPlaceholderText('Add custom beat...');
      await user.type(customBeatInput, 'Deep Learning');
      await user.keyboard('{Enter}');

      // Verify beats are selected
      expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Deep Learning')).toBeInTheDocument();

      // Step 6: User expands advanced options
      const advancedOptions = screen.getByText('Advanced Search Options');
      await user.click(advancedOptions);

      await waitFor(() => {
        expect(screen.getByTestId('search-options-form')).toBeInTheDocument();
      });

      // Adjust max queries
      const maxQueriesInput = screen.getByTestId('max-queries-input');
      await user.clear(maxQueriesInput);
      await user.type(maxQueriesInput, '15');

      // Adjust diversity threshold
      const diversitySlider = screen.getByDisplayValue('70%');
      expect(diversitySlider).toBeInTheDocument();

      // Step 7: User submits the form
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      // Step 8: Verify loading state
      await waitFor(() => {
        expect(screen.getByText('AI Search in Progress')).toBeInTheDocument();
        expect(screen.getByText('Initializing AI search...')).toBeInTheDocument();
      });

      // Step 9: Progress through the stages
      jest.advanceTimersByTime(500);
      await waitFor(() => {
        expect(screen.getByText('Analyzing search criteria...')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(500);
      await waitFor(() => {
        expect(screen.getByText('Generating intelligent queries...')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(500);
      await waitFor(() => {
        expect(screen.getByText('Scoring and ranking queries...')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(screen.getByText('Search Initiated Successfully!')).toBeInTheDocument();
      });

      // Step 10: Verify submission data
      expect(mockOnSubmit).toHaveBeenCalledWith({
        query: 'Technology journalists covering AI and machine learning innovations in European startups',
        countries: ['United Kingdom', 'Germany'],
        categories: [],
        beats: ['Artificial Intelligence', 'Deep Learning'],
        options: expect.objectContaining({
          maxQueries: 15,
          diversityThreshold: 0.7,
          enableAIEnhancement: true,
          priority: 'medium'
        })
      });

      // Step 11: User can view results or start new search
      expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start New Search' })).toBeInTheDocument();
    });

    it('should handle validation errors and recovery', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <FindContactsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Query must be at least 3 characters long/)).toBeInTheDocument();
        expect(screen.getByText(/At least one country must be selected/)).toBeInTheDocument();
      });

      // onSubmit should not have been called
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Fix validation errors
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      const countryTrigger = screen.getByRole('combobox', { name: /select countries/i });
      await user.click(countryTrigger);

      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
      });

      const usOption = screen.getByText('United States');
      await user.click(usOption);

      // Try submitting again
      await user.click(submitButton);

      // Should proceed to submission (mock implementation)
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Search service unavailable'));
      const mockOnClose = jest.fn();

      // Mock fetch to fail
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <FindContactsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Try to use country selector (should fail gracefully)
      const countryTrigger = screen.getByRole('combobox', { name: /select countries/i });
      await user.click(countryTrigger);

      // Component should still be usable even if API fails
      expect(screen.getByPlaceholderText(/describe what type of media contacts/i)).toBeInTheDocument();

      // Fill form manually
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      // Submit and handle error
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Search Failed')).toBeInTheDocument();
        expect(screen.getByText('Search service unavailable')).toBeInTheDocument();
      });

      // Should provide recovery options
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should integrate all form components correctly', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const mockOnClose = jest.fn();

      render(
        <FindContactsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          initialData={{
            query: 'AI researchers in Europe',
            countries: ['Germany', 'France'],
            categories: ['Technology'],
            beats: ['Machine Learning'],
            options: {
              maxQueries: 20,
              enableAIEnhancement: false
            }
          }}
        />
      );

      // Should show initial data
      expect(screen.getByDisplayValue('AI researchers in Europe')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();

      // User should be able to modify initial data
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.clear(queryInput);
      await user.type(queryInput, 'Updated: AI researchers in Europe and Asia');

      // Advanced options should show initial values
      const advancedOptions = screen.getByText('Advanced Search Options');
      await user.click(advancedOptions);

      await waitFor(() => {
        const maxQueriesInput = screen.getByTestId('max-queries-input');
        expect(maxQueriesInput).toHaveValue(20);
      });

      // Submit modified data
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'Updated: AI researchers in Europe and Asia',
            countries: ['Germany', 'France'],
            options: expect.objectContaining({
              maxQueries: 20,
              enableAIEnhancement: false
            })
          })
        );
      });
    });
  });

  describe('Performance Integration', () => {
    it('should track performance across all components', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Set development mode to see performance warnings
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <FindContactsModal
          isOpen={true}
          onClose={jest.fn()}
          onSubmit={mockOnSubmit}
        />
      );

      // Simulate slow operations
      jest.advanceTimersByTime(150);

      // Complete the flow
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Test query');

      const countryTrigger = screen.getByRole('combobox', { name: /select countries/i });
      await user.click(countryTrigger);

      // Submit
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Complete submission
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Modal open time')
        );
      });

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility throughout the user flow', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

      render(
        <FindContactsModal
          isOpen={true}
          onClose={jest.fn()}
          onSubmit={mockOnSubmit}
        />
      );

      // Check initial accessibility
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'AI Search Configuration');

      // Check form structure
      expect(screen.getByRole('form')).toBeInTheDocument();

      // Check keyboard navigation
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      queryInput.focus();

      // Tab through form fields
      await user.tab();
      // Should move to next interactive element

      // Complete the flow and check state changes
      await user.type(queryInput, 'Technology journalists');
      await user.keyboard('{Tab}');

      // Submit and check progress announcements
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(dialog).toHaveAttribute('aria-label', 'AI Search Progress');
        expect(screen.getByText('Progress')).toBeInTheDocument();
      });
    });
  });
});