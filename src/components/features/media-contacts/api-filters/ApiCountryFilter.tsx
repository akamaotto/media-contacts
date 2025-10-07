"use client";

import { FilterItem } from './types';
import { FilterCombobox } from './FilterCombobox';

interface ApiCountryFilterProps {
  selectedCountryIds: string[];
  onCountryFilterChange: (countryIds: string[]) => void;
  countries: FilterItem[];
  onItemsResolved: (items: FilterItem[]) => void;
}

export function ApiCountryFilter({
  selectedCountryIds,
  onCountryFilterChange,
  countries,
  onItemsResolved,
}: ApiCountryFilterProps) {
  return (
    <FilterCombobox
      triggerLabel="Countries"
      selectionLabel="countries"
      fetchEndpoint="/api/filters/countries"
      selectedValues={selectedCountryIds}
      onSelectionChange={onCountryFilterChange}
      options={countries}
      onItemsResolved={onItemsResolved}
      placeholder="Select countries..."
      searchPlaceholder="Search countries..."
      showCount
    />
  );
}
