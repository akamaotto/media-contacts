import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CountryAutocomplete } from '../../components/features/media-contacts/country-autocomplete';

// Mock fetch
global.fetch = jest.fn();

describe('CountryAutocomplete', () => {
  const mockCountries = [
    { id: '1', label: 'United States', code: 'US', count: 100 },
    { id: '2', label: 'United Kingdom', code: 'GB', count: 75 },
    { id: '3', label: 'Canada', code: 'CA', count: 50 }
  ];

  const mockPopularCountries = {
    items: mockCountries
  };

  const mockSearchResults = {
    items: [
      { id: '4', label: 'Egypt', code: 'EG', count: 30 }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component', () => {
    render(
      <CountryAutocomplete
        selectedCountries={[]}
        onCountriesChange={jest.fn()}
      />
    );

    // Check that the component renders
    expect(screen.getByText('Search countries...')).toBeInTheDocument();
  });

  it('should display selected countries as badges', () => {
    render(
      <CountryAutocomplete
        selectedCountries={[
          { id: '1', label: 'United States', code: 'US', count: 100 }
        ]}
        onCountriesChange={jest.fn()}
      />
    );

    // Check that the selected country appears as a badge
    expect(screen.getByText('United States')).toBeInTheDocument();
  });
});