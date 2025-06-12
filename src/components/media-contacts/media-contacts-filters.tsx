"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X as XIcon } from "lucide-react";

// Extracted components
import { MainSearchInput } from "./search-filters/MainSearchInput";
import { RegionFilterPopover } from "./search-filters/RegionFilterPopover";
import { CountryFilterPopover } from "./search-filters/CountryFilterPopover";
import { BeatFilterPopover } from "./search-filters/BeatFilterPopover";
import { LanguageFilterPopover } from "./search-filters/LanguageFilterPopover";
import { EmailVerificationFilter } from "./search-filters/EmailVerificationFilter";

import { cn } from "@/lib/utils"; // still used for ClearAllFilters button icon spacing

// Use local/domain types instead of Prisma ORM models for UI layer
import type { Country } from "@/app/actions/country-actions";
import type { Beat } from "@/app/actions/beat-actions";
import type { Region } from "@/lib/country-data";
import type { Language } from "@/lib/language-data";

/**
 * Props interface for MediaContactsFilters component
 * Following Rust-inspired explicit typing and clear documentation
 */
export interface MediaContactsFiltersProps {
  // Main search
  mainSearchTerm: string;
  setMainSearchTerm: (term: string) => void;
  onSearchSubmit?: () => void;
  isLoading?: boolean;
  setIsLoading?: (isLoading: boolean) => void; // Optional prop for setting loading state
  
  // Country filters
  allCountries: Country[];
  selectedCountryIds: string[];
  setSelectedCountryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isCountryDropdownOpen: boolean;
  setIsCountryDropdownOpen: (isOpen: boolean) => void;
  searchFilterCountryTerm: string;
  setSearchFilterCountryTerm: (term: string) => void;
  countryOptions: Country[];
  
  // Beat filters
  allBeats: Beat[];
  selectedBeatIds: string[];
  setSelectedBeatIds: React.Dispatch<React.SetStateAction<string[]>>;
  isBeatDropdownOpen: boolean;
  setIsBeatDropdownOpen: (isOpen: boolean) => void;
  searchFilterBeatTerm: string;
  setSearchFilterBeatTerm: (term: string) => void;
  beatOptions: Beat[];
  
  // Region filters
  allRegions: Region[];
  selectedRegionCodes: string[];
  setSelectedRegionCodes: React.Dispatch<React.SetStateAction<string[]>>;
  isRegionDropdownOpen: boolean;
  setIsRegionDropdownOpen: (isOpen: boolean) => void;
  searchFilterRegionTerm: string;
  setSearchFilterRegionTerm: (term: string) => void;
  regionOptions: Region[];
  
  // Language filters
  allLanguages: Language[];
  selectedLanguageCodes: string[];
  setSelectedLanguageCodes: React.Dispatch<React.SetStateAction<string[]>>;
  isLanguageDropdownOpen: boolean;
  setIsLanguageDropdownOpen: (isOpen: boolean) => void;
  searchFilterLanguageTerm: string;
  setSearchFilterLanguageTerm: (term: string) => void;
  languageOptions: Language[];
  
  // Email verification filter
  emailVerifiedFilter: 'all' | 'verified' | 'unverified';
  setEmailVerifiedFilter: (filter: 'all' | 'verified' | 'unverified') => void;
  isEmailVerifiedDropdownOpen: boolean;
  setIsEmailVerifiedDropdownOpen: (isOpen: boolean) => void;
  
  // Filter utilities
  activeFiltersCount: () => number;
  clearAllFilters: () => void;
}

/**
 * MediaContactsFilters component for filtering media contacts by various criteria
 * @param props Component properties following Rust-inspired explicit parameter typing
 * @returns React component for filters UI
 */
