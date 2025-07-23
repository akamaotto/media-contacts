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
import { ChevronsUpDownIcon, CheckIcon, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Region } from "@/lib/country-data";

interface RegionFilterPopoverProps {
  allRegions: Region[];
  selectedRegionCodes: string[];
  setSelectedRegionCodes: React.Dispatch<React.SetStateAction<string[]>>;
  isRegionDropdownOpen: boolean;
  setIsRegionDropdownOpen: (open: boolean) => void;
  searchFilterRegionTerm: string;
  setSearchFilterRegionTerm: (term: string) => void;
  regionOptions: Region[];
}

export const RegionFilterPopover: React.FC<RegionFilterPopoverProps> = ({
  allRegions,
  selectedRegionCodes,
  setSelectedRegionCodes,
  isRegionDropdownOpen,
  setIsRegionDropdownOpen,
  searchFilterRegionTerm,
  setSearchFilterRegionTerm,
  regionOptions,
}) => {
  return (
    <div className="min-w-[180px]">
      <Label
        htmlFor="regionFilterButton"
        className="text-sm font-medium flex items-center"
      >
        <Globe className="h-4 w-4 mr-1 text-muted-foreground" />
        Regions
      </Label>
      <Popover
        open={isRegionDropdownOpen}
        onOpenChange={setIsRegionDropdownOpen}
      >
        <PopoverTrigger asChild>
          <Button
            id="regionFilterButton"
            variant="outline"
            role="combobox"
            className="w-full justify-between mt-1"
          >
            <span className="truncate">
              {selectedRegionCodes.length === 0
                ? "Select regions..."
                : selectedRegionCodes.length === 1 &&
                  allRegions.find((r) => r.code === selectedRegionCodes[0])
                ? allRegions.find((r) => r.code === selectedRegionCodes[0])!.name
                : `${selectedRegionCodes.length} selected`}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput
              placeholder="Search regions..."
              value={searchFilterRegionTerm}
              onValueChange={setSearchFilterRegionTerm}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>No regions found.</CommandEmpty>
              <CommandGroup>
                {regionOptions
                  .filter((region) => {
                    const label = region?.name || "";
                    const searchTerm = searchFilterRegionTerm || "";
                    return (
                      searchTerm === "" ||
                      label.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  })
                  .map((region) => (
                    <CommandItem
                      key={region.code}
                      value={region.name}
                      onSelect={() => {
                        setSelectedRegionCodes((prev) =>
                          prev.includes(region.code)
                            ? prev.filter((code) => code !== region.code)
                            : [...prev, region.code]
                        );
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedRegionCodes.includes(region.code)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {region.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
