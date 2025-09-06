"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
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
  countriesLoading: boolean;
  beatsLoading: boolean;
  outletsLoading: boolean;
  regionsLoading: boolean;
  languagesLoading: boolean;
  countrySearch: string;
  setCountrySearch: (value: string) => void;
  beatSearch: string;
  setBeatSearch: (value: string) => void;
  outletSearch: string;
  setOutletSearch: (value: string) => void;
  regionSearch: string;
  setRegionSearch: (value: string) => void;
  languageSearch: string;
  setLanguageSearch: (value: string) => void;
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
  countriesLoading,
  beatsLoading,
  outletsLoading,
  regionsLoading,
  languagesLoading,
  countrySearch,
  setCountrySearch,
  beatSearch,
  setBeatSearch,
  outletSearch,
  setOutletSearch,
  regionSearch,
  setRegionSearch,
  languageSearch,
  setLanguageSearch
}: ApiFiltersRowProps) {
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isBeatOpen, setIsBeatOpen] = useState(false);
  const [isOutletOpen, setIsOutletOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <ApiCountryFilter
        selectedCountryIds={selectedCountryIds}
        onCountryFilterChange={onCountryFilterChange}
        countries={countries}
        countriesLoading={countriesLoading}
        countrySearch={countrySearch}
        setCountrySearch={setCountrySearch}
        isOpen={isCountryOpen}
        onOpenChange={setIsCountryOpen}
      />
      
      <ApiBeatFilter
        selectedBeatIds={selectedBeatIds}
        onBeatFilterChange={onBeatFilterChange}
        beats={beats}
        beatsLoading={beatsLoading}
        beatSearch={beatSearch}
        setBeatSearch={setBeatSearch}
        isOpen={isBeatOpen}
        onOpenChange={setIsBeatOpen}
      />
      
      <ApiOutletFilter
        selectedOutletIds={selectedOutletIds}
        onOutletFilterChange={onOutletFilterChange}
        outlets={outlets}
        outletsLoading={outletsLoading}
        outletSearch={outletSearch}
        setOutletSearch={setOutletSearch}
        isOpen={isOutletOpen}
        onOpenChange={setIsOutletOpen}
      />
      
      <ApiRegionFilter
        selectedRegionCodes={selectedRegionCodes}
        onRegionFilterChange={onRegionFilterChange}
        regions={regions}
        regionsLoading={regionsLoading}
        regionSearch={regionSearch}
        setRegionSearch={setRegionSearch}
        isOpen={isRegionOpen}
        onOpenChange={setIsRegionOpen}
      />
      
      <ApiLanguageFilter
        selectedLanguageCodes={selectedLanguageCodes}
        onLanguageFilterChange={onLanguageFilterChange}
        languages={languages}
        languagesLoading={languagesLoading}
        languageSearch={languageSearch}
        setLanguageSearch={setLanguageSearch}
        isOpen={isLanguageOpen}
        onOpenChange={setIsLanguageOpen}
      />
      
      <ApiEmailVerificationFilter
        emailVerified={emailVerified}
        onEmailVerifiedChange={onEmailVerifiedChange}
      />
    </div>
  );
}