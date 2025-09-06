"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
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
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterItem } from './types';

interface ApiCountryFilterProps {
  selectedCountryIds: string[];
  onCountryFilterChange: (countryIds: string[]) => void;
  countries: FilterItem[];
  countriesLoading: boolean;
  countrySearch: string;
  setCountrySearch: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiCountryFilter({
  selectedCountryIds,
  onCountryFilterChange,
  countries,
  countriesLoading,
  countrySearch,
  setCountrySearch,
  isOpen,
  onOpenChange
}: ApiCountryFilterProps) {
  const [localCountries, setLocalCountries] = useState<FilterItem[]>(countries);
  const [localLoading, setLocalLoading] = useState(countriesLoading);

  // Update local state when props change
  useEffect(() => {
    setLocalCountries(countries);
  }, [countries]);

  useEffect(() => {
    setLocalLoading(countriesLoading);
  }, [countriesLoading]);

  // Search countries with debounce
  useEffect(() => {
    if (!isOpen) return;

    const fetchCountries = async () => {
      if (!countrySearch || countrySearch.trim() === '') {
        // Fetch popular countries
        try {
          setLocalLoading(true);
          const res = await fetch("/api/filters/countries?limit=10");
          if (res.ok) {
            const data = await res.json();
            setLocalCountries(data.items || []);
          }
        } catch (error) {
          console.error("Failed to fetch popular countries:", error);
          setLocalCountries([]);
        } finally {
          setLocalLoading(false);
        }
        return;
      }

      setLocalLoading(true);
      try {
        const url = `/api/filters/countries?s=${encodeURIComponent(countrySearch.trim())}&limit=20`;
        console.log('🔍 Searching countries with URL:', url);
        const res = await fetch(url);
        console.log('📡 API Response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('📊 API Response data:', data);
          console.log('🏛️ Setting countries:', data.items || []);
          setLocalCountries(data.items || []);
        } else {
          console.error("Failed to search countries:", res.status, res.statusText);
          setLocalCountries([]);
        }
      } catch (error) {
        console.error("Failed to search countries:", error);
        setLocalCountries([]);
      } finally {
        setLocalLoading(false);
      }
    };

    const timer = setTimeout(fetchCountries, 300);
    return () => clearTimeout(timer);
  }, [countrySearch, isOpen]);

  return (
    <div className="min-w-[200px]">
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {selectedCountryIds.length > 0
              ? `${selectedCountryIds.length} countries selected`
              : <span className="text-subtle">Select countries...</span>}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover text-default shadow-lg ring-1 ring-white/10 z-50 rounded-lg border border-border">
          <Command>
            <CommandInput 
              placeholder="Search countries..." 
              value={countrySearch}
              onValueChange={setCountrySearch}
              className="placeholder:text-subtle text-default"
            />
            <CommandList>
              {localLoading ? (
                <div className="py-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  <p className="text-sm text-subtle mt-1">Loading...</p>
                </div>
              ) : (
                <>
                  <CommandEmpty className="text-subtle">No countries found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {localCountries.map((country) => (
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
                        className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCountryIds.includes(country.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{country.label}</span>
                          {country.count !== undefined && (
                            <span className="text-xs text-subtle ml-2">
                              {country.count}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}