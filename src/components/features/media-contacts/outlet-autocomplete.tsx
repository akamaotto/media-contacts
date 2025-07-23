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
import { searchOutlets } from "@/lib/actions/media-contacts";

export type Outlet = {
  id: string;
  name: string;
};

interface OutletAutocompleteProps {
  outlets: string[];
  onOutletsChange: (outlets: string[]) => void;
  placeholder?: string;
  error?: string;
}

export function OutletAutocomplete({
  outlets,
  onOutletsChange,
  placeholder = "Add outlet...",
  error,
}: OutletAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Outlet[]>([]);
  const [debouncedValue, setDebouncedValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Search outlets when debounced value changes
  useEffect(() => {
    const fetchOutlets = async () => {
      if (debouncedValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchOutlets(debouncedValue);
        setSuggestions(results);
      } catch (error) {
        console.error("Error searching outlets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOutlets();
  }, [debouncedValue]);

  const handleSelect = (outletName: string) => {
    // Check if outlet already exists in the list
    if (!outlets.includes(outletName)) {
      onOutletsChange([...outlets, outletName]);
    }
    setInputValue("");
    setOpen(false);
  };

  const handleRemove = (outletName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Also prevent default behavior
    
    // Create a new array without the removed outlet
    const updatedOutlets = outlets.filter((o) => o !== outletName);
    
    // Update the outlets state
    onOutletsChange(updatedOutlets);
    
    // Log for debugging
    console.log('Removing outlet:', outletName, 'Updated outlets:', updatedOutlets);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !loading) {
      e.preventDefault();
      handleSelect(inputValue.trim());
    } else if (e.key === "," && inputValue.trim()) {
      // Also allow comma to add an outlet (common in tag inputs)
      e.preventDefault();
      handleSelect(inputValue.trim());
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {outlets.map((outlet) => (
          <Badge key={outlet} variant="secondary" className="text-sm py-1 px-2 flex items-center">
            <span>{outlet}</span>
            <button 
              type="button"
              className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-muted"
              onClick={(e) => handleRemove(outlet, e)}
              aria-label={`Remove ${outlet}`}
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
                      <p>No outlets found.</p>
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
                        Add "{inputValue || 'outlet'}"
                      </Button>
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {suggestions.map((outlet) => (
                    <CommandItem
                      key={outlet.id}
                      value={outlet.name}
                      onSelect={() => handleSelect(outlet.name)}
                      className="flex items-center"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          outlets.includes(outlet.name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{outlet.name}</span>
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
