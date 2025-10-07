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

interface Language {
  id: string;
  label: string;
  code?: string;
  count?: number;
}

interface LanguageAutocompleteProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  onLanguagesMapChange?: (languagesMap: Map<string, Language>) => void;
  placeholder?: string;
  error?: string;
}

export function LanguageAutocomplete({
  selectedLanguages,
  onLanguagesChange,
  onLanguagesMapChange,
  placeholder = 'Search languages...',
  error,
}: LanguageAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Language[]>([]);
  const [popularLanguages, setPopularLanguages] = useState<Language[]>([]);
  const [selectedLanguagesMap, setSelectedLanguagesMap] = useState<Map<string, Language>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // Enhanced error handler for API calls
  const errorHandler = useRef(new ClientErrorHandler({
    enableToasts: false, // Don't show toasts for autocomplete
    enableConsoleLogging: false
  })).current;

  // Fetch popular languages on mount
  useEffect(() => {
    const fetchPopularLanguages = async () => {
      try {
        const response = await fetch('/api/filters/languages?limit=5');
        if (response.ok) {
          const data = await response.json();
          setPopularLanguages(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch popular languages:', error);
      }
    };

    fetchPopularLanguages();
  }, []);

  // Search languages when input value changes (with debounce)
  useEffect(() => {
    const fetchLanguages = async () => {
      if (!inputValue) {
        // Show popular languages
        setSuggestions(popularLanguages);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/filters/languages?s=${encodeURIComponent(inputValue)}&limit=20`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSuggestions(data.items || []);
      } catch (error) {
        console.error('LanguageAutocomplete: Error searching languages:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce input value
    const timer = setTimeout(() => {
      fetchLanguages();
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, popularLanguages]);

  const handleSelect = (language: Language) => {
    // Check if language already exists in the list
    if (!selectedLanguages.includes(language.id)) {
      onLanguagesChange([...selectedLanguages, language.id]);
      // Update the map with the selected language
      const newMap = new Map(selectedLanguagesMap);
      newMap.set(language.id, language);
      setSelectedLanguagesMap(newMap);
      onLanguagesMapChange?.(newMap);
    }
    setInputValue('');
    setOpen(false);
  };

  const handleRemove = (languageId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Also prevent default behavior

    // Create a new array without the removed language
    const updatedLanguages = selectedLanguages.filter((l) => l !== languageId);

    // Update the languages state
    onLanguagesChange(updatedLanguages);

    // Remove from the map
    const newMap = new Map(selectedLanguagesMap);
    newMap.delete(languageId);
    setSelectedLanguagesMap(newMap);
    onLanguagesMapChange?.(newMap);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !loading) {
      e.preventDefault();
      // Add custom language if not in suggestions
      if (!selectedLanguages.includes(inputValue.trim())) {
        onLanguagesChange([...selectedLanguages, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === ',' && inputValue.trim()) {
      // Also allow comma to add a language (common in tag inputs)
      e.preventDefault();
      if (!selectedLanguages.includes(inputValue.trim())) {
        onLanguagesChange([...selectedLanguages, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap gap-2 mb-2'>
        {selectedLanguages.map((languageId) => {
          const language = selectedLanguagesMap.get(languageId);
          return language ? (
            <Badge
              key={languageId}
              variant='secondary'
              className='text-sm py-1 px-2 flex items-center'
            >
              <span>{language.label}</span>
              <button
                type='button'
                className='ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted'
                onClick={(e) => handleRemove(languageId, e)}
                aria-label={`Remove ${language.label}`}
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
                        <p>No languages found.</p>
                        {inputValue.trim() && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='mt-2'
                            onClick={() => {
                              if (inputValue.trim() && !selectedLanguages.includes(inputValue.trim())) {
                                onLanguagesChange([...selectedLanguages, inputValue.trim()]);
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
                      {suggestions.map((language) => (
                        <CommandItem
                          key={language.id}
                          value={language.label}
                          onSelect={() => handleSelect(language)}
                          className='flex items-center hover:bg-gray-100 dark:hover:bg-accent cursor-pointer rounded-sm transition-colors'
                        >
                          <div className='mr-2 h-4 w-4 border-2 border-gray-400 dark:border-border rounded flex items-center justify-center bg-white dark:bg-background hover:border-gray-600 dark:hover:border-primary transition-colors'>
                            {selectedLanguages.includes(language.id) && (
                              <Check className='h-3 w-3 text-blue-600 dark:text-primary' />
                            )}
                          </div>
                          <div className='flex items-center'>
                            <span>{language.label}</span>
                          </div>
                          {language.code && (
                            <Badge variant="outline" className="ml-2 text-xs font-mono">
                              {language.code.toUpperCase()}
                            </Badge>
                          )}
                          {language.count !== undefined && (
                            <span className='ml-auto text-xs text-muted-foreground'>
                              {language.count}
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
              if (inputValue.trim() && !selectedLanguages.includes(inputValue.trim())) {
                onLanguagesChange([...selectedLanguages, inputValue.trim()]);
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