"use client";

import React, { useState, useEffect } from 'react';
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
  // Filter options with loading states
  const [countries, setCountries] = useState<FilterItem[]>(initialCountries);
  const [beats, setBeats] = useState<FilterItem[]>(initialBeats);
  const [outlets, setOutlets] = useState<FilterItem[]>(initialOutlets);
  const [regions, setRegions] = useState<FilterItem[]>(initialRegions);
  const [languages, setLanguages] = useState<FilterItem[]>(initialLanguages);
  
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [beatsLoading, setBeatsLoading] = useState(false);
  const [outletsLoading, setOutletsLoading] = useState(false);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  
  const [countrySearch, setCountrySearch] = useState("");
  const [beatSearch, setBeatSearch] = useState("");
  const [outletSearch, setOutletSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [languageSearch, setLanguageSearch] = useState("");

  // Update state when props change
  useEffect(() => {
    setCountries(initialCountries);
  }, [initialCountries]);

  useEffect(() => {
    setBeats(initialBeats);
  }, [initialBeats]);

  useEffect(() => {
    setOutlets(initialOutlets);
  }, [initialOutlets]);

  useEffect(() => {
    setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    setLanguages(initialLanguages);
  }, [initialLanguages]);

  // Fetch popular items on mount if not provided
  useEffect(() => {
    // If we don't have initial data, fetch popular items
    if (initialCountries.length === 0 && initialBeats.length === 0 && 
        initialOutlets.length === 0 && initialRegions.length === 0 && 
        initialLanguages.length === 0) {
      const fetchPopularItems = async () => {
        try {
          // Fetch popular countries
          setCountriesLoading(true);
          const countriesRes = await fetch("/api/filters/countries?limit=5");
          if (countriesRes.ok) {
            const data = await countriesRes.json();
            setCountries(data.items || []);
          }
          setCountriesLoading(false);

          // Fetch popular beats
          setBeatsLoading(true);
          const beatsRes = await fetch("/api/filters/beats?limit=5");
          if (beatsRes.ok) {
            const data = await beatsRes.json();
            setBeats(data.items || []);
          }
          setBeatsLoading(false);

          // Fetch popular outlets
          setOutletsLoading(true);
          const outletsRes = await fetch("/api/filters/outlets?limit=5");
          if (outletsRes.ok) {
            const data = await outletsRes.json();
            setOutlets(data.items || []);
          }
          setOutletsLoading(false);

          // Fetch popular regions
          setRegionsLoading(true);
          const regionsRes = await fetch("/api/filters/regions?limit=5");
          if (regionsRes.ok) {
            const data = await regionsRes.json();
            setRegions(data.items || []);
          }
          setRegionsLoading(false);

          // Fetch popular languages
          setLanguagesLoading(true);
          const languagesRes = await fetch("/api/filters/languages?limit=5");
          if (languagesRes.ok) {
            const data = await languagesRes.json();
            setLanguages(data.items || []);
          }
          setLanguagesLoading(false);
        } catch (error) {
          console.error("Failed to fetch popular items:", error);
          setCountriesLoading(false);
          setBeatsLoading(false);
          setOutletsLoading(false);
          setRegionsLoading(false);
          setLanguagesLoading(false);
        }
      };

      fetchPopularItems();
    }
  }, [initialCountries.length, initialBeats.length, initialOutlets.length, initialRegions.length, initialLanguages.length]);

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
            countriesLoading={countriesLoading}
            beatsLoading={beatsLoading}
            outletsLoading={outletsLoading}
            regionsLoading={regionsLoading}
            languagesLoading={languagesLoading}
            countrySearch={countrySearch}
            setCountrySearch={setCountrySearch}
            beatSearch={beatSearch}
            setBeatSearch={setBeatSearch}
            outletSearch={outletSearch}
            setOutletSearch={setOutletSearch}
            regionSearch={regionSearch}
            setRegionSearch={setRegionSearch}
            languageSearch={languageSearch}
            setLanguageSearch={setLanguageSearch}
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