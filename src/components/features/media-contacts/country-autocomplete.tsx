"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Country {
  id: string;
  label: string;
  code?: string;
  count?: number;
}

interface CountryAutocompleteProps {
  selectedCountries: Country[];
  onCountriesChange: (countries: Country[]) => void;
  placeholder?: string;
  error?: string;
}

export function CountryAutocomplete({
  selectedCountries,
  onCountriesChange,
  placeholder = "Search countries...",
  error,
}: CountryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularCountries, setPopularCountries] = useState<Country[]>([]);

  // Fetch popular countries on mount
  useEffect(() => {
    const fetchPopularCountries = async () => {
      try {
        const response = await fetch("/api/filters/countries?limit=5");
        if (response.ok) {
          const data = await response.json();
          setPopularCountries(data.items || []);
          // Set initial filtered countries to popular ones
          if (!searchTerm) {
            setFilteredCountries(data.items.filter((country: Country) => 
              !selectedCountries.some(selected => selected.id === country.id)
            ) || []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch popular countries:", error);
      }
    };

    fetchPopularCountries();
  }, []);

  // Filter countries based on search term
  useEffect(() => {
    const fetchFilteredCountries = async () => {
      if (!searchTerm) {
        // Show popular countries that aren't already selected
        setFilteredCountries(popularCountries.filter(country => 
          !selectedCountries.some(selected => selected.id === country.id)
        ));
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/filters/countries?s=${encodeURIComponent(searchTerm)}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          const filtered = data.items || [];
          setFilteredCountries(filtered.filter((country: Country) => 
            !selectedCountries.some(selected => selected.id === country.id)
          ));
        }
      } catch (error) {
        console.error("Failed to search countries:", error);
        setFilteredCountries([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      fetchFilteredCountries();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, popularCountries, selectedCountries]);

  const handleSelect = (country: Country) => {
    // Check if country already exists in the list
    if (!selectedCountries.some(c => c.id === country.id)) {
      onCountriesChange([...selectedCountries, country]);
    }
    setSearchTerm("");
    setOpen(false);
  };

  const handleRemove = (countryId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Also prevent default behavior
    
    // Create a new array without the removed country
    const updatedCountries = selectedCountries.filter(c => c.id !== countryId);
    
    // Update the countries state
    onCountriesChange(updatedCountries);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCountries.map((country) => (
          <Badge key={country.id} variant="secondary" className="text-sm py-1 px-2 flex items-center">
            <span>{country.label}</span>
            <button 
              type="button"
              className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted"
              onClick={(e) => handleRemove(country.id, e)}
              aria-label={`Remove ${country.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover text-popover-foreground border border-border shadow-md z-50">
          <Command>
            <CommandInput 
              placeholder="Search countries..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {loading ? (
                <div className="py-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-1">Loading...</p>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="py-2 text-center">
                      <p>No countries found.</p>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredCountries.map((country) => (
                      <CommandItem
                        key={country.id}
                        value={country.label}
                        onSelect={() => handleSelect(country)}
                        className="flex items-center"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCountries.some(c => c.id === country.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{country.label}</span>
                        {country.code && (
                          <span className="ml-2 text-muted-foreground text-xs">({country.code})</span>
                        )}
                        {country.count !== undefined && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {country.count}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}