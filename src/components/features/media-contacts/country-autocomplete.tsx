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
import { type Country } from "@/app/actions/country-actions";

interface CountryAutocompleteProps {
  countries: Country[];
  selectedCountries: Country[];
  onCountriesChange: (countries: Country[]) => void;
  allCountries: Country[];
  placeholder?: string;
  error?: string;
}

export function CountryAutocomplete({
  countries,
  selectedCountries,
  onCountriesChange,
  allCountries,
  placeholder = "Search countries...",
  error,
}: CountryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);

  // Filter countries based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCountries(allCountries.filter(country => 
        !selectedCountries.some(selected => selected.id === country.id)
      ));
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = allCountries.filter(country => 
      country.name.toLowerCase().includes(lowercaseSearch) && 
      !selectedCountries.some(selected => selected.id === country.id)
    );
    
    setFilteredCountries(filtered);
  }, [searchTerm, allCountries, selectedCountries]);

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
    
    // Log for debugging
    console.log('Removing country ID:', countryId, 'Updated countries:', updatedCountries);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCountries.map((country) => (
          <Badge key={country.id} variant="secondary" className="text-sm py-1 px-2 flex items-center">
            <span>{country.name}</span>
            <button 
              type="button"
              className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted"
              onClick={(e) => handleRemove(country.id, e)}
              aria-label={`Remove ${country.name}`}
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
        
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput 
              placeholder="Search countries..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-2 text-center">
                  <p>No countries found.</p>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredCountries.map((country) => (
                  <CommandItem
                    key={country.id}
                    value={country.name}
                    onSelect={() => handleSelect(country)}
                    className="flex items-center"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountries.some(c => c.id === country.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{country.name}</span>
                    {country.code && (
                      <span className="ml-2 text-muted-foreground text-xs">({country.code})</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
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
