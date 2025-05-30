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
import { CheckIcon, ChevronsUpDownIcon, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Country } from "@/app/actions/country-actions"; // Assuming this path is correct
import { Beat } from "@/app/actions/beat-actions"; // Assuming this path is correct

export interface MediaContactsFiltersProps {
  mainSearchTerm: string;
  setMainSearchTerm: (term: string) => void;
  
  allCountries: Country[];
  selectedCountryIds: string[];
  setSelectedCountryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isCountryDropdownOpen: boolean;
  setIsCountryDropdownOpen: (isOpen: boolean) => void;
  searchFilterCountryTerm: string;
  setSearchFilterCountryTerm: (term: string) => void;

  allBeats: Beat[];
  selectedBeatIds: string[];
  setSelectedBeatIds: React.Dispatch<React.SetStateAction<string[]>>;
  isBeatDropdownOpen: boolean;
  setIsBeatDropdownOpen: (isOpen: boolean) => void;
  searchFilterBeatTerm: string;
  setSearchFilterBeatTerm: (term: string) => void;

  emailVerifiedFilter: 'all' | 'verified' | 'unverified';
  setEmailVerifiedFilter: (value: 'all' | 'verified' | 'unverified') => void;
  
  activeFiltersCount: number;
  handleClearAllFilters: () => void;
}

export function MediaContactsFilters({
  mainSearchTerm,
  setMainSearchTerm,
  allCountries,
  selectedCountryIds,
  setSelectedCountryIds,
  isCountryDropdownOpen,
  setIsCountryDropdownOpen,
  searchFilterCountryTerm,
  setSearchFilterCountryTerm,
  allBeats,
  selectedBeatIds,
  setSelectedBeatIds,
  isBeatDropdownOpen,
  setIsBeatDropdownOpen,
  searchFilterBeatTerm,
  setSearchFilterBeatTerm,
  emailVerifiedFilter,
  setEmailVerifiedFilter,
  activeFiltersCount,
  handleClearAllFilters,
}: MediaContactsFiltersProps) {
  return (
    <Card>
      <CardContent> {/* Added pt-6 to CardContent as CardHeader was removed by user */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Main Search Input */}
          <div className="flex-grow min-w-[200px] sm:min-w-[250px] md:min-w-[300px]">
            <Label htmlFor="mainSearch" className="text-sm font-medium">Search</Label>
            <Input
              id="mainSearch"
              placeholder="Contacts, emails, outlets..."
              value={mainSearchTerm}
              onChange={(event) => setMainSearchTerm(event.target.value)}
              className="w-full mt-1"
            />
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
                  <CommandInput placeholder="Search country..." value={searchFilterCountryTerm} onValueChange={setSearchFilterCountryTerm} />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {allCountries.map((country) => (
                        <CommandItem
                          key={country.id}
                          value={country.name}
                          onSelect={() => {
                            setSelectedCountryIds((prev) =>
                              prev.includes(country.id)
                                ? prev.filter((id) => id !== country.id)
                                : [...prev, country.id]
                            );
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCountryIds.includes(country.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {country.name}
                        </CommandItem>
                      ))}
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
                  <CommandInput placeholder="Search beat..." value={searchFilterBeatTerm} onValueChange={setSearchFilterBeatTerm}/>
                  <CommandList>
                    <CommandEmpty>No beat found.</CommandEmpty>
                    <CommandGroup>
                      {allBeats.map((beat) => (
                        <CommandItem
                          key={beat.id}
                          value={beat.name}
                          onSelect={() => {
                            setSelectedBeatIds((prev) =>
                              prev.includes(beat.id)
                                ? prev.filter((id) => id !== beat.id)
                                : [...prev, beat.id]
                            );
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedBeatIds.includes(beat.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {beat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Email Verification Filter */}
          <div className="flex flex-col space-y-1.5 pt-1"> {/* Adjusted for alignment */}
            <Label className="text-sm font-medium">Email Verification</Label>
            <RadioGroup
              value={emailVerifiedFilter}
              onValueChange={(value) => setEmailVerifiedFilter(value as 'all' | 'verified' | 'unverified')}
              className="flex items-center space-x-3 pt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="email-all" />
                <Label htmlFor="email-all" className="font-normal">All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="verified" id="email-verified" />
                <Label htmlFor="email-verified" className="font-normal">Verified</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unverified" id="email-unverified" />
                <Label htmlFor="email-unverified" className="font-normal">Unverified</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Clear All Filters Button */}
          {activeFiltersCount > 0 && (
              <Button variant="ghost" onClick={handleClearAllFilters} className="self-end">
                  <XIcon className="mr-2 h-4 w-4" /> Clear All
              </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
