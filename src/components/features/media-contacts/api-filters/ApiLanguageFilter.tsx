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

interface ApiLanguageFilterProps {
  selectedLanguageCodes: string[];
  onLanguageFilterChange: (languageCodes: string[]) => void;
  languages: FilterItem[];
  languagesLoading: boolean;
  languageSearch: string;
  setLanguageSearch: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiLanguageFilter({
  selectedLanguageCodes,
  onLanguageFilterChange,
  languages,
  languagesLoading,
  languageSearch,
  setLanguageSearch,
  isOpen,
  onOpenChange
}: ApiLanguageFilterProps) {
  const [localLanguages, setLocalLanguages] = useState<FilterItem[]>(languages);
  const [localLoading, setLocalLoading] = useState(languagesLoading);

  // Update local state when props change
  useEffect(() => {
    setLocalLanguages(languages);
  }, [languages]);

  useEffect(() => {
    setLocalLoading(languagesLoading);
  }, [languagesLoading]);

  // Search languages with debounce
  useEffect(() => {
    if (!isOpen) return;

    const fetchLanguages = async () => {
      if (!languageSearch || languageSearch.trim() === '') {
        // Fetch popular languages
        try {
          setLocalLoading(true);
          const res = await fetch("/api/filters/languages?limit=10");
          if (res.ok) {
            const data = await res.json();
            setLocalLanguages(data.items || []);
          }
        } catch (error) {
          console.error("Failed to fetch popular languages:", error);
          setLocalLanguages([]);
        } finally {
          setLocalLoading(false);
        }
        return;
      }

      setLocalLoading(true);
      try {
        const res = await fetch(`/api/filters/languages?s=${encodeURIComponent(languageSearch.trim())}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setLocalLanguages(data.items || []);
        } else {
          console.error("Failed to search languages:", res.status, res.statusText);
          setLocalLanguages([]);
        }
      } catch (error) {
        console.error("Failed to search languages:", error);
        setLocalLanguages([]);
      } finally {
        setLocalLoading(false);
      }
    };

    const timer = setTimeout(fetchLanguages, 300);
    return () => clearTimeout(timer);
  }, [languageSearch, isOpen]);

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
            {selectedLanguageCodes.length > 0
              ? `${selectedLanguageCodes.length} languages selected`
              : "Select languages..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover text-popover-foreground border border-border shadow-md z-50">
          <Command>
            <CommandInput 
              placeholder="Search languages..." 
              value={languageSearch}
              onValueChange={setLanguageSearch}
            />
            <CommandList>
              {localLoading ? (
                <div className="py-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-1">Loading...</p>
                </div>
              ) : (
                <>
                  <CommandEmpty>No languages found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {localLanguages.map((language) => (
                      <CommandItem
                        key={language.id}
                        onSelect={() => {
                          const isSelected = selectedLanguageCodes.includes(language.code || '');
                          if (isSelected) {
                            onLanguageFilterChange(selectedLanguageCodes.filter(code => code !== (language.code || '')));
                          } else {
                            onLanguageFilterChange([...selectedLanguageCodes, language.code || '']);
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedLanguageCodes.includes(language.code || '') ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{language.label}</span>
                          {language.count !== undefined && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {language.count}
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