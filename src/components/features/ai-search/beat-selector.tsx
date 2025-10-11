"use client";

import * as React from "react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, X, Hash, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BeatSelectorProps, Beat, accessibilityLabels } from "./types";

// Popular beats that should appear first
const POPULAR_BEATS = [
  "Politics",
  "Technology",
  "Business",
  "Health",
  "Science",
  "Sports",
  "Entertainment",
  "Climate Change",
  "Education",
  "Crime"
];

export function BeatSelector({
  value,
  onChange,
  maxSelection = 15,
  disabled = false,
  error,
  allowCustom = true,
}: BeatSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [allBeats, setAllBeats] = useState<Beat[]>([]);
  const [customBeatInput, setCustomBeatInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch beats on mount
  useEffect(() => {
    const fetchBeats = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/filters/beats?limit=200");
        if (response.ok) {
          const data = await response.json();
          setAllBeats(data.items || []);
        }
      } catch (error) {
        console.error("Failed to fetch beats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBeats();
  }, []);

  // Filter and organize beats
  const { popularBeats, filteredBeats, customBeats } = useMemo(() => {
    const popular = allBeats.filter(beat =>
      POPULAR_BEATS.includes(beat.name) && !value.includes(beat.name)
    );

    const filtered = searchTerm
      ? allBeats.filter(beat =>
          beat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          beat.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(beat => !value.includes(beat.name))
      : allBeats.filter(beat =>
          !value.includes(beat.name) && !POPULAR_BEATS.includes(beat.name)
        );

    const custom = value.filter(beatName =>
      !allBeats.some(beat => beat.name === beatName)
    );

    return {
      popularBeats: popular,
      filteredBeats: filtered,
      customBeats: custom
    };
  }, [allBeats, value, searchTerm]);

  const handleSelect = useCallback((beat: Beat | string) => {
    if (value.length >= maxSelection) return;

    const beatName = typeof beat === 'string' ? beat : beat.name;
    if (!value.includes(beatName)) {
      onChange([...value, beatName]);
    }
    setSearchTerm("");
    setCustomBeatInput("");
  }, [value, onChange, maxSelection]);

  const handleRemove = useCallback((beatName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const updatedBeats = value.filter(b => b !== beatName);
    onChange(updatedBeats);
  }, [value, onChange]);

  const handleAddCustom = useCallback(() => {
    const trimmedInput = customBeatInput.trim();
    if (trimmedInput && !value.includes(trimmedInput) && value.length < maxSelection) {
      onChange([...value, trimmedInput]);
      setCustomBeatInput("");
      inputRef.current?.focus();
    }
  }, [customBeatInput, value, onChange, maxSelection]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customBeatInput.trim()) {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === ',' && customBeatInput.trim()) {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [customBeatInput, handleAddCustom]);

  // Get selected beat details for display
  const selectedBeatDetails = useMemo(() => {
    return value.map(beatName => {
      const beat = allBeats.find(b => b.name === beatName);
      return {
        name: beatName,
        description: beat?.description,
        isCustom: !beat
      };
    });
  }, [value, allBeats]);

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      {/* Selected beats display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Beats {value.length > 0 && `(${value.length}/${maxSelection})`}
          </label>
          {value.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 border rounded-md bg-background">
          {selectedBeatDetails.length > 0 ? (
            selectedBeatDetails.map((beat) => (
              <Badge
                key={beat.name}
                variant={beat.isCustom ? "outline" : "secondary"}
                className="text-xs py-1 px-2 flex items-center gap-1"
              >
                {beat.isCustom && <Sparkles className="h-3 w-3" />}
                <span>{beat.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="ml-1 h-3 w-3 rounded-full inline-flex items-center justify-center hover:bg-muted"
                    onClick={(e) => handleRemove(beat.name, e)}
                    aria-label={`Remove ${beat.name}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">
              No beats selected
            </span>
          )}
        </div>
      </div>

      {/* Beat selector */}
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label={accessibilityLabels.beatSelector.trigger}
              className="w-full justify-between h-10"
              disabled={disabled || value.length >= maxSelection}
            >
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {value.length >= maxSelection
                    ? "Maximum beats reached"
                    : "Select beats..."
                  }
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-full p-0 bg-popover text-popover-foreground border border-border shadow-md z-50"
            align="start"
            side="bottom"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search beats..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="border-0 focus:ring-0"
              />

              <CommandList>
                {loading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Loading beats...</p>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>
                      <div className="py-4 text-center">
                        <Hash className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm mb-3">No beats found for "{searchTerm}"</p>
                        {allowCustom && searchTerm.trim() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelect(searchTerm.trim())}
                            disabled={value.length >= maxSelection}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add "{searchTerm.trim()}"
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>

                    <ScrollArea className="h-64">
                      {/* Popular Beats */}
                      {popularBeats.length > 0 && !searchTerm && (
                        <>
                          <CommandGroup heading="Popular Beats">
                            {popularBeats.map((beat) => (
                              <CommandItem
                                key={beat.id}
                                value={beat.name}
                                onSelect={() => handleSelect(beat)}
                                className="flex items-center px-2 py-2 hover:bg-gray-100 dark:hover:bg-accent cursor-pointer transition-colors"
                              >
                                <div className="mr-2 h-4 w-4 border-2 border-gray-400 dark:border-border rounded flex items-center justify-center bg-white dark:bg-background">
                                  <Check className="h-3 w-3 text-blue-600 dark:text-primary" />
                                </div>
                                <div className="flex items-center flex-1 min-w-0">
                                  <span className="truncate">{beat.name}</span>
                                  {beat.description && (
                                    <span className="ml-2 text-xs text-muted-foreground truncate">
                                      ({beat.description})
                                    </span>
                                  )}
                                </div>
                                {beat.count !== undefined && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {beat.count}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                        </>
                      )}

                      {/* Filtered/All Beats */}
                      {filteredBeats.length > 0 && (
                        <CommandGroup heading={searchTerm ? "Search Results" : "All Beats"}>
                          {filteredBeats.map((beat) => (
                            <CommandItem
                              key={beat.id}
                              value={beat.name}
                              onSelect={() => handleSelect(beat)}
                              className="flex items-center px-2 py-2 hover:bg-gray-100 dark:hover:bg-accent cursor-pointer transition-colors"
                            >
                              <div className="mr-2 h-4 w-4 border-2 border-gray-400 dark:border-border rounded flex items-center justify-center bg-white dark:bg-background">
                                <Check className="h-3 w-3 text-blue-600 dark:text-primary" />
                              </div>
                              <div className="flex items-center flex-1 min-w-0">
                                <span className="truncate">{beat.name}</span>
                                {beat.description && (
                                  <span className="ml-2 text-xs text-muted-foreground truncate">
                                    ({beat.description})
                                  </span>
                                )}
                              </div>
                              {beat.count !== undefined && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {beat.count}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Custom Beats */}
                      {customBeats.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="Custom Beats">
                            {customBeats.map((beatName) => (
                              <CommandItem
                                key={beatName}
                                value={beatName}
                                className="flex items-center px-2 py-2 hover:bg-gray-100 dark:hover:bg-accent cursor-pointer transition-colors"
                                disabled
                              >
                                <Sparkles className="mr-2 h-3 w-3 text-muted-foreground" />
                                <span className="truncate">{beatName}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </ScrollArea>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Custom beat input */}
        {allowCustom && (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={customBeatInput}
                onChange={(e) => setCustomBeatInput(e.target.value)}
                placeholder="Add custom beat..."
                disabled={disabled || value.length >= maxSelection}
                onKeyDown={handleKeyDown}
                className="pr-8"
              />
              {customBeatInput.trim() && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={handleAddCustom}
                  disabled={value.length >= maxSelection}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive mt-1" role="alert">
          {error}
        </p>
      )}

      {value.length >= maxSelection && (
        <p className="text-sm text-muted-foreground">
          Maximum of {maxSelection} beats can be selected
        </p>
      )}

      {allowCustom && (
        <p className="text-xs text-muted-foreground">
          Type to search existing beats or add custom ones
        </p>
      )}
    </div>
  );
}