/**
 * Unit Tests for SearchForm Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SearchForm } from '../search-form';
import { SearchFormProps } from '../types';

// Mock the sub-components
jest.mock('../country-selector', () => ({
  CountrySelector: ({ value, onChange, disabled, error }: any) => (
    <div data-testid="country-selector">
      <input
        data-testid="country-input"
        value={value.join(',')}
        onChange={(e) => onChange(e.target.value.split(','))}
        disabled={disabled}
      />
      {error && <span data-testid="country-error">{error}</span>}
    </div>
  )
}));

jest.mock('../category-selector', () => ({
  CategorySelector: ({ value, onChange, disabled, error }: any) => (
    <div data-testid="category-selector">
      <input
        data-testid="category-input"
        value={value.join(',')}
        onChange={(e) => onChange(e.target.value.split(','))}
        disabled={disabled}
      />
      {error && <span data-testid="category-error">{error}</span>}
    </div>
  )
}));

jest.mock('../beat-selector', () => ({
  BeatSelector: ({ value, onChange, disabled, error }: any) => (
    <div data-testid="beat-selector">
      <input
        data-testid="beat-input"
        value={value.join(',')}
        onChange={(e) => onChange(e.target.value.split(','))}
        disabled={disabled}
      />
      {error && <span data-testid="beat-error">{error}</span>}
    </div>
  )
}));

jest.mock('../search-options-form', () => ({
  SearchOptionsForm: ({ value, onChange, disabled }: any) => (
    <div data-testid="search-options-form">
      <input
        data-testid="max-queries-input"
        type="number"
        value={value.maxQueries || 10}
        onChange={(e) => onChange({ ...value, maxQueries: parseInt(e.target.value) })}
        disabled={disabled}
      />
    </div>
  )
}));

const defaultProps: SearchFormProps = {
  onSubmit: jest.fn(),
  initialValues: undefined,
  loading: false,
  disabled: false
};

describe('SearchForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the form correctly', () => {
      render(<SearchForm {...defaultProps} />);

      expect(screen.getByText('AI-Powered Contact Search')).toBeInTheDocument();
      expect(screen.getByText('Search Query')).toBeInTheDocument();
      expect(screen.getByText('Geographic Coverage')).toBeInTheDocument();
      expect(screen.getByText('Media Categories')).toBeInTheDocument();
      expect(screen.getByText('Topics & Beats')).toBeInTheDocument();
      expect(screen.getByText('Advanced Search Options')).toBeInTheDocument();
    });

    it('should display initial values when provided', () => {
      const props = {
        ...defaultProps,
        initialValues: {
          query: 'Technology journalists',
          countries: ['United States', 'United Kingdom'],
          categories: ['Technology'],
          beats: ['AI', 'Machine Learning'],
          options: {
            maxQueries: 20,
            enableAIEnhancement: false
          }
        }
      };

      render(<SearchForm {...props} />);

      expect(screen.getByDisplayValue('Technology journalists')).toBeInTheDocument();
    });

    it('should show loading state when loading prop is true', () => {
      const props = {
        ...defaultProps,
        loading: true
      };

      render(<SearchForm {...props} />);

      // The form should still be rendered but disabled
      expect(screen.getByRole('button', { name: /Start AI Search/i })).toBeDisabled();
    });

    it('should show disabled state when disabled prop is true', () => {
      const props = {
        ...defaultProps,
        disabled: true
      };

      render(<SearchForm {...props} />);

      expect(screen.getByDisplayValue('')).toBeDisabled();
      expect(screen.getByTestId('country-input')).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty query', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      // Try to submit without entering any data
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Query must be at least 3 characters long/)).toBeInTheDocument();
      });
    });

    it('should show validation error for query that is too short', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Hi'); // 2 characters

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Query must be at least 3 characters long/)).toBeInTheDocument();
      });
    });

    it('should show validation error for no countries selected', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      // Enter valid query but no countries
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists in Europe');

      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/At least one country must be selected/)).toBeInTheDocument();
      });
    });

    it('should show validation error for query that is too long', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      const longQuery = 'a'.repeat(1001); // Exceeds 1000 character limit
      await user.paste(longQuery);

      await waitFor(() => {
        expect(screen.getByText(/Query cannot exceed 1000 characters/)).toBeInTheDocument();
      });
    });

    it('should not show validation errors for valid input', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<SearchForm {...props} />);

      // Enter valid query
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists covering AI in Europe');

      // Simulate country selection (mock component)
      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United Kingdom');

      // Form should be valid now
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data when valid form is submitted', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<SearchForm {...props} />);

      // Fill in valid form data
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists covering AI in Europe');

      // Simulate country selection
      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United Kingdom');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          query: 'Technology journalists covering AI in Europe',
          countries: ['United Kingdom'],
          categories: [],
          beats: [],
          options: expect.objectContaining({
            maxQueries: 10,
            enableAIEnhancement: true,
            priority: 'medium'
          })
        });
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<SearchForm {...props} />);

      // Fill in valid form data
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists in Europe');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United Kingdom');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Starting AI Search...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should show success message when submission succeeds', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<SearchForm {...props} />);

      // Fill in valid form data
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists in Europe');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United Kingdom');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Search initiated successfully/)).toBeInTheDocument();
      });
    });

    it('should show error message when submission fails', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('API Error'));
      const props = { ...defaultProps, onSubmit: mockOnSubmit };

      render(<SearchForm {...props} />);

      // Fill in valid form data
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists in Europe');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United Kingdom');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should update form completion progress as fields are filled', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      // Initially progress should be 0%
      expect(screen.getByText('Form Completion')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();

      // Fill in query - progress should increase
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists');

      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument(); // 1/4 fields completed
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form to default values when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      // Fill in form data
      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      await user.type(queryInput, 'Technology journalists in Europe');

      const countryInput = screen.getByTestId('country-input');
      await user.type(countryInput, 'United Kingdom');

      // Click reset button
      const resetButton = screen.getByRole('button', { name: 'Reset Form' });
      await user.click(resetButton);

      // Form should be cleared
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('should expand advanced options when clicked', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      const advancedOptionsHeader = screen.getByText('Advanced Search Options');
      await user.click(advancedOptionsHeader);

      await waitFor(() => {
        expect(screen.getByTestId('search-options-form')).toBeInTheDocument();
      });
    });

    it('should update options when changed', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      // Expand advanced options
      const advancedOptionsHeader = screen.getByText('Advanced Search Options');
      await user.click(advancedOptionsHeader);

      // Change max queries
      const maxQueriesInput = screen.getByTestId('max-queries-input');
      await user.clear(maxQueriesInput);
      await user.type(maxQueriesInput, '20');

      // Value should be updated
      expect(maxQueriesInput).toHaveValue(20);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure and labels', () => {
      render(<SearchForm {...defaultProps} />);

      // Check for proper form structure
      expect(screen.getByRole('form')).toBeInTheDocument();

      // Check for required field indicators
      expect(screen.getByText('Search Query *')).toBeInTheDocument();
    });

    it('should provide screen reader friendly error messages', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /Start AI Search/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Query must be at least 3 characters long/);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SearchForm {...defaultProps} />);

      const queryInput = screen.getByPlaceholderText(/describe what type of media contacts/i);
      queryInput.focus();

      // Test tab navigation
      await user.tab();
      // Should move to next form element
    });
  });
});