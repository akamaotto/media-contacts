"use client";

import { FilterItem } from './types';
import { FilterCombobox } from './FilterCombobox';

interface ApiLanguageFilterProps {
  selectedLanguageCodes: string[];
  onLanguageFilterChange: (languageCodes: string[]) => void;
  languages: FilterItem[];
  onItemsResolved: (items: FilterItem[]) => void;
}

export function ApiLanguageFilter({
  selectedLanguageCodes,
  onLanguageFilterChange,
  languages,
  onItemsResolved,
}: ApiLanguageFilterProps) {
  return (
    <FilterCombobox
      triggerLabel="Languages"
      selectionLabel="languages"
      fetchEndpoint="/api/filters/languages"
      selectedValues={selectedLanguageCodes}
      onSelectionChange={onLanguageFilterChange}
      options={languages}
      onItemsResolved={onItemsResolved}
      valueKey="code"
      placeholder="Select languages..."
      searchPlaceholder="Search languages..."
      showCount
    />
  );
}
