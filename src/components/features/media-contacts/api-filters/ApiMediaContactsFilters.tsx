"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ApiFiltersSearchInput } from './ApiFiltersSearchInput';
import { ApiFiltersRow } from './ApiFiltersRow';
import { ApiActiveFiltersDisplay } from './ApiActiveFiltersDisplay';
import { FilterItem } from './types';

interface ApiFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
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
  countries?: FilterItem[];
  beats?: FilterItem[];
  outlets?: FilterItem[];
  regions?: FilterItem[];
  languages?: FilterItem[];
}

type Lookup = Record<string, FilterItem>;

const buildLookup = (items: FilterItem[], valueKey: 'id' | 'code' = 'id'): Lookup => {
  const next: Lookup = {};
  for (const item of items) {
    const key =
      valueKey === 'code'
        ? item.code ?? item.id
        : item.id;

    if (key) {
      next[key] = { ...item };
    }
  }
  return next;
};

const mergeLookup = (
  current: Lookup,
  incoming: FilterItem[],
  valueKey: 'id' | 'code' = 'id',
): Lookup => {
  if (incoming.length === 0) return current;

  const next = { ...current };
  for (const item of incoming) {
    const key =
      valueKey === 'code'
        ? item.code ?? item.id
        : item.id;

    if (key) {
      next[key] = { ...item };
    }
  }
  return next;
};

const lookupValues = (lookup: Lookup) => Object.values(lookup);

export function ApiMediaContactsFilters({
  searchTerm,
  onSearchChange,
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
  countries: initialCountries = [],
  beats: initialBeats = [],
  outlets: initialOutlets = [],
  regions: initialRegions = [],
  languages: initialLanguages = [],
}: ApiFiltersProps) {
  const [countryLookup, setCountryLookup] = useState<Lookup>(() =>
    buildLookup(initialCountries, 'id'),
  );
  const [beatLookup, setBeatLookup] = useState<Lookup>(() =>
    buildLookup(initialBeats, 'id'),
  );
  const [outletLookup, setOutletLookup] = useState<Lookup>(() =>
    buildLookup(initialOutlets, 'id'),
  );
  const [regionLookup, setRegionLookup] = useState<Lookup>(() =>
    buildLookup(initialRegions, 'code'),
  );
  const [languageLookup, setLanguageLookup] = useState<Lookup>(() =>
    buildLookup(initialLanguages, 'code'),
  );

  useEffect(() => {
    setCountryLookup((prev) =>
      mergeLookup(buildLookup(initialCountries, 'id'), lookupValues(prev), 'id'),
    );
  }, [initialCountries]);

  useEffect(() => {
    setBeatLookup((prev) =>
      mergeLookup(buildLookup(initialBeats, 'id'), lookupValues(prev), 'id'),
    );
  }, [initialBeats]);

  useEffect(() => {
    setOutletLookup((prev) =>
      mergeLookup(buildLookup(initialOutlets, 'id'), lookupValues(prev), 'id'),
    );
  }, [initialOutlets]);

  useEffect(() => {
    setRegionLookup((prev) =>
      mergeLookup(buildLookup(initialRegions, 'code'), lookupValues(prev), 'code'),
    );
  }, [initialRegions]);

  useEffect(() => {
    setLanguageLookup((prev) =>
      mergeLookup(buildLookup(initialLanguages, 'code'), lookupValues(prev), 'code'),
    );
  }, [initialLanguages]);

  const countries = useMemo(() => lookupValues(countryLookup), [countryLookup]);
  const beats = useMemo(() => lookupValues(beatLookup), [beatLookup]);
  const outlets = useMemo(() => lookupValues(outletLookup), [outletLookup]);
  const regions = useMemo(() => lookupValues(regionLookup), [regionLookup]);
  const languages = useMemo(() => lookupValues(languageLookup), [languageLookup]);

  const handleCountryItemsResolved = useCallback((items: FilterItem[]) => {
    setCountryLookup((current) => mergeLookup(current, items, 'id'));
  }, []);

  const handleBeatItemsResolved = useCallback((items: FilterItem[]) => {
    setBeatLookup((current) => mergeLookup(current, items, 'id'));
  }, []);

  const handleOutletItemsResolved = useCallback((items: FilterItem[]) => {
    setOutletLookup((current) => mergeLookup(current, items, 'id'));
  }, []);

  const handleRegionItemsResolved = useCallback((items: FilterItem[]) => {
    setRegionLookup((current) => mergeLookup(current, items, 'code'));
  }, []);

  const handleLanguageItemsResolved = useCallback((items: FilterItem[]) => {
    setLanguageLookup((current) => mergeLookup(current, items, 'code'));
  }, []);

  // Calculate active filters count
  const activeFiltersCount = 
    (searchTerm.trim() !== '' ? 1 : 0) +
    selectedCountryIds.length +
    selectedBeatIds.length +
    selectedOutletIds.length +
    selectedRegionCodes.length +
    selectedLanguageCodes.length +
    (emailVerified !== 'all' ? 1 : 0);

  // Clear all filters
  const clearAllFilters = () => {
    onSearchChange('');
    onCountryFilterChange([]);
    onBeatFilterChange([]);
    onOutletFilterChange([]);
    onRegionFilterChange([]);
    onLanguageFilterChange([]);
    onEmailVerifiedChange('all');
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <ApiFiltersSearchInput
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
          />
          
          <ApiFiltersRow
            selectedCountryIds={selectedCountryIds}
            onCountryFilterChange={onCountryFilterChange}
            selectedBeatIds={selectedBeatIds}
            onBeatFilterChange={onBeatFilterChange}
            selectedOutletIds={selectedOutletIds}
            onOutletFilterChange={onOutletFilterChange}
            selectedRegionCodes={selectedRegionCodes}
            onRegionFilterChange={onRegionFilterChange}
            selectedLanguageCodes={selectedLanguageCodes}
            onLanguageFilterChange={onLanguageFilterChange}
            emailVerified={emailVerified}
            onEmailVerifiedChange={onEmailVerifiedChange}
            countries={countries}
            beats={beats}
            outlets={outlets}
            regions={regions}
            languages={languages}
            onCountryItemsResolved={handleCountryItemsResolved}
            onBeatItemsResolved={handleBeatItemsResolved}
            onOutletItemsResolved={handleOutletItemsResolved}
            onRegionItemsResolved={handleRegionItemsResolved}
            onLanguageItemsResolved={handleLanguageItemsResolved}
          />
          
          <ApiActiveFiltersDisplay
            activeFiltersCount={activeFiltersCount}
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            selectedCountryIds={selectedCountryIds}
            onCountryFilterChange={onCountryFilterChange}
            countries={countries}
            selectedBeatIds={selectedBeatIds}
            onBeatFilterChange={onBeatFilterChange}
            beats={beats}
            selectedOutletIds={selectedOutletIds}
            onOutletFilterChange={onOutletFilterChange}
            outlets={outlets}
            selectedRegionCodes={selectedRegionCodes}
            onRegionFilterChange={onRegionFilterChange}
            regions={regions}
            selectedLanguageCodes={selectedLanguageCodes}
            onLanguageFilterChange={onLanguageFilterChange}
            languages={languages}
            emailVerified={emailVerified}
            onEmailVerifiedChange={onEmailVerifiedChange}
            clearAllFilters={clearAllFilters}
          />
        </div>
      </CardContent>
      {/* Add bottom divider */}
      <div className="h-px bg-[var(--line-soft)]" />
    </Card>
  );
}
