"use client";

import { FilterItem } from './types';
import { FilterCombobox } from './FilterCombobox';

interface ApiBeatFilterProps {
  selectedBeatIds: string[];
  onBeatFilterChange: (beatIds: string[]) => void;
  beats: FilterItem[];
  onItemsResolved: (items: FilterItem[]) => void;
}

export function ApiBeatFilter({
  selectedBeatIds,
  onBeatFilterChange,
  beats,
  onItemsResolved,
}: ApiBeatFilterProps) {
  return (
    <FilterCombobox
      triggerLabel="Beats"
      selectionLabel="beats"
      fetchEndpoint="/api/filters/beats"
      selectedValues={selectedBeatIds}
      onSelectionChange={onBeatFilterChange}
      options={beats}
      onItemsResolved={onItemsResolved}
      placeholder="Select beats..."
      searchPlaceholder="Search beats..."
      showCount
      showDescription
    />
  );
}
