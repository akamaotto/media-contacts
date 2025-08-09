"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X as XIcon, Search, CheckCircle2, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  countries: Array<{ id: string; name: string; code?: string }>;
  beats: Array<{ id: string; name: string }>;
  outlets: Array<{ id: string; name: string; description?: string; website?: string }>;
  regions: Array<{ id: string; name: string; code: string }>;
  languages: Array<{ id: string; name: string; code: string }>;
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
  countries,
  beats,
  outlets,
  regions,
  languages
}: ApiFiltersProps) {
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isBeatOpen, setIsBeatOpen] = useState(false);
  const [isOutletOpen, setIsOutletOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

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
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search media contacts..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Countries Filter */}
            <div className="min-w-[200px]">
              <Popover open={isCountryOpen} onOpenChange={setIsCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isCountryOpen}
                    className="w-full justify-between"
                  >
                    {selectedCountryIds.length > 0
                      ? `${selectedCountryIds.length} countries selected`
                      : "Select countries..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search countries..." />
                    <CommandEmpty>No countries found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {countries.map((country) => (
                        <CommandItem
                          key={country.id}
                          onSelect={() => {
                            const isSelected = selectedCountryIds.includes(country.id);
                            if (isSelected) {
                              onCountryFilterChange(selectedCountryIds.filter(id => id !== country.id));
                            } else {
                              onCountryFilterChange([...selectedCountryIds, country.id]);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCountryIds.includes(country.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {country.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Beats Filter */}
            <div className="min-w-[200px]">
              <Popover open={isBeatOpen} onOpenChange={setIsBeatOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isBeatOpen}
                    className="w-full justify-between"
                  >
                    {selectedBeatIds.length > 0
                      ? `${selectedBeatIds.length} beats selected`
                      : "Select beats..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search beats..." />
                    <CommandEmpty>No beats found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {beats.map((beat) => (
                        <CommandItem
                          key={beat.id}
                          onSelect={() => {
                            const isSelected = selectedBeatIds.includes(beat.id);
                            if (isSelected) {
                              onBeatFilterChange(selectedBeatIds.filter(id => id !== beat.id));
                            } else {
                              onBeatFilterChange([...selectedBeatIds, beat.id]);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedBeatIds.includes(beat.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {beat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Outlets Filter */}
            <div className="min-w-[200px]">
              <Popover open={isOutletOpen} onOpenChange={setIsOutletOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOutletOpen}
                    className="w-full justify-between"
                  >
                    {selectedOutletIds.length > 0
                      ? `${selectedOutletIds.length} outlets selected`
                      : "Select outlets..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search outlets..." />
                    <CommandEmpty>No outlets found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {outlets.map((outlet) => (
                        <CommandItem
                          key={outlet.id}
                          onSelect={() => {
                            const isSelected = selectedOutletIds.includes(outlet.id);
                            if (isSelected) {
                              onOutletFilterChange(selectedOutletIds.filter(id => id !== outlet.id));
                            } else {
                              onOutletFilterChange([...selectedOutletIds, outlet.id]);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedOutletIds.includes(outlet.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {outlet.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Regions Filter */}
            <div className="min-w-[200px]">
              <Popover open={isRegionOpen} onOpenChange={setIsRegionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isRegionOpen}
                    className="w-full justify-between"
                  >
                    {selectedRegionCodes.length > 0
                      ? `${selectedRegionCodes.length} regions selected`
                      : "Select regions..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search regions..." />
                    <CommandEmpty>No regions found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {regions.map((region) => (
                        <CommandItem
                          key={region.id}
                          onSelect={() => {
                            const isSelected = selectedRegionCodes.includes(region.code);
                            if (isSelected) {
                              onRegionFilterChange(selectedRegionCodes.filter(code => code !== region.code));
                            } else {
                              onRegionFilterChange([...selectedRegionCodes, region.code]);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedRegionCodes.includes(region.code) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {region.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Languages Filter */}
            <div className="min-w-[200px]">
              <Popover open={isLanguageOpen} onOpenChange={setIsLanguageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isLanguageOpen}
                    className="w-full justify-between"
                  >
                    {selectedLanguageCodes.length > 0
                      ? `${selectedLanguageCodes.length} languages selected`
                      : "Select languages..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search languages..." />
                    <CommandEmpty>No languages found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {languages.map((language) => (
                        <CommandItem
                          key={language.id}
                          onSelect={() => {
                            const isSelected = selectedLanguageCodes.includes(language.code);
                            if (isSelected) {
                              onLanguageFilterChange(selectedLanguageCodes.filter(code => code !== language.code));
                            } else {
                              onLanguageFilterChange([...selectedLanguageCodes, language.code]);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedLanguageCodes.includes(language.code) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {language.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Email Verification Filter */}
            <div className="min-w-[180px]">
              <Select value={emailVerified} onValueChange={onEmailVerifiedChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Email verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3" /> {/* Spacer */}
                      <span>All Contacts</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="verified">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span>Verified Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unverified">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-amber-500" />
                      <span>Unverified Only</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
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
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchTerm.trim() && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchTerm}"
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
                    {country.name}
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
                    {beat.name}
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
                    {outlet.name}
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
                    {region.name}
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
                    {language.name}
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}