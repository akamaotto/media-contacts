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

interface ApiOutletFilterProps {
  selectedOutletIds: string[];
  onOutletFilterChange: (outletIds: string[]) => void;
  outlets: FilterItem[];
  outletsLoading: boolean;
  outletSearch: string;
  setOutletSearch: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiOutletFilter({
  selectedOutletIds,
  onOutletFilterChange,
  outlets,
  outletsLoading,
  outletSearch,
  setOutletSearch,
  isOpen,
  onOpenChange
}: ApiOutletFilterProps) {
  const [localOutlets, setLocalOutlets] = useState<FilterItem[]>(outlets);
  const [localLoading, setLocalLoading] = useState(outletsLoading);

  // Update local state when props change
  useEffect(() => {
    setLocalOutlets(outlets);
  }, [outlets]);

  useEffect(() => {
    setLocalLoading(outletsLoading);
  }, [outletsLoading]);

  // Search outlets with debounce
  useEffect(() => {
    if (!isOpen) return;

    const fetchOutlets = async () => {
      if (!outletSearch || outletSearch.trim() === '') {
        // Fetch popular outlets
        try {
          setLocalLoading(true);
          const res = await fetch("/api/filters/outlets?limit=10");
          if (res.ok) {
            const data = await res.json();
            setLocalOutlets(data.items || []);
          }
        } catch (error) {
          console.error("Failed to fetch popular outlets:", error);
          setLocalOutlets([]);
        } finally {
          setLocalLoading(false);
        }
        return;
      }

      setLocalLoading(true);
      try {
        const res = await fetch(`/api/filters/outlets?s=${encodeURIComponent(outletSearch.trim())}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setLocalOutlets(data.items || []);
        } else {
          console.error("Failed to search outlets:", res.status, res.statusText);
          setLocalOutlets([]);
        }
      } catch (error) {
        console.error("Failed to search outlets:", error);
        setLocalOutlets([]);
      } finally {
        setLocalLoading(false);
      }
    };

    const timer = setTimeout(fetchOutlets, 300);
    return () => clearTimeout(timer);
  }, [outletSearch, isOpen]);

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
            {selectedOutletIds.length > 0
              ? `${selectedOutletIds.length} outlets selected`
              : "Select outlets..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover text-popover-foreground border border-border shadow-md z-50">
          <Command>
            <CommandInput 
              placeholder="Search outlets..." 
              value={outletSearch}
              onValueChange={setOutletSearch}
            />
            <CommandList>
              {localLoading ? (
                <div className="py-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-1">Loading...</p>
                </div>
              ) : (
                <>
                  <CommandEmpty>No outlets found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {localOutlets.map((outlet) => (
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
                        <div className="flex flex-col">
                          <span>{outlet.label}</span>
                          {outlet.description && (
                            <span className="text-sm text-muted-foreground">
                              {outlet.description}
                            </span>
                          )}
                        </div>
                        {outlet.count !== undefined && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {outlet.count}
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
    </div>
  );
}