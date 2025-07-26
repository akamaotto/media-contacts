"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface Country {
  id: string;
  name: string;
  code: string;
  flag_emoji?: string;
}

interface CountryAssignmentProps {
  regionCode: string;
  onCountriesChange?: (countries: Country[]) => void;
  onRefreshNeeded?: () => void;
  disabled?: boolean;
}

export function CountryAssignment({ 
  regionCode, 
  onCountriesChange,
  onRefreshNeeded,
  disabled = false 
}: CountryAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [assignedCountries, setAssignedCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all countries and assigned countries
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all countries
        const countriesResponse = await fetch('/api/countries');
        if (countriesResponse.ok) {
          const data = await countriesResponse.json();
          // Handle the API response structure: { countries: [...], total: ..., timestamp: ... }
          const countries = data.countries || [];
          setAllCountries(countries);
        }

        // Fetch assigned countries for this region
        if (regionCode) {
          const assignedResponse = await fetch(`/api/regions/${regionCode}/countries`);
          if (assignedResponse.ok) {
            const assigned = await assignedResponse.json();
            setAssignedCountries(assigned);
            onCountriesChange?.(assigned);
          }
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
        toast.error('Failed to load countries');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [regionCode, onCountriesChange]);

  const handleCountryToggle = async (country: Country) => {
    if (disabled) return;

    const isAssigned = assignedCountries.some(c => c.id === country.id);
    
    try {
      console.log('Toggling country assignment:', {
        country: country,
        regionCode: regionCode,
        isAssigned: isAssigned,
        countryId: country.id
      });

      if (isAssigned) {
        // Remove country from region
        const response = await fetch(`/api/regions/${regionCode}/countries`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ countryIds: [country.id] }),
        });

        if (response.ok) {
          const newAssigned = assignedCountries.filter(c => c.id !== country.id);
          setAssignedCountries(newAssigned);
          onCountriesChange?.(newAssigned);
          onRefreshNeeded?.(); // Trigger table refresh
          toast.success(`${country.name} removed from region`);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Remove country API error:', errorData);
          throw new Error(`Failed to remove country: ${errorData.error}`);
        }
      } else {
        // Add country to region
        const response = await fetch(`/api/regions/${regionCode}/countries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ countryIds: [country.id] }),
        });

        if (response.ok) {
          const newAssigned = [...assignedCountries, country];
          setAssignedCountries(newAssigned);
          onCountriesChange?.(newAssigned);
          onRefreshNeeded?.(); // Trigger table refresh
          toast.success(`${country.name} added to region`);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Add country API error:', errorData);
          throw new Error(`Failed to add country: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error('Error updating country assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update country assignment: ${errorMessage}`);
    }
  };

  const removeCountry = async (country: Country) => {
    if (disabled) return;
    await handleCountryToggle(country);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Assigned Countries ({assignedCountries.length})
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
              disabled={disabled || loading}
            >
              Add countries...
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandEmpty>No countries found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {allCountries.map((country) => {
                  const isAssigned = assignedCountries.some(c => c.id === country.id);
                  return (
                    <CommandItem
                      key={country.id}
                      onSelect={() => {
                        handleCountryToggle(country);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          isAssigned ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span className="mr-2">{country.flag_emoji}</span>
                      {country.name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {country.code}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Display assigned countries as badges */}
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-3 border rounded-md bg-muted/30">
        {assignedCountries.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            No countries assigned to this region
          </span>
        ) : (
          assignedCountries.map((country) => (
            <Badge
              key={country.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span>{country.flag_emoji}</span>
              <span>{country.name}</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeCountry(country)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
