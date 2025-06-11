"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailVerificationFilterProps {
  emailVerifiedFilter: "all" | "verified" | "unverified";
  setEmailVerifiedFilter: (value: "all" | "verified" | "unverified") => void;
  isEmailVerifiedDropdownOpen: boolean;
  setIsEmailVerifiedDropdownOpen: (open: boolean) => void;
}

export const EmailVerificationFilter: React.FC<EmailVerificationFilterProps> = ({
  emailVerifiedFilter,
  setEmailVerifiedFilter,
  isEmailVerifiedDropdownOpen,
  setIsEmailVerifiedDropdownOpen,
}) => (
  <div className="flex flex-col space-y-1.5 pt-1 min-w-[180px]">
    <Label className="text-sm font-medium">Email Verification</Label>
    <Popover
      open={isEmailVerifiedDropdownOpen}
      onOpenChange={setIsEmailVerifiedDropdownOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isEmailVerifiedDropdownOpen}
          className="w-full justify-between"
        >
          <span className="truncate">
            {emailVerifiedFilter === "all" && "All Contacts"}
            {emailVerifiedFilter === "verified" && "Verified Emails"}
            {emailVerifiedFilter === "unverified" && "Unverified Emails"}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                key="all"
                value="All Contacts"
                onSelect={() => {
                  setEmailVerifiedFilter("all");
                  setIsEmailVerifiedDropdownOpen(false);
                }}
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4",
                    emailVerifiedFilter === "all" ? "opacity-100" : "opacity-0"
                  )}
                />
                All Contacts
              </CommandItem>
              <CommandItem
                key="verified"
                value="Verified Emails"
                onSelect={() => {
                  setEmailVerifiedFilter("verified");
                  setIsEmailVerifiedDropdownOpen(false);
                }}
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4",
                    emailVerifiedFilter === "verified" ? "opacity-100" : "opacity-0"
                  )}
                />
                Verified Emails
              </CommandItem>
              <CommandItem
                key="unverified"
                value="Unverified Emails"
                onSelect={() => {
                  setEmailVerifiedFilter("unverified");
                  setIsEmailVerifiedDropdownOpen(false);
                }}
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4",
                    emailVerifiedFilter === "unverified" ? "opacity-100" : "opacity-0"
                  )}
                />
                Unverified Emails
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
);
