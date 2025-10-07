'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ClientErrorHandler } from '@/lib/api/client-error-handler';

interface Region {
  id: string;
  label: string;
  code?: string;
  category?: string;
  count?: number;
}

interface RegionAutocompleteProps {
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
  onRegionsMapChange?: (regionsMap: Map<string, Region>) => void;
  placeholder?: string;
  error?: string;
}

export function RegionAutocomplete({
  selectedRegions,
  onRegionsChange,
  onRegionsMapChange,
  placeholder = 'Search regions...',
  error,
}: RegionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Region[]>([]);
  const [popularRegions, setPopularRegions] = useState<Region[]>([]);
  const [selectedRegionsMap, setSelectedRegionsMap] = useState<Map<string, Region>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // Enhanced error handler for API calls
  const errorHandler = useRef(new ClientErrorHandler({
    enableToasts: false, // Don't show toasts for autocomplete
    enableConsoleLogging: false
  })).current;

  // Fetch popular regions on mount
  useEffect(() => {
    const fetchPopularRegions = async () => {
      try {
        const response = await fetch('/api/filters/regions?limit=5');
        if (response.ok) {
          const data = await response.json();
          setPopularRegions(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch popular regions:', error);
      }
    };

    fetchPopularRegions();
  }, []);

  // Search regions when input value changes (with debounce)
  useEffect(() => {
    const fetchRegions = async () => {
      if (!inputValue) {
        // Show popular regions
        setSuggestions(popularRegions);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/filters/regions?s=${encodeURIComponent(inputValue)}&limit=20`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSuggestions(data.items || []);
      } catch (error) {
        console.error('RegionAutocomplete: Error searching regions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce input value
    const timer = setTimeout(() => {
      fetchRegions();
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, popularRegions]);

  const handleSelect = (region: Region) => {
    // Check if region already exists in the list
    if (!selectedRegions.includes(region.id)) {
      onRegionsChange([...selectedRegions, region.id]);
      // Update the map with the selected region
      const newMap = new Map(selectedRegionsMap);
      newMap.set(region.id, region);
      setSelectedRegionsMap(newMap);
      onRegionsMapChange?.(newMap);
    }
    setInputValue('');
    setOpen(false);
  };

  const handleRemove = (regionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Also prevent default behavior

    // Create a new array without the removed region
    const updatedRegions = selectedRegions.filter((r) => r !== regionId);

    // Update the regions state
    onRegionsChange(updatedRegions);

    // Remove from the map
    const newMap = new Map(selectedRegionsMap);
    newMap.delete(regionId);
    setSelectedRegionsMap(newMap);
    onRegionsMapChange?.(newMap);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !loading) {
      e.preventDefault();
      // Add custom region if not in suggestions
      if (!selectedRegions.includes(inputValue.trim())) {
        onRegionsChange([...selectedRegions, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === ',' && inputValue.trim()) {
      // Also allow comma to add a region (common in tag inputs)
      e.preventDefault();
      if (!selectedRegions.includes(inputValue.trim())) {
        onRegionsChange([...selectedRegions, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap gap-2 mb-2'>
        {selectedRegions.map((regionId) => {
          const region = selectedRegionsMap.get(regionId);
          return region ? (
            <Badge
              key={regionId}
              variant='secondary'
              className='text-sm py-1 px-2 flex items-center'
            >
              <span>{region.label}</span>
              <button
                type='button'
                className='ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted'
                onClick={(e) => handleRemove(regionId, e)}
                aria-label={`Remove ${region.label}`}
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          ) : null;
        })}
      </div>

      <div className='flex gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className='w-full justify-between'
              onClick={() => inputRef.current?.focus()}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className='w-full bg-transparent border-none outline-none'
                placeholder={placeholder}
              />
              {loading ? (
                <Loader2 className='ml-2 h-4 w-4 shrink-0 animate-spin' />
              ) : (
                <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className='w-[--radix-popover-trigger-width] p-0 bg-popover text-popover-foreground border border-border shadow-md z-50'>
            <Command>
              <CommandInput
                placeholder={placeholder}
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {loading ? (
                  <div className='flex items-center justify-center py-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span className='ml-2'>Searching...</span>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>
                      <div className='py-2 text-center'>
                        <p>No regions found.</p>
                        {inputValue.trim() && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='mt-2'
                            onClick={() => {
                              if (inputValue.trim() && !selectedRegions.includes(inputValue.trim())) {
                                onRegionsChange([...selectedRegions, inputValue.trim()]);
                                setInputValue('');
                                setOpen(false);
                              }
                            }}
                          >
                            Add &quot;{inputValue.trim()}&quot;
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {suggestions.map((region) => (
                        <CommandItem
                          key={region.id}
                          value={region.label}
                          onSelect={() => handleSelect(region)}
                          className='flex items-center hover:bg-gray-100 dark:hover:bg-accent cursor-pointer rounded-sm transition-colors'
                        >
                          <div className='mr-2 h-4 w-4 border-2 border-gray-400 dark:border-border rounded flex items-center justify-center bg-white dark:bg-background hover:border-gray-600 dark:hover:border-primary transition-colors'>
                            {selectedRegions.includes(region.id) && (
                              <Check className='h-3 w-3 text-blue-600 dark:text-primary' />
                            )}
                          </div>
                          <div className='flex items-center'>
                            <span>{region.label}</span>
                          </div>
                          {region.category && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {region.category}
                            </Badge>
                          )}
                          {region.count !== undefined && (
                            <span className='ml-auto text-xs text-muted-foreground'>
                              {region.count}
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

        {/* Add button for direct entry */}
        {inputValue.trim() && (
          <Button
            type='button'
            onClick={() => {
              if (inputValue.trim() && !selectedRegions.includes(inputValue.trim())) {
                onRegionsChange([...selectedRegions, inputValue.trim()]);
                setInputValue('');
              }
            }}
          >
            Add
          </Button>
        )}
      </div>

      {error && <p className='text-sm text-destructive mt-1'>{error}</p>}
    </div>
  );
}