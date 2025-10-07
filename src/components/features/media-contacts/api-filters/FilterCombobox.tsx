"use client";

import * as React from "react";
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
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FilterItem } from "./types";

type ValueKey = "id" | "code";

interface FilterComboboxProps {
  triggerLabel: string;
  selectionLabel: string;
  fetchEndpoint: string;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  options: FilterItem[];
  onItemsResolved?: (items: FilterItem[]) => void;
  valueKey?: ValueKey;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyStateText?: string;
  showCount?: boolean;
  showDescription?: boolean;
}

const DEFAULT_LIMIT = 10;
const SEARCH_LIMIT = 20;

export function FilterCombobox({
  triggerLabel,
  selectionLabel,
  fetchEndpoint,
  selectedValues,
  onSelectionChange,
  options,
  onItemsResolved,
  valueKey = "id",
  placeholder,
  searchPlaceholder,
  emptyStateText,
  showCount = true,
  showDescription = false,
}: FilterComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [items, setItems] = React.useState<FilterItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const getOptionValue = React.useCallback(
    (item: FilterItem | undefined | null) => {
      if (!item) return "";
      if (valueKey === "code" && item.code) {
        return item.code;
      }

      return item.id;
    },
    [valueKey],
  );

  const optionLookup = React.useMemo(() => {
    const map = new Map<string, FilterItem>();
    for (const option of options) {
      const value = getOptionValue(option);
      if (value) {
        map.set(value, option);
      }
    }
    return map;
  }, [options, getOptionValue]);

  const summaryLabel = React.useMemo(() => {
    if (selectedValues.length === 0) {
      return placeholder ?? `Select ${selectionLabel}...`;
    }

    if (selectedValues.length === 1) {
      const option = optionLookup.get(selectedValues[0]);
      return option?.label ?? `1 ${selectionLabel} selected`;
    }

    return `${selectedValues.length} ${selectionLabel} selected`;
  }, [selectedValues, optionLookup, selectionLabel, placeholder]);

  const itemsToRender = React.useMemo(() => {
    const map = new Map<string, FilterItem>();

    for (const item of items) {
      const value = getOptionValue(item);
      if (value) {
        map.set(value, item);
      }
    }

    for (const value of selectedValues) {
      if (map.has(value)) continue;
      const option = optionLookup.get(value);
      if (option) {
        map.set(value, option);
      } else if (value) {
        map.set(value, { id: value, label: value });
      }
    }

    return Array.from(map.values());
  }, [items, selectedValues, optionLookup, getOptionValue]);

  const loadItems = React.useCallback(
    async (query: string) => {
      if (!fetchEndpoint) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const trimmed = query.trim();

      if (trimmed.length > 0) {
        params.set("s", trimmed);
        params.set("limit", String(SEARCH_LIMIT));
      } else {
        params.set("limit", String(DEFAULT_LIMIT));
      }

      try {
        const response = await fetch(
          `${fetchEndpoint}?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const result = await response.json();
        const fetchedItems = Array.isArray(result?.items)
          ? (result.items as FilterItem[])
          : [];

        setItems(fetchedItems);
        onItemsResolved?.(fetchedItems);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        console.error("[FilterCombobox] Failed to load items:", err);
        setError("Unable to load options. Please try again.");
        setItems([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [fetchEndpoint, onItemsResolved],
  );

  React.useEffect(() => {
    if (!open) return;
    loadItems(debouncedSearch);

    return () => {
      abortRef.current?.abort();
    };
  }, [open, debouncedSearch, loadItems]);

  const toggleValue = React.useCallback(
    (value: string) => {
      if (!value) return;

      onSelectionChange(
        selectedValues.includes(value)
          ? selectedValues.filter((existing) => existing !== value)
          : [...selectedValues, value],
      );
    },
    [selectedValues, onSelectionChange],
  );

  const clearSelection = React.useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const emptyMessage =
    emptyStateText ??
    (debouncedSearch
      ? "No matches found."
      : `No ${selectionLabel} available.`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Filter by ${triggerLabel.toLowerCase()}`}
          className="min-w-0 flex-shrink-0 justify-between text-left whitespace-nowrap"
        >
          <span
            className={cn(
              "truncate",
              selectedValues.length === 0 && "text-subtle",
            )}
          >
            {summaryLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 border border-border/80 bg-popover/95 text-default shadow-xl supports-[backdrop-filter]:backdrop-blur-md dark:bg-popover/90">
        <Command>
          <div className="flex items-center gap-2 border-b border-border/60 bg-popover px-3 py-2">
            <CommandInput
              placeholder={
                searchPlaceholder ?? `Search ${selectionLabel}...`
              }
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="placeholder:text-subtle text-default"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm("")}
                className="h-6 w-6 text-muted hover:text-default"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <CommandList className="max-h-64 overflow-auto">
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                <p className="mt-2">Loading {selectionLabel}…</p>
              </div>
            )}
            {!isLoading && error && (
              <div className="px-3 py-4 text-sm text-destructive">
                {error}
              </div>
            )}
            {!isLoading && !error && (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup className="p-1">
                  {itemsToRender.map((item) => {
                    const value = getOptionValue(item);
                    const isSelected =
                      value !== "" && selectedValues.includes(value);

                    return (
                      <CommandItem
                        key={value || item.label}
                        value={item.label}
                        onSelect={() => {
                          toggleValue(value);
                          requestAnimationFrame(() => setOpen(true));
                        }}
                        className="flex items-start gap-2 rounded-md px-2 py-2"
                      >
                        <div className="flex h-5 w-5 items-center justify-center">
                          <Check
                            className={cn(
                              "h-4 w-4 transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{item.label}</span>
                          {showDescription && item.description && (
                            <span className="truncate text-xs text-muted">
                              {item.description}
                            </span>
                          )}
                        </div>
                        {showCount && typeof item.count === "number" && (
                          <Badge variant="outline" className="ml-2 shrink-0">
                            {item.count}
                          </Badge>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
          {selectedValues.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/60 bg-popover px-3 py-2">
              <span className="text-xs text-muted">
                {selectedValues.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-7 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
