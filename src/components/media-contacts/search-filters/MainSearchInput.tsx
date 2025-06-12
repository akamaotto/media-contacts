"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon } from "lucide-react";

interface MainSearchInputProps {
  mainSearchTerm: string;
  setMainSearchTerm: (term: string) => void;
  onSearchSubmit?: () => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export const MainSearchInput: React.FC<MainSearchInputProps> = ({
  mainSearchTerm,
  setMainSearchTerm,
  onSearchSubmit,
  isLoading,
  setIsLoading,
}) => {
  return (
    <div className="flex-grow min-w-[200px] sm:min-w-[250px] md:min-w-[300px]">
      <div className="space-y-1">
        <Label htmlFor="mainSearch">Search</Label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="mainSearch"
            placeholder="Search media contacts..."
            value={mainSearchTerm}
            onChange={(e) => setMainSearchTerm(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSearchSubmit) {
                if (setIsLoading) setIsLoading(true);
                onSearchSubmit();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
