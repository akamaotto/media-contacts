"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { searchBeats } from "@/app/actions/beat-actions";

export type Beat = {
  id: string;
  name: string;
  description?: string | null;
};

interface BeatAutocompleteProps {
  beats: string[];
  onBeatsChange: (beats: string[]) => void;
  placeholder?: string;
  error?: string;
}

export function BeatAutocomplete({
  beats,
  onBeatsChange,
  placeholder = "Add beat...",
  error,
}: BeatAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Beat[]>([]);
  const [debouncedValue, setDebouncedValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Search beats when debounced value changes
  useEffect(() => {
    const fetchBeats = async () => {
      if (debouncedValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchBeats(debouncedValue);
        setSuggestions(results);
      } catch (error) {
        console.error("Error searching beats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBeats();
  }, [debouncedValue]);

  const handleSelect = (beatName: string) => {
    // Check if beat already exists in the list
    if (!beats.includes(beatName)) {
      onBeatsChange([...beats, beatName]);
    }
    setInputValue("");
    setOpen(false);
  };

  const handleRemove = (beatName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Also prevent default behavior
    
    // Create a new array without the removed beat
    const updatedBeats = beats.filter((b) => b !== beatName);
    
    // Update the beats state
    onBeatsChange(updatedBeats);
    
    // Log for debugging
    console.log('Removing beat:', beatName, 'Updated beats:', updatedBeats);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !loading) {
      e.preventDefault();
      handleSelect(inputValue.trim());
    } else if (e.key === "," && inputValue.trim()) {
      // Also allow comma to add a beat (common in tag inputs)
      e.preventDefault();
      handleSelect(inputValue.trim());
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {beats.map((beat) => (
          <Badge key={beat} variant="secondary" className="text-sm py-1 px-2 flex items-center">
            <span>{beat}</span>
            <button 
              type="button"
              className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted"
              onClick={(e) => handleRemove(beat, e)}
              aria-label={`Remove ${beat}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              onClick={() => inputRef.current?.focus()}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none outline-none"
                placeholder={placeholder}
              />
              {loading ? (
                <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder={placeholder}
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">Searching...</span>
                    </div>
                  ) : (
                    <div className="py-2 text-center">
                      <p>No beats found.</p>
                      <p className="text-sm text-muted-foreground">
                        Press enter to add "{inputValue}"
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2" 
                        onClick={() => handleSelect(inputValue.trim())}
                        disabled={!inputValue.trim()}
                      >
                        Add "{inputValue || 'beat'}"
                      </Button>
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {suggestions.map((beat) => (
                    <CommandItem
                      key={beat.id}
                      value={beat.name}
                      onSelect={() => handleSelect(beat.name)}
                      className="flex items-center"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          beats.includes(beat.name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{beat.name}</span>
                      {beat.description && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          {beat.description}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Add button for direct entry */}
        {inputValue.trim() && (
          <Button 
            type="button" 
            onClick={() => {
              if (inputValue.trim()) {
                handleSelect(inputValue.trim());
              }
            }}
          >
            Add
          </Button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
