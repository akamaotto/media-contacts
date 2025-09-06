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

interface Beat {
  id: string;
  label: string;
  description?: string;
  count?: number;
}

interface BeatAutocompleteProps {
  beats: string[];
  onBeatsChange: (beats: string[]) => void;
  placeholder?: string;
  error?: string;
}

export function BeatAutocomplete({
  beats,
  onBeatsChange,
  placeholder = 'Add beat...',
  error,
}: BeatAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Beat[]>([]);
  const [popularBeats, setPopularBeats] = useState<Beat[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch popular beats on mount
  useEffect(() => {
    const fetchPopularBeats = async () => {
      try {
        const response = await fetch('/api/filters/beats?limit=5');
        if (response.ok) {
          const data = await response.json();
          setPopularBeats(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch popular beats:', error);
      }
    };

    fetchPopularBeats();
  }, []);

  // Search beats when input value changes (with debounce)
  useEffect(() => {
    const fetchBeats = async () => {
      if (!inputValue) {
        // Show popular beats
        setSuggestions(popularBeats);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/filters/beats?s=${encodeURIComponent(inputValue)}&limit=20`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSuggestions(data.items || []);
      } catch (error) {
        console.error('BeatAutocomplete: Error searching beats:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce input value
    const timer = setTimeout(() => {
      fetchBeats();
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, popularBeats]);

  const handleSelect = (beat: Beat) => {
    // Check if beat already exists in the list
    if (!beats.includes(beat.label)) {
      onBeatsChange([...beats, beat.label]);
    }
    setInputValue('');
    setOpen(false);
  };

  const handleRemove = (beatLabel: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Also prevent default behavior

    // Create a new array without the removed beat
    const updatedBeats = beats.filter((b) => b !== beatLabel);

    // Update the beats state
    onBeatsChange(updatedBeats);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !loading) {
      e.preventDefault();
      // Add custom beat if not in suggestions
      if (!beats.includes(inputValue.trim())) {
        onBeatsChange([...beats, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === ',' && inputValue.trim()) {
      // Also allow comma to add a beat (common in tag inputs)
      e.preventDefault();
      if (!beats.includes(inputValue.trim())) {
        onBeatsChange([...beats, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap gap-2 mb-2'>
        {beats.map((beat) => (
          <Badge
            key={beat}
            variant='secondary'
            className='text-sm py-1 px-2 flex items-center'
          >
            <span>{beat}</span>
            <button
              type='button'
              className='ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted'
              onClick={(e) => handleRemove(beat, e)}
              aria-label={`Remove ${beat}`}
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
                        <p>No beats found.</p>
                        {inputValue.trim() && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='mt-2'
                            onClick={() => {
                              if (inputValue.trim() && !beats.includes(inputValue.trim())) {
                                onBeatsChange([...beats, inputValue.trim()]);
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
                      {suggestions.map((beat) => (
                        <CommandItem
                          key={beat.id}
                          value={beat.label}
                          onSelect={() => handleSelect(beat)}
                          className='flex items-center'
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              beats.includes(beat.label)
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <div className='flex flex-col'>
                            <span>{beat.label}</span>
                            {beat.description && (
                              <span className='text-sm text-muted-foreground'>
                                {beat.description}
                              </span>
                            )}
                          </div>
                          {beat.count !== undefined && (
                            <span className='ml-auto text-xs text-muted-foreground'>
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

        {/* Add button for direct entry */}
        {inputValue.trim() && (
          <Button
            type='button'
            onClick={() => {
              if (inputValue.trim() && !beats.includes(inputValue.trim())) {
                onBeatsChange([...beats, inputValue.trim()]);
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