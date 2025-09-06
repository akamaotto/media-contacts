"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ApiFiltersSearchInputProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function ApiFiltersSearchInput({ searchTerm, onSearchChange }: ApiFiltersSearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subtle h-4 w-4" />
      <Input
        placeholder="Search media contacts..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 placeholder:text-subtle text-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
    </div>
  );
}