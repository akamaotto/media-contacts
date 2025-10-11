"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CountrySelectorProps, Country } from "./types";

export function CountrySelector({
  value,
  onChange,
  maxSelection = 10,
  disabled = false,
  error
}: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/filters/countries?limit=300");
        if (!res.ok) throw new Error("Failed to fetch countries");
        const payload = await res.json();
        if (!ignore) {
          const items: Country[] = (payload.items || []).sort((a: Country, b: Country) =>
            (a.name || "").localeCompare(b.name || "")
          );
          setCountries(items);
          setFetchError(null);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) setFetchError("Could not load countries. Please try again later.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const getOptionValue = useCallback((country: Country) => {
    return country.id || country.code || country.name || "";
  }, []);

  const getOptionLabel = useCallback((country: Country) => {
    const name = country.name || (country as any).displayName;
    const code = country.code;
    if (name && code) {
      return `${name} (${code})`;
    }
    return name || code || country.id || "Unknown";
  }, []);

  const optionMap = useMemo(() => {
    const map = new Map<string, Country>();
    countries.forEach((country) => {
      const key = getOptionValue(country);
      if (key) {
        map.set(key, country);
      }
    });
    return map;
  }, [countries, getOptionValue]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter((country) => {
      const label = getOptionLabel(country);
      const target = `${label} ${country.code ?? ""} ${country.region ?? ""}`.toLowerCase();
      return target.includes(query);
    });
  }, [countries, searchTerm, getOptionLabel]);

  const selectedCountries = useMemo(() => {
    return value.map((key) => {
      const country = optionMap.get(key);
      const label = country ? getOptionLabel(country) : key;
      return {
        key,
        label,
        id: country?.id ?? key
      };
    });
  }, [value, optionMap, getOptionLabel]);

  const reachedLimit = value.length >= maxSelection;

  const toggleCountry = useCallback(
    (optionKey?: string) => {
      if (!optionKey) return;

      if (value.includes(optionKey)) {
        onChange(value.filter((item) => item !== optionKey));
        return;
      }

      if (reachedLimit) return;
      onChange([...value, optionKey]);
    },
    [onChange, reachedLimit, value]
  );

  const displayLabel = useMemo(() => {
    if (!value.length) return "Select countries";

    const labels = value
      .map((key) => {
        const country = optionMap.get(key);
        return country ? getOptionLabel(country) : key;
      })
      .filter(Boolean);

    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels.join(", ");
    return `${labels[0]} + ${labels.length - 1} more`;
  }, [value, optionMap, getOptionLabel]);

  const clearAll = useCallback(() => onChange([]), [onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Selected countries{value.length > 0 ? ` (${value.length}/${maxSelection})` : ""}
        </p>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={disabled}
            className="h-7 px-2 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {selectedCountries.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-background/80 px-3 py-2">
          {selectedCountries.map(({ id, key, label }) => (
            <Badge
              key={id}
              variant="secondary"
              className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary"
            >
              <span>{label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleCountry(key)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between rounded-xl border-border/60 bg-background/80 text-sm"
            disabled={disabled}
            data-testid="country-selector-trigger"
          >
            <span className="truncate text-left">{displayLabel}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(360px,calc(100vw-3rem))] p-3" align="start" sideOffset={6}>
          <div className="space-y-3">
            <Input
              placeholder="Search countries"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              autoFocus
            />
            <ScrollArea className="max-h-64">
              <div className="space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : filtered.length ? (
                  filtered.map((country) => {
                    const optionKey = getOptionValue(country);
                    const label = getOptionLabel(country);
                    const isSelected = value.includes(optionKey);
                    return (
                      <button
                        key={country.id ?? optionKey}
                        type="button"
                        onClick={() => {
                          toggleCountry(optionKey);
                          setSearchTerm("");
                        }}
                        className={cn(
                          "w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors",
                          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                        disabled={(!isSelected && reachedLimit) || disabled}
                      >
                        <div className="flex items-center justify-between">
                          <span>{label}</span>
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                        {country.region && (
                          <p className="text-xs text-muted-foreground">{country.region}</p>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">No matches</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      <p className="text-xs text-muted-foreground">
        Choose up to {maxSelection} countries.
      </p>

      {(error || fetchError) && (
        <p className="text-sm text-destructive" role="alert">
          {error || fetchError}
        </p>
      )}
    </div>
  );
}
