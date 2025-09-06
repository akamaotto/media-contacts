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

interface ApiBeatFilterProps {
  selectedBeatIds: string[];
  onBeatFilterChange: (beatIds: string[]) => void;
  beats: FilterItem[];
  beatsLoading: boolean;
  beatSearch: string;
  setBeatSearch: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiBeatFilter({
  selectedBeatIds,
  onBeatFilterChange,
  beats,
  beatsLoading,
  beatSearch,
  setBeatSearch,
  isOpen,
  onOpenChange
}: ApiBeatFilterProps) {
  const [localBeats, setLocalBeats] = useState<FilterItem[]>(beats);
  const [localLoading, setLocalLoading] = useState(beatsLoading);

  // Update local state when props change
  useEffect(() => {
    setLocalBeats(beats);
  }, [beats]);

  useEffect(() => {
    setLocalLoading(beatsLoading);
  }, [beatsLoading]);

  // Search beats with debounce
  useEffect(() => {
    if (!isOpen) return;

    const fetchBeats = async () => {
      if (!beatSearch || beatSearch.trim() === '') {
        // Fetch popular beats
        try {
          setLocalLoading(true);
          const res = await fetch("/api/filters/beats?limit=10");
          if (res.ok) {
            const data = await res.json();
            setLocalBeats(data.items || []);
          }
        } catch (error) {
          console.error("Failed to fetch popular beats:", error);
          setLocalBeats([]);
        } finally {
          setLocalLoading(false);
        }
        return;
      }

      setLocalLoading(true);
      try {
        const res = await fetch(`/api/filters/beats?s=${encodeURIComponent(beatSearch.trim())}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setLocalBeats(data.items || []);
        } else {
          console.error("Failed to search beats:", res.status, res.statusText);
          setLocalBeats([]);
        }
      } catch (error) {
        console.error("Failed to search beats:", error);
        setLocalBeats([]);
      } finally {
        setLocalLoading(false);
      }
    };

    const timer = setTimeout(fetchBeats, 300);
    return () => clearTimeout(timer);
  }, [beatSearch, isOpen]);

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
            {selectedBeatIds.length > 0
              ? `${selectedBeatIds.length} beats selected`
              : "Select beats..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover text-popover-foreground border border-border shadow-md z-50">
          <Command>
            <CommandInput 
              placeholder="Search beats..." 
              value={beatSearch}
              onValueChange={setBeatSearch}
            />
            <CommandList>
              {localLoading ? (
                <div className="py-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-1">Loading...</p>
                </div>
              ) : (
                <>
                  <CommandEmpty>No beats found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {localBeats.map((beat) => (
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
                        <div className="flex flex-col">
                          <span>{beat.label}</span>
                          {beat.description && (
                            <span className="text-sm text-muted-foreground">
                              {beat.description}
                            </span>
                          )}
                        </div>
                        {beat.count !== undefined && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {beat.count}
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