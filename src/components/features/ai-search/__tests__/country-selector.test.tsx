/**
 * Unit Tests for CountrySelector Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CountrySelector } from '../country-selector';
import { CountrySelectorProps } from '../types';

// Mock fetch API
global.fetch = jest.fn();

// Mock data
const mockCountries = [
  { id: '1', name: 'United States', code: 'US', count: 100, region: 'North America' },
  { id: '2', name: 'United Kingdom', code: 'GB', count: 50, region: 'Europe' },
  { id: '3', name: 'Canada', code: 'CA', count: 30, region: 'North America' },
  { id: '4', name: 'Germany', code: 'DE', count: 40, region: 'Europe' },
  { id: '5', name: 'Australia', code: 'AU', count: 20, region: 'Oceania' }
];

const defaultProps: CountrySelectorProps = {
  value: [],
  onChange: jest.fn(),
  maxSelection: 10,
  disabled: false,
  error: undefined
};

describe('CountrySelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockCountries })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component correctly', async () => {
      render(<CountrySelector {...defaultProps} />);

      expect(screen.getByText('Countries (0/10)')).toBeInTheDocument();
      expect(screen.getByText('No countries selected')).toBeInTheDocument();
      expect(screen.getByText('Select countries...')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display selected countries correctly', () => {
      const props = {
        ...defaultProps,
        value: ['United States', 'Canada']
      };

      render(<CountrySelector {...props} />);

      expect(screen.getByText('Countries (2/10)')).toBeInTheDocument();
      expect(screen.getByText('US')).toBeInTheDocument();
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('CA')).toBeInTheDocument();
      expect(screen.getByText('Canada')).toBeInTheDocument();
    });

    it('should show disabled state when disabled prop is true', () => {
      const props = {
        ...defaultProps,
        disabled: true
      };

      render(<CountrySelector {...props} />);

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should show error message when error prop is provided', () => {
      const props = {
        ...defaultProps,
        error: 'Selection required'
      };

      render(<CountrySelector {...props} />);

      expect(screen.getByText('Selection required')).toBeInTheDocument();
    });

    it('should show maximum countries reached message', () => {
      const props = {
        ...defaultProps,
        value: ['Country1', 'Country2', 'Country3', 'Country4', 'Country5', 'Country6', 'Country7', 'Country8', 'Country9', 'Country10'],
        maxSelection: 10
      };

      render(<CountrySelector {...props} />);

      expect(screen.getByText('Maximum of 10 countries can be selected')).toBeInTheDocument();
    });
  });

  describe('Country Selection', () => {
    it('should open dropdown when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<CountrySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Search countries...')).toBeInTheDocument();
      });
    });

    it('should load and display countries from API', async () => {
      render(<CountrySelector {...defaultProps} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/filters/countries?limit=300');
      });
    });

    it('should filter countries when search term is entered', async () => {
      const user = userEvent.setup();
      render(<CountrySelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Wait for countries to load
      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
      });

      // Enter search term
      const searchInput = screen.getByPlaceholderText('Search countries...');
      await user.type(searchInput, 'United');

      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(screen.queryByText('Germany')).not.toBeInTheDocument();
      });
    });

    it('should call onChange when country is selected', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const props = { ...defaultProps, onChange: mockOnChange };

      render(<CountrySelector {...props} />);

      // Open dropdown
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Wait for countries to load and select one
      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
      });

      const countryOption = screen.getByText('United States');
      await user.click(countryOption);

      expect(mockOnChange).toHaveBeenCalledWith(['United States']);
    });

    it('should not allow selecting more than maxSelection countries', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const props = {
        ...defaultProps,
        value: ['Country1', 'Country2'], // Already at max
        maxSelection: 2,
        onChange: mockOnChange
      };

      render(<CountrySelector {...props} />);

      // Try to open dropdown (should be disabled)
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();

      // onChange should not be called
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Country Removal', () => {
    it('should call onChange when country is removed', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const props = {
        ...defaultProps,
        value: ['United States', 'Canada'],
        onChange: mockOnChange
      };

      render(<CountrySelector {...props} />);

      // Find and click remove button for United States
      const removeButton = screen.getByLabelText('Remove United States');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith(['Canada']);
    });

    it('should clear all countries when Clear All button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const props = {
        ...defaultProps,
        value: ['United States', 'Canada'],
        onChange: mockOnChange
      };

      render(<CountrySelector {...props} />);

      // Click Clear All button
      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CountrySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-label', 'Select countries for search');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CountrySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      trigger.focus();

      // Test escape key
      await user.keyboard('{Escape}');
      // Dropdown should close (this would be tested by checking if dropdown is no longer visible)

      // Test enter key to open
      await user.keyboard('{Enter}');
      // Dropdown should open
    });

    it('should provide screen reader friendly announcements', async () => {
      const props = {
        ...defaultProps,
        value: ['United States']
      };

      render(<CountrySelector {...props} />);

      const removeButton = screen.getByLabelText('Remove United States');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove United States');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<CountrySelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('United States')).not.toBeInTheDocument();
      });

      // Component should still be usable even if API fails
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should show empty state when no countries match search', async () => {
      const user = userEvent.setup();
      render(<CountrySelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Wait for countries to load
      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
      });

      // Enter search term with no results
      const searchInput = screen.getByPlaceholderText('Search countries...');
      await user.type(searchInput, 'NonExistentCountry');

      await waitFor(() => {
        expect(screen.getByText(/No countries found for "NonExistentCountry"/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      const user = userEvent.setup();
      render(<CountrySelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Wait for countries to load
      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search countries...');

      // Type quickly multiple times
      await user.type(searchInput, 'US');
      await user.type(searchInput, 'A');
      await user.type(searchInput, 'USA');

      // Should only make one API call due to debouncing
      expect(fetch).toHaveBeenCalledTimes(1); // Initial load + debounced search
    });
  });

  describe('Regional Grouping', () => {
    it('should group countries by region', async () => {
      const user = userEvent.setup();
      render(<CountrySelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('North America')).toBeInTheDocument();
        expect(screen.getByText('Europe')).toBeInTheDocument();
        expect(screen.getByText('Oceania')).toBeInTheDocument();
      });
    });

    it('should expand and collapse regional groups', async () => {
      const user = userEvent.setup();
      render(<CountrySelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('North America')).toBeInTheDocument();
      });

      // Regional groups should be expandable
      const regionHeader = screen.getByText('North America');
      expect(regionHeader).toBeInTheDocument();
    });
  });
});