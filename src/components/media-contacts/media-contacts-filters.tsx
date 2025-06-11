"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckIcon, ChevronsUpDownIcon, X as XIcon, Globe, Languages, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Country } from "@/app/actions/country-actions";
import { Beat } from "@/app/actions/beat-actions";
import { Region } from "@/lib/country-data";
import { Language } from "@/lib/language-data";

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
          {/* Main Search Input */}
          <div className="flex-grow min-w-[200px] sm:min-w-[250px] md:min-w-[300px]">
            <div className="space-y-1">
              <Label htmlFor="mainSearch">Search</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="mainSearch"
                  placeholder="Search media contacts..."
                  value={mainSearchTerm}
                  onChange={(e) => {
                    console.debug("[MediaContactFilters] Setting search term:", e.target.value);
                    setMainSearchTerm(e.target.value);
                  }}
                  className="pl-9" // add left padding for icon
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && onSearchSubmit) {
                      console.debug("[MediaContactFilters] Enter key pressed, triggering search");
                      if (setIsLoading) setIsLoading(true);
                      onSearchSubmit();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Region Filter Popover */}
          <div className="min-w-[180px]">
            <Label htmlFor="regionFilterButton" className="text-sm font-medium flex items-center">
              <Globe className="h-4 w-4 mr-1 text-muted-foreground" />
              Regions
            </Label>
            <Popover open={isRegionDropdownOpen} onOpenChange={setIsRegionDropdownOpen}>
              <PopoverTrigger asChild>
                <Button id="regionFilterButton" variant="outline" role="combobox" className="w-full justify-between mt-1">
                  <span className="truncate">
                    {selectedRegionCodes.length === 0
                      ? "Select regions..."
                      : selectedRegionCodes.length === 1 && allRegions.find(r => r.code === selectedRegionCodes[0])
                      ? allRegions.find(r => r.code === selectedRegionCodes[0])!.name
                      : `${selectedRegionCodes.length} selected`}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search regions..."
                    value={searchFilterRegionTerm}
                    onValueChange={setSearchFilterRegionTerm}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No regions found.</CommandEmpty>
                    <CommandGroup>
                      {regionOptions
                        .filter((region: { name?: string }) => {
                          const label = region?.name || '';
                          const searchTerm = searchFilterRegionTerm || '';
                          return searchTerm === '' || label.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                        .map((region: {code: string; name: string}) => (
                          <CommandItem
                            key={region.code}
                            value={region.name}
                            onSelect={() => {
                              setSelectedRegionCodes((prev) =>
                                prev.includes(region.code)
                                  ? prev.filter((code) => code !== region.code)
                                  : [...prev, region.code]
                              );
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedRegionCodes.includes(region.code) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {region.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Country Filter Popover */}
          <div className="min-w-[180px]">
            <Label htmlFor="countryFilterButton" className="text-sm font-medium">Countries</Label>
            <Popover open={isCountryDropdownOpen} onOpenChange={setIsCountryDropdownOpen}>
              <PopoverTrigger asChild>
                <Button id="countryFilterButton" variant="outline" role="combobox" className="w-full justify-between mt-1">
                  <span className="truncate">
                    {selectedCountryIds.length === 0
                      ? "Select countries..."
                      : selectedCountryIds.length === 1 && allCountries.find(c => c.id === selectedCountryIds[0])
                      ? allCountries.find(c => c.id === selectedCountryIds[0])!.name
                      : `${selectedCountryIds.length} selected`}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search countries..."
                    value={searchFilterCountryTerm}
                    onValueChange={setSearchFilterCountryTerm}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No countries found.</CommandEmpty>
                    <CommandGroup>
                      {countryOptions
                        .filter((country: any) => {
                          const label = country?.name || country?.label || '';
                          const searchTerm = searchFilterCountryTerm || '';
                          return searchTerm === '' || label.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                        .map((country: any) => {
                          // Get id and display name safely
                          const id = country?.id || country?.value || '';
                          const name = country?.name || country?.label || '';
                          return (
                            <CommandItem
                              key={id}
                              value={name}
                              onSelect={() => {
                                setSelectedCountryIds((prev) =>
                                  prev.includes(id)
                                    ? prev.filter((prevId) => prevId !== id)
                                    : [...prev, id]
                                );
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCountryIds.includes(id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          );
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Beat Filter Popover */}
          <div className="min-w-[180px]">
            <Label htmlFor="beatFilterButton" className="text-sm font-medium">Beats</Label>
            <Popover open={isBeatDropdownOpen} onOpenChange={setIsBeatDropdownOpen}>
              <PopoverTrigger asChild>
                <Button id="beatFilterButton" variant="outline" role="combobox" className="w-full justify-between mt-1">
                  <span className="truncate">
                    {selectedBeatIds.length === 0
                      ? "Select beats..."
                      : selectedBeatIds.length === 1 && allBeats.find(b => b.id === selectedBeatIds[0])
                      ? allBeats.find(b => b.id === selectedBeatIds[0])!.name
                      : `${selectedBeatIds.length} selected`}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search beats..."
                    value={searchFilterBeatTerm}
                    onValueChange={setSearchFilterBeatTerm}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No beats found.</CommandEmpty>
                    <CommandGroup>
                      {beatOptions
                        .filter((beat: any) => {
                          const label = beat?.name || beat?.label || '';
                          const searchTerm = searchFilterBeatTerm || '';
                          return searchTerm === '' || label.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                        .map((beat: any) => {
                          // Get id and display name safely
                          const id = beat?.id || beat?.value || '';
                          const name = beat?.name || beat?.label || '';
                          return (
                            <CommandItem
                              key={id}
                              value={name}
                              onSelect={() => {
                                setSelectedBeatIds((prev) =>
                                  prev.includes(id)
                                    ? prev.filter((prevId) => prevId !== id)
                                    : [...prev, id]
                                );
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedBeatIds.includes(id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          );
                        })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
                  

          {/* Language Filter Popover */}
          <div className="min-w-[180px]">
            <Label htmlFor="languageFilterButton" className="text-sm font-medium flex items-center">
              <Languages className="h-4 w-4 mr-1 text-muted-foreground" />
              Languages
            </Label>
            <Popover open={isLanguageDropdownOpen} onOpenChange={setIsLanguageDropdownOpen}>
              <PopoverTrigger asChild>
                <Button id="languageFilterButton" variant="outline" role="combobox" className="w-full justify-between mt-1">
                  <span className="truncate">
                    {selectedLanguageCodes.length === 0
                      ? "Select languages..."
                      : selectedLanguageCodes.length === 1 && allLanguages.find(l => l.code === selectedLanguageCodes[0])
                      ? allLanguages.find(l => l.code === selectedLanguageCodes[0])!.name
                      : `${selectedLanguageCodes.length} selected`}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search languages..."
                    value={searchFilterLanguageTerm}
                    onValueChange={setSearchFilterLanguageTerm}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No languages found.</CommandEmpty>
                    <CommandGroup>
                      {languageOptions
                        .filter((language: any) => {
                          const label = language?.name || language?.label || '';
                          const searchTerm = searchFilterLanguageTerm || '';
                          return searchTerm === '' || label.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                        .map((language: any) => {
                          // Get code and display name safely
                          const code = language?.code || language?.value || '';
                          const name = language?.name || language?.label || '';
                          return (
                            <CommandItem
                              key={code}
                              value={name}
                              onSelect={() => {
                                setSelectedLanguageCodes((prev) =>
                                  prev.includes(code)
                                    ? prev.filter((prevCode) => prevCode !== code)
                                    : [...prev, code]
                                );
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedLanguageCodes.includes(code) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          );
                        })}

                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Email Verification Filter - Converted to dropdown */}
          <div className="flex flex-col space-y-1.5 pt-1">
            <Label className="text-sm font-medium">Email Verification</Label>
            <Popover
              open={isEmailVerifiedDropdownOpen}
              onOpenChange={setIsEmailVerifiedDropdownOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isEmailVerifiedDropdownOpen}
                  className="w-full justify-between"
                >
                  <span className="truncate">
                    {emailVerifiedFilter === 'all' && 'All Contacts'}
                    {emailVerifiedFilter === 'verified' && 'Verified Emails'}
                    {emailVerifiedFilter === 'unverified' && 'Unverified Emails'}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        key="all"
                        value="All Contacts"
                        onSelect={() => {
                          setEmailVerifiedFilter('all');
                          setIsEmailVerifiedDropdownOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            emailVerifiedFilter === 'all' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Contacts
                      </CommandItem>
                      <CommandItem
                        key="verified"
                        value="Verified Emails"
                        onSelect={() => {
                          setEmailVerifiedFilter('verified');
                          setIsEmailVerifiedDropdownOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            emailVerifiedFilter === 'verified' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Verified Emails
                      </CommandItem>
                      <CommandItem
                        key="unverified"
                        value="Unverified Emails"
                        onSelect={() => {
                          setEmailVerifiedFilter('unverified');
                          setIsEmailVerifiedDropdownOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            emailVerifiedFilter === 'unverified' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Unverified Emails
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

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
