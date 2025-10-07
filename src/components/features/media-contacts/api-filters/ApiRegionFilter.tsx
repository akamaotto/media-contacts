"use client";

import { FilterItem } from './types';
import { FilterCombobox } from './FilterCombobox';

interface ApiRegionFilterProps {
  selectedRegionCodes: string[];
  onRegionFilterChange: (regionCodes: string[]) => void;
  regions: FilterItem[];
  onItemsResolved: (items: FilterItem[]) => void;
}

export function ApiRegionFilter({
  selectedRegionCodes,
  onRegionFilterChange,
  regions,
  onItemsResolved,
}: ApiRegionFilterProps) {
  return (
    <FilterCombobox
      triggerLabel="Regions"
      selectionLabel="regions"
      fetchEndpoint="/api/filters/regions"
      selectedValues={selectedRegionCodes}
      onSelectionChange={onRegionFilterChange}
      options={regions}
      onItemsResolved={onItemsResolved}
      valueKey="code"
      placeholder="Select regions..."
      searchPlaceholder="Search regions..."
      showCount
    />
  );
}
