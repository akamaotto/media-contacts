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

interface Outlet {
  id: string;
  label: string;
  description?: string;
  website?: string;
  count?: number;
}

interface OutletAutocompleteProps {
  outlets: string[];
  onOutletsChange: (outlets: string[]) => void;
  placeholder?: string;
  error?: string;
}

export function OutletAutocomplete({
  outlets,
  onOutletsChange,
  placeholder = 'Add outlet...',
  error,
}: OutletAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Outlet[]>([]);
  const [popularOutlets, setPopularOutlets] = useState<Outlet[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enhanced error handler for API calls
  const errorHandler = useRef(new ClientErrorHandler({
    enableToasts: false, // Don't show toasts for autocomplete
    enableConsoleLogging: false
  })).current;

  // Fetch popular outlets on mount
  useEffect(() => {
    const fetchPopularOutlets = async () => {
      try {
        const response = await fetch('/api/filters/outlets?limit=5');
        if (response.ok) {
          const data = await response.json();
          setPopularOutlets(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch popular outlets:', error);
      }
    };

    fetchPopularOutlets();
  }, []);

  // Search outlets when input value changes (with debounce)
  useEffect(() => {
    const fetchOutlets = async () => {
      if (!inputValue) {
        // Show popular outlets
        setSuggestions(popularOutlets);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/filters/outlets?s=${encodeURIComponent(inputValue)}&limit=20`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSuggestions(data.items || []);
      } catch (error) {
        console.error('OutletAutocomplete: Error searching outlets:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce input value
    const timer = setTimeout(() => {
      fetchOutlets();
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, popularOutlets]);

  const handleSelect = (outlet: Outlet) => {
    // Check if outlet already exists in the list
    if (!outlets.includes(outlet.label)) {
      onOutletsChange([...outlets, outlet.label]);
    }
    setInputValue('');
    setOpen(false);
  };

  const handleRemove = (outletLabel: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Also prevent default behavior

    // Create a new array without the removed outlet
    const updatedOutlets = outlets.filter((o) => o !== outletLabel);

    // Update the outlets state
    onOutletsChange(updatedOutlets);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !loading) {
      e.preventDefault();
      // Add custom outlet if not in suggestions
      if (!outlets.includes(inputValue.trim())) {
        onOutletsChange([...outlets, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === ',' && inputValue.trim()) {
      // Also allow comma to add an outlet (common in tag inputs)
      e.preventDefault();
      if (!outlets.includes(inputValue.trim())) {
        onOutletsChange([...outlets, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap gap-2 mb-2'>
        {outlets.map((outlet) => (
          <Badge
            key={outlet}
            variant='secondary'
            className='text-sm py-1 px-2 flex items-center'
          >
            <span>{outlet}</span>
            <button
              type='button'
              className='ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted'
              onClick={(e) => handleRemove(outlet, e)}
              aria-label={`Remove ${outlet}`}
            >
              <X className='h-3 w-3' />
            </button>
          </Badge>
        ))}
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
                        <p>No outlets found.</p>
                        {inputValue.trim() && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='mt-2'
                            onClick={() => {
                              if (inputValue.trim() && !outlets.includes(inputValue.trim())) {
                                onOutletsChange([...outlets, inputValue.trim()]);
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
                      {suggestions.map((outlet) => (
                        <CommandItem
                          key={outlet.id}
                          value={outlet.label}
                          onSelect={() => handleSelect(outlet)}
                          className='flex items-center'
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              outlets.includes(outlet.label)
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <div className='flex flex-col'>
                            <span>{outlet.label}</span>
                            {outlet.description && (
                              <span className='text-sm text-muted-foreground'>
                                {outlet.description}
                              </span>
                            )}
                            {outlet.website && (
                              <span className='text-xs text-muted-foreground'>
                                {outlet.website}
                              </span>
                            )}
                          </div>
                          {outlet.count !== undefined && (
                            <span className='ml-auto text-xs text-muted-foreground'>
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

        {/* Add button for direct entry */}
        {inputValue.trim() && (
          <Button
            type='button'
            onClick={() => {
              if (inputValue.trim() && !outlets.includes(inputValue.trim())) {
                onOutletsChange([...outlets, inputValue.trim()]);
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