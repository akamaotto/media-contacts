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

interface ApiRegionFilterProps {
  selectedRegionCodes: string[];
  onRegionFilterChange: (regionCodes: string[]) => void;
  regions: FilterItem[];
  regionsLoading: boolean;
  regionSearch: string;
  setRegionSearch: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiRegionFilter({
  selectedRegionCodes,
  onRegionFilterChange,
  regions,
  regionsLoading,
  regionSearch,
  setRegionSearch,
  isOpen,
  onOpenChange
}: ApiRegionFilterProps) {
  const [localRegions, setLocalRegions] = useState<FilterItem[]>(regions);
  const [localLoading, setLocalLoading] = useState(regionsLoading);

  // Update local state when props change
  useEffect(() => {
    setLocalRegions(regions);
  }, [regions]);

  useEffect(() => {
    setLocalLoading(regionsLoading);
  }, [regionsLoading]);

  // Search regions with debounce
  useEffect(() => {
    if (!isOpen) return;

    const fetchRegions = async () => {
      if (!regionSearch || regionSearch.trim() === '') {
        // Fetch popular regions
        try {
          setLocalLoading(true);
          const res = await fetch("/api/filters/regions?limit=10");
          if (res.ok) {
            const data = await res.json();
            setLocalRegions(data.items || []);
          }
        } catch (error) {
          console.error("Failed to fetch popular regions:", error);
          setLocalRegions([]);
        } finally {
          setLocalLoading(false);
        }
        return;
      }

      setLocalLoading(true);
      try {
        const res = await fetch(`/api/filters/regions?s=${encodeURIComponent(regionSearch.trim())}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setLocalRegions(data.items || []);
        } else {
          console.error("Failed to search regions:", res.status, res.statusText);
          setLocalRegions([]);
        }
      } catch (error) {
        console.error("Failed to search regions:", error);
        setLocalRegions([]);
      } finally {
        setLocalLoading(false);
      }
    };

    const timer = setTimeout(fetchRegions, 300);
    return () => clearTimeout(timer);
  }, [regionSearch, isOpen]);

  return (
    <div className="min-w-[200px]">
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            {selectedRegionCodes.length > 0
              ? `${selectedRegionCodes.length} regions selected`
              : "Select regions..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover text-popover-foreground border border-border shadow-md z-50">
          <Command>
            <CommandInput 
              placeholder="Search regions..." 
              value={regionSearch}
              onValueChange={setRegionSearch}
            />
            <CommandList>
              {localLoading ? (
                <div className="py-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-1">Loading...</p>
                </div>
              ) : (
                <>
                  <CommandEmpty>No regions found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {localRegions.map((region) => (
                      <CommandItem
                        key={region.id}
                        onSelect={() => {
                          const isSelected = selectedRegionCodes.includes(region.code || '');
                          if (isSelected) {
                            onRegionFilterChange(selectedRegionCodes.filter(code => code !== (region.code || '')));
                          } else {
                            onRegionFilterChange([...selectedRegionCodes, region.code || '']);
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedRegionCodes.includes(region.code || '') ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{region.label}</span>
                          {region.count !== undefined && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {region.count}
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