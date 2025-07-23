"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Country } from "@/app/actions/country-actions";

interface CountryFilterPopoverProps {
  allCountries: Country[];
  selectedCountryIds: string[];
  setSelectedCountryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isCountryDropdownOpen: boolean;
  setIsCountryDropdownOpen: (open: boolean) => void;
  searchFilterCountryTerm: string;
  setSearchFilterCountryTerm: (term: string) => void;
  countryOptions: Country[];
}

export const CountryFilterPopover: React.FC<CountryFilterPopoverProps> = ({
  allCountries,
  selectedCountryIds,
  setSelectedCountryIds,
  isCountryDropdownOpen,
  setIsCountryDropdownOpen,
  searchFilterCountryTerm,
  setSearchFilterCountryTerm,
  countryOptions,
}) => {
  return (
    <div className="min-w-[180px]">
      <Label htmlFor="countryFilterButton" className="text-sm font-medium">
        Countries
      </Label>
      <Popover
        open={isCountryDropdownOpen}
        onOpenChange={setIsCountryDropdownOpen}
      >
        <PopoverTrigger asChild>
          <Button
            id="countryFilterButton"
            variant="outline"
            role="combobox"
            className="w-full justify-between mt-1"
          >
            <span className="truncate">
              {selectedCountryIds.length === 0
                ? "Select countries..."
                : selectedCountryIds.length === 1 &&
                  allCountries.find((c) => c.id === selectedCountryIds[0])
                ? allCountries.find((c) => c.id === selectedCountryIds[0])!.name
                : `${selectedCountryIds.length} selected`}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput
              placeholder="Search countries..."
              value={searchFilterCountryTerm}
              onValueChange={setSearchFilterCountryTerm}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>No countries found.</CommandEmpty>
              <CommandGroup>
                {countryOptions
                  .filter((country: any) => {
                    const label = country?.name || country?.label || "";
                    const searchTerm = searchFilterCountryTerm || "";
                    return (
                      searchTerm === "" ||
                      label.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  })
                  .map((country: any) => {
                    const id = country?.id || country?.value || "";
                    const name = country?.name || country?.label || "";
                    return (
                      <CommandItem
                        key={id}
                        value={name}
                        onSelect={() => {
                          setSelectedCountryIds((prev) =>
                            prev.includes(id)
                              ? prev.filter((prevId) => prevId !== id)
                              : [...prev, id]
                          );
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCountryIds.includes(id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {name}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
