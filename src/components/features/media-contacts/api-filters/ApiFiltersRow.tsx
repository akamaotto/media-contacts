"use client";

import { ApiCountryFilter } from './ApiCountryFilter';
import { ApiBeatFilter } from './ApiBeatFilter';
import { ApiOutletFilter } from './ApiOutletFilter';
import { ApiRegionFilter } from './ApiRegionFilter';
import { ApiLanguageFilter } from './ApiLanguageFilter';
import { ApiEmailVerificationFilter } from './ApiEmailVerificationFilter';
import { FilterItem } from './types';

interface ApiFiltersRowProps {
  selectedCountryIds: string[];
  onCountryFilterChange: (countryIds: string[]) => void;
  selectedBeatIds: string[];
  onBeatFilterChange: (beatIds: string[]) => void;
  selectedOutletIds: string[];
  onOutletFilterChange: (outletIds: string[]) => void;
  selectedRegionCodes: string[];
  onRegionFilterChange: (regionCodes: string[]) => void;
  selectedLanguageCodes: string[];
  onLanguageFilterChange: (languageCodes: string[]) => void;
  emailVerified: 'all' | 'verified' | 'unverified';
  onEmailVerifiedChange: (value: 'all' | 'verified' | 'unverified') => void;
  countries: FilterItem[];
  beats: FilterItem[];
  outlets: FilterItem[];
  regions: FilterItem[];
  languages: FilterItem[];
  onCountryItemsResolved: (items: FilterItem[]) => void;
  onBeatItemsResolved: (items: FilterItem[]) => void;
  onOutletItemsResolved: (items: FilterItem[]) => void;
  onRegionItemsResolved: (items: FilterItem[]) => void;
  onLanguageItemsResolved: (items: FilterItem[]) => void;
}

export function ApiFiltersRow({
  selectedCountryIds,
  onCountryFilterChange,
  selectedBeatIds,
  onBeatFilterChange,
  selectedOutletIds,
  onOutletFilterChange,
  selectedRegionCodes,
  onRegionFilterChange,
  selectedLanguageCodes,
  onLanguageFilterChange,
  emailVerified,
  onEmailVerifiedChange,
  countries,
  beats,
  outlets,
  regions,
  languages,
  onCountryItemsResolved,
  onBeatItemsResolved,
  onOutletItemsResolved,
  onRegionItemsResolved,
  onLanguageItemsResolved
}: ApiFiltersRowProps) {
  return (
    <div className="flex gap-3 items-center overflow-x-auto pb-2">
      <ApiCountryFilter
        selectedCountryIds={selectedCountryIds}
        onCountryFilterChange={onCountryFilterChange}
        countries={countries}
        onItemsResolved={onCountryItemsResolved}
      />

      <ApiBeatFilter
        selectedBeatIds={selectedBeatIds}
        onBeatFilterChange={onBeatFilterChange}
        beats={beats}
        onItemsResolved={onBeatItemsResolved}
      />

      <ApiOutletFilter
        selectedOutletIds={selectedOutletIds}
        onOutletFilterChange={onOutletFilterChange}
        outlets={outlets}
        onItemsResolved={onOutletItemsResolved}
      />

      <ApiRegionFilter
        selectedRegionCodes={selectedRegionCodes}
        onRegionFilterChange={onRegionFilterChange}
        regions={regions}
        onItemsResolved={onRegionItemsResolved}
      />

      <ApiLanguageFilter
        selectedLanguageCodes={selectedLanguageCodes}
        onLanguageFilterChange={onLanguageFilterChange}
        languages={languages}
        onItemsResolved={onLanguageItemsResolved}
      />

      <ApiEmailVerificationFilter
        emailVerified={emailVerified}
        onEmailVerifiedChange={onEmailVerifiedChange}
      />
    </div>
  );
}
