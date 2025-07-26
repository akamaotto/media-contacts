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
import { ChevronsUpDownIcon, CheckIcon, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/lib/language-data";

interface LanguageFilterPopoverProps {
  allLanguages: Language[];
  selectedLanguageCodes: string[];
  setSelectedLanguageCodes: React.Dispatch<React.SetStateAction<string[]>>;
  isLanguageDropdownOpen: boolean;
  setIsLanguageDropdownOpen: (open: boolean) => void;
  searchFilterLanguageTerm: string;
  setSearchFilterLanguageTerm: (term: string) => void;
  languageOptions: Language[];
}

export const LanguageFilterPopover: React.FC<LanguageFilterPopoverProps> = ({
  allLanguages,
  selectedLanguageCodes,
  setSelectedLanguageCodes,
  isLanguageDropdownOpen,
  setIsLanguageDropdownOpen,
  searchFilterLanguageTerm,
  setSearchFilterLanguageTerm,
  languageOptions,
}) => (
  <div className="min-w-[180px]">
    <Label
      htmlFor="languageFilterButton"
      className="text-sm font-medium flex items-center"
    >
      <Languages className="h-4 w-4 mr-1 text-muted-foreground" />
      Languages
    </Label>
    <Popover
      open={isLanguageDropdownOpen}
      onOpenChange={setIsLanguageDropdownOpen}
    >
      <PopoverTrigger asChild>
        <Button
          id="languageFilterButton"
          variant="outline"
          role="combobox"
          className="w-full justify-between mt-1"
        >
          <span className="truncate">
            {selectedLanguageCodes.length === 0
              ? "Select languages..."
              : selectedLanguageCodes.length === 1 &&
                allLanguages.find((l) => l.code === selectedLanguageCodes[0])
              ? allLanguages.find((l) => l.code === selectedLanguageCodes[0])!.name
              : `${selectedLanguageCodes.length} selected`}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Search languages..."
            value={searchFilterLanguageTerm}
            onValueChange={setSearchFilterLanguageTerm}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No languages found.</CommandEmpty>
            <CommandGroup>
              {languageOptions.map((language) => {
                const code = language.code;
                const name = language.name;
                return (
                  <CommandItem
                    key={code}
                    value={name}
                    onSelect={() => {
                      setSelectedLanguageCodes((prev) =>
                        prev.includes(code)
                          ? prev.filter((prevCode) => prevCode !== code)
                          : [...prev, code]
                      );
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLanguageCodes.includes(code)
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
