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
import { Beat } from "@/backend/media-contacts-filters/beat-actions";

interface BeatFilterPopoverProps {
  allBeats: Beat[];
  selectedBeatIds: string[];
  setSelectedBeatIds: React.Dispatch<React.SetStateAction<string[]>>;
  isBeatDropdownOpen: boolean;
  setIsBeatDropdownOpen: (open: boolean) => void;
  searchFilterBeatTerm: string;
  setSearchFilterBeatTerm: (term: string) => void;
  beatOptions: Beat[];
}

export const BeatFilterPopover: React.FC<BeatFilterPopoverProps> = ({
  allBeats,
  selectedBeatIds,
  setSelectedBeatIds,
  isBeatDropdownOpen,
  setIsBeatDropdownOpen,
  searchFilterBeatTerm,
  setSearchFilterBeatTerm,
  beatOptions,
}) => (
  <div className="min-w-[180px]">
    <Label htmlFor="beatFilterButton" className="text-sm font-medium">
      Beats
    </Label>
    <Popover open={isBeatDropdownOpen} onOpenChange={setIsBeatDropdownOpen}>
      <PopoverTrigger asChild>
        <Button
          id="beatFilterButton"
          variant="outline"
          role="combobox"
          className="w-full justify-between mt-1"
        >
          <span className="truncate">
            {selectedBeatIds.length === 0
              ? "Select beats..."
              : selectedBeatIds.length === 1 &&
                allBeats.find((b) => b.id === selectedBeatIds[0])
              ? allBeats.find((b) => b.id === selectedBeatIds[0])!.name
              : `${selectedBeatIds.length} selected`}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Search beats..."
            value={searchFilterBeatTerm}
            onValueChange={setSearchFilterBeatTerm}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No beats found.</CommandEmpty>
            <CommandGroup>
              {beatOptions
                .filter((beat: any) => {
                  const label = beat?.name || beat?.label || "";
                  const searchTerm = searchFilterBeatTerm || "";
                  return (
                    searchTerm === "" ||
                    label.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                })
                .map((beat: any) => {
                  const id = beat?.id || beat?.value || "";
                  const name = beat?.name || beat?.label || "";
                  return (
                    <CommandItem
                      key={id}
                      value={name}
                      onSelect={() => {
                        setSelectedBeatIds((prev) =>
                          prev.includes(id)
                            ? prev.filter((prevId) => prevId !== id)
                            : [...prev, id]
                        );
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedBeatIds.includes(id) ? "opacity-100" : "opacity-0"
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
