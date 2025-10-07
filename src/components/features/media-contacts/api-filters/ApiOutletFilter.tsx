"use client";

import { FilterItem } from './types';
import { FilterCombobox } from './FilterCombobox';

interface ApiOutletFilterProps {
  selectedOutletIds: string[];
  onOutletFilterChange: (outletIds: string[]) => void;
  outlets: FilterItem[];
  onItemsResolved: (items: FilterItem[]) => void;
}

export function ApiOutletFilter({
  selectedOutletIds,
  onOutletFilterChange,
  outlets,
  onItemsResolved,
}: ApiOutletFilterProps) {
  return (
    <FilterCombobox
      triggerLabel="Outlets"
      selectionLabel="outlets"
      fetchEndpoint="/api/filters/outlets"
      selectedValues={selectedOutletIds}
      onSelectionChange={onOutletFilterChange}
      options={outlets}
      onItemsResolved={onItemsResolved}
      placeholder="Select outlets..."
      searchPlaceholder="Search outlets..."
      showCount
      showDescription
    />
  );
}