export function MediaContactsFilters({
  // Main search
  mainSearchTerm,
  setMainSearchTerm,
  onSearchSubmit,
  isLoading,
  setIsLoading,
  // Country filters
  allCountries,
  selectedCountryIds,
  setSelectedCountryIds,
  isCountryDropdownOpen,
  setIsCountryDropdownOpen,
  searchFilterCountryTerm,
  setSearchFilterCountryTerm,
  countryOptions,
  // Beat filters
  allBeats,
  selectedBeatIds,
  setSelectedBeatIds,
  isBeatDropdownOpen,
  setIsBeatDropdownOpen,
  searchFilterBeatTerm,
  setSearchFilterBeatTerm,
  beatOptions,
  // Region filters
  allRegions,
  selectedRegionCodes,
  setSelectedRegionCodes,
  isRegionDropdownOpen,
  setIsRegionDropdownOpen,
  searchFilterRegionTerm,
  setSearchFilterRegionTerm,
  regionOptions,
  // Language filters
  allLanguages,
  selectedLanguageCodes,
  setSelectedLanguageCodes,
  isLanguageDropdownOpen,
  setIsLanguageDropdownOpen,
  searchFilterLanguageTerm,
  setSearchFilterLanguageTerm,
  languageOptions,
  // Email verification filter
  emailVerifiedFilter,
  setEmailVerifiedFilter,
  isEmailVerifiedDropdownOpen,
  setIsEmailVerifiedDropdownOpen,
  // Filter management
  clearAllFilters,
  activeFiltersCount,
}: MediaContactsFiltersProps) {
  return (
    <Card className="rounded-sm overflow-hidden">
      <CardContent> {/* Added pt-6 to CardContent as CardHeader was removed by user */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Modularized filters */}
          <MainSearchInput
            mainSearchTerm={mainSearchTerm}
            setMainSearchTerm={setMainSearchTerm}
            onSearchSubmit={onSearchSubmit}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />

          <RegionFilterPopover
            allRegions={allRegions}
            selectedRegionCodes={selectedRegionCodes}
            setSelectedRegionCodes={setSelectedRegionCodes}
            isRegionDropdownOpen={isRegionDropdownOpen}
            setIsRegionDropdownOpen={setIsRegionDropdownOpen}
            searchFilterRegionTerm={searchFilterRegionTerm}
            setSearchFilterRegionTerm={setSearchFilterRegionTerm}
            regionOptions={regionOptions}
          />

          <CountryFilterPopover
            allCountries={allCountries}
            selectedCountryIds={selectedCountryIds}
            setSelectedCountryIds={setSelectedCountryIds}
            isCountryDropdownOpen={isCountryDropdownOpen}
            setIsCountryDropdownOpen={setIsCountryDropdownOpen}
            searchFilterCountryTerm={searchFilterCountryTerm}
            setSearchFilterCountryTerm={setSearchFilterCountryTerm}
            countryOptions={countryOptions}
          />

          <BeatFilterPopover
            allBeats={allBeats}
            selectedBeatIds={selectedBeatIds}
            setSelectedBeatIds={setSelectedBeatIds}
            isBeatDropdownOpen={isBeatDropdownOpen}
            setIsBeatDropdownOpen={setIsBeatDropdownOpen}
            searchFilterBeatTerm={searchFilterBeatTerm}
            setSearchFilterBeatTerm={setSearchFilterBeatTerm}
            beatOptions={beatOptions}
          />

          <LanguageFilterPopover
            allLanguages={allLanguages}
            selectedLanguageCodes={selectedLanguageCodes}
            setSelectedLanguageCodes={setSelectedLanguageCodes}
            isLanguageDropdownOpen={isLanguageDropdownOpen}
            setIsLanguageDropdownOpen={setIsLanguageDropdownOpen}
            searchFilterLanguageTerm={searchFilterLanguageTerm}
            setSearchFilterLanguageTerm={setSearchFilterLanguageTerm}
            languageOptions={languageOptions}
          />

          <EmailVerificationFilter
            emailVerifiedFilter={emailVerifiedFilter}
            setEmailVerifiedFilter={setEmailVerifiedFilter}
            isEmailVerifiedDropdownOpen={isEmailVerifiedDropdownOpen}
            setIsEmailVerifiedDropdownOpen={setIsEmailVerifiedDropdownOpen}
          />

          {/* Clear All Filters Button */}
          {activeFiltersCount() > 0 && (
              <Button variant="ghost" onClick={clearAllFilters} className="self-end">
                  <XIcon className="mr-2 h-4 w-4" /> Clear All
              </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
