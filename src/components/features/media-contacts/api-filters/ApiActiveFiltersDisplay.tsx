"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X as XIcon, CheckCircle2, XCircle } from "lucide-react";
import { FilterItem } from './types';

interface ApiActiveFiltersDisplayProps {
  activeFiltersCount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCountryIds: string[];
  onCountryFilterChange: (countryIds: string[]) => void;
  countries: FilterItem[];
  selectedBeatIds: string[];
  onBeatFilterChange: (beatIds: string[]) => void;
  beats: FilterItem[];
  selectedOutletIds: string[];
  onOutletFilterChange: (outletIds: string[]) => void;
  outlets: FilterItem[];
  selectedRegionCodes: string[];
  onRegionFilterChange: (regionCodes: string[]) => void;
  regions: FilterItem[];
  selectedLanguageCodes: string[];
  onLanguageFilterChange: (languageCodes: string[]) => void;
  languages: FilterItem[];
  emailVerified: 'all' | 'verified' | 'unverified';
  onEmailVerifiedChange: (value: 'all' | 'verified' | 'unverified') => void;
  clearAllFilters: () => void;
}

export function ApiActiveFiltersDisplay({
  activeFiltersCount,
  searchTerm,
  onSearchChange,
  selectedCountryIds,
  onCountryFilterChange,
  countries,
  selectedBeatIds,
  onBeatFilterChange,
  beats,
  selectedOutletIds,
  onOutletFilterChange,
  outlets,
  selectedRegionCodes,
  onRegionFilterChange,
  regions,
  selectedLanguageCodes,
  onLanguageFilterChange,
  languages,
  emailVerified,
  onEmailVerifiedChange,
  clearAllFilters
}: ApiActiveFiltersDisplayProps) {
  if (activeFiltersCount === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {searchTerm.trim() && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Search: &quot;{searchTerm}&quot;
            <XIcon 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => onSearchChange('')}
            />
          </Badge>
        )}
        
        {selectedCountryIds.map(countryId => {
          const country = countries.find(c => c.id === countryId);
          return country ? (
            <Badge key={countryId} variant="secondary" className="flex items-center gap-1">
              {country.label}
              <XIcon 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onCountryFilterChange(selectedCountryIds.filter(id => id !== countryId))}
              />
            </Badge>
          ) : null;
        })}
        
        {selectedBeatIds.map(beatId => {
          const beat = beats.find(b => b.id === beatId);
          return beat ? (
            <Badge key={beatId} variant="secondary" className="flex items-center gap-1">
              {beat.label}
              <XIcon 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onBeatFilterChange(selectedBeatIds.filter(id => id !== beatId))}
              />
            </Badge>
          ) : null;
        })}
        
        {selectedOutletIds.map(outletId => {
          const outlet = outlets.find(o => o.id === outletId);
          return outlet ? (
            <Badge key={outletId} variant="secondary" className="flex items-center gap-1">
              {outlet.label}
              <XIcon 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onOutletFilterChange(selectedOutletIds.filter(id => id !== outletId))}
              />
            </Badge>
          ) : null;
        })}
        
        {selectedRegionCodes.map(regionCode => {
          const region = regions.find(r => r.code === regionCode);
          return region ? (
            <Badge key={regionCode} variant="secondary" className="flex items-center gap-1">
              {region.label}
              <XIcon 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onRegionFilterChange(selectedRegionCodes.filter(code => code !== regionCode))}
              />
            </Badge>
          ) : null;
        })}
        
        {selectedLanguageCodes.map(languageCode => {
          const language = languages.find(l => l.code === languageCode);
          return language ? (
            <Badge key={languageCode} variant="secondary" className="flex items-center gap-1">
              {language.label}
              <XIcon 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onLanguageFilterChange(selectedLanguageCodes.filter(code => code !== languageCode))}
              />
            </Badge>
          ) : null;
        })}
        
        {emailVerified !== 'all' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {emailVerified === 'verified' ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span>Verified emails</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 text-amber-500" />
                <span>Unverified emails</span>
              </>
            )}
            <XIcon 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => onEmailVerifiedChange('all')}
            />
          </Badge>
        )}
      </div>
      
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="flex items-center gap-2"
        >
          <XIcon className="h-4 w-4" />
          Clear All ({activeFiltersCount})
        </Button>
      )}
    </>
  );
}