"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertCircle, Globe, Edit, Trash2, Search, MoreHorizontal, ChevronLeft, ChevronRight, Eye, List, RotateCcw, X } from "lucide-react";
import { toast } from 'sonner';
import { EditCountrySheet } from './edit-country-sheet';
import { DeleteCountryDialog } from './delete-country-dialog';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Country } from './types';
import { RegionAutocomplete } from './region-autocomplete';
import { LanguageAutocomplete } from './language-autocomplete';

// Lightweight response item types for filters APIs
type RegionItem = { id: string; label: string; code?: string; category?: string };
type LanguageItem = { id: string; label: string; code?: string };

interface CountriesTableProps {
  onEdit?: (country: Country) => void;
  onDelete?: (country: Country) => void;
  onView?: (country: Country) => void;
}

export const CountriesTable = forwardRef<{ refresh: () => void }, CountriesTableProps>(({ onEdit, onDelete, onView }, ref) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedRegionsMap, setSelectedRegionsMap] = useState<Map<string, { label: string; code?: string; category?: string }>>(new Map());
  const [selectedLanguagesMap, setSelectedLanguagesMap] = useState<Map<string, { label: string; code?: string }>>(new Map());
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(true);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Server-side filtering - update API call when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1); // Reset to first page when searching
      }
      fetchCountries();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedRegions, selectedLanguages, currentPage, pageSize]);

  // Fetch region details when selected regions change
  useEffect(() => {
    fetchRegionDetails(selectedRegions);
  }, [selectedRegions]);

  // Fetch language details when selected languages change
  useEffect(() => {
    fetchLanguageDetails(selectedLanguages);
  }, [selectedLanguages]);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        _t: new Date().getTime().toString() // Cache busting
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      // Add region filters
      if (selectedRegions.length > 0) {
        params.append('regionIds', selectedRegions.join(','));
      }

      // Add language filters
      if (selectedLanguages.length > 0) {
        params.append('languageIds', selectedLanguages.join(','));
      }

      const response = await fetch(`/api/countries?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle paginated response structure
      if (result.data && Array.isArray(result.data)) {
        setCountries(result.data);
        setTotalCount(result.totalCount || 0);
      } else {
        // Fallback for non-paginated response
        const countriesArray = Array.isArray(result) ? result : [];
        setCountries(countriesArray);
        setTotalCount(countriesArray.length);
      }

    } catch (err) {
      console.error("Failed to fetch countries:", err);
      setError('Failed to load countries. Please try again.');
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  const handleEditSuccess = () => {
    fetchCountries();
  };

  const handleDeleteSuccess = () => {
    fetchCountries();
    setDeletingCountry(null);
  };

  // Fetch region details by IDs
  const fetchRegionDetails = async (regionIds: string[]) => {
    if (regionIds.length === 0) {
      setSelectedRegionsMap(new Map());
      return;
    }

    try {
      const params = new URLSearchParams({
        ids: regionIds.join(','),
        limit: regionIds.length.toString()
      });

      const response = await fetch(`/api/filters/regions?${params}`);
      if (response.ok) {
        const result: { items?: RegionItem[] } = await response.json();
        const regionsMap = new Map<string, { label: string; code?: string; category?: string }>();
        (result.items || []).forEach((region: RegionItem) => {
          regionsMap.set(region.id, {
            label: region.label,
            code: region.code,
            category: region.category
          });
        });
        setSelectedRegionsMap(regionsMap);
      }
    } catch (error) {
      console.error('Failed to fetch region details:', error);
    }
  };

  // Fetch language details by IDs
  const fetchLanguageDetails = async (languageIds: string[]) => {
    if (languageIds.length === 0) {
      setSelectedLanguagesMap(new Map());
      return;
    }

    try {
      const params = new URLSearchParams({
        ids: languageIds.join(','),
        limit: languageIds.length.toString()
      });

      const response = await fetch(`/api/filters/languages?${params}`);
      if (response.ok) {
        const result: { items?: LanguageItem[] } = await response.json();
        const languagesMap = new Map<string, { label: string; code?: string }>();
        (result.items || []).forEach((language: LanguageItem) => {
          languagesMap.set(language.id, {
            label: language.label,
            code: language.code
          });
        });
        setSelectedLanguagesMap(languagesMap);
      }
    } catch (error) {
      console.error('Failed to fetch language details:', error);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedRegions([]);
    setSelectedLanguages([]);
    setSelectedRegionsMap(new Map());
    setSelectedLanguagesMap(new Map());
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedRegions.length > 0 || selectedLanguages.length > 0 || searchTerm.trim();

  useEffect(() => {
    fetchCountries();
  }, []);

  // Refresh function to be called after CRUD operations
  const refreshCountries = () => {
    fetchCountries();
  };

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshCountries
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading countries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading countries: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
              {totalCount.toLocaleString()} total
            </Badge>
          </div>

          {/* Results Counter and Per Page */}
          <div className="flex items-center gap-3">
            
            <span className="text-sm text-muted-foreground whitespace-nowrap">per page:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-16 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search and Filters Row */}
        <div className="bg-card border border-border rounded-lg p-6">
          {/* Search and Filters Layout */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Search - 50% width */}
            <div className="flex-1 min-w-0">
              <label className="text-sm font-semibold flex items-center gap-2 mb-4">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search for countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-4 h-9 bg-muted/50 border-border/50 focus:bg-background focus:border-primary w-full"
                />
              </div>
            </div>

            {/* Region - 25% width */}
            <div className="w-full md:w-1/4 min-w-0">
              <label className="text-sm font-semibold flex items-center gap-2 mb-2">
                Region
              </label>
              <RegionAutocomplete
                selectedRegions={selectedRegions}
                onRegionsChange={setSelectedRegions}
                onRegionsMapChange={setSelectedRegionsMap}
                placeholder="All Regions"
              />
            </div>

            {/* Language - 25% width */}
            <div className="w-full md:w-1/4 min-w-0">
              <label className="text-sm font-semibold flex items-center gap-2 mb-2">
                Language
              </label>
              <LanguageAutocomplete
                selectedLanguages={selectedLanguages}
                onLanguagesChange={setSelectedLanguages}
                onLanguagesMapChange={setSelectedLanguagesMap}
                placeholder="All Languages"
              />
            </div>
          </div>

          {/* Filter Controls and Active Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <Badge variant="default" className="ml-2 text-xs">
                  {selectedRegions.length + selectedLanguages.length + (searchTerm.trim() ? 1 : 0)} active
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Active Filters:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchTerm.trim() && (
                  <Badge variant="default" className="gap-1 px-3 py-1">
                    <Search className="h-3 w-3" />
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedRegions.map(regionId => {
                  const region = selectedRegionsMap.get(regionId);
                  return (
                    <Badge key={regionId} variant="default" className="gap-1 px-3 py-1">
                      Region: {region?.label || regionId}
                      <button
                        onClick={() => setSelectedRegions(prev => prev.filter(id => id !== regionId))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {selectedLanguages.map(languageId => {
                  const language = selectedLanguagesMap.get(languageId);
                  return (
                    <Badge key={languageId} variant="default" className="gap-1 px-3 py-1">
                      Language: {language?.label || languageId}
                      <button
                        onClick={() => setSelectedLanguages(prev => prev.filter(id => id !== languageId))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Countries Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Flag</TableHead>
                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Country <Badge className="font-mono text-xs">{countries.length}</Badge></TableHead>
                <TableHead className="w-20 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Code</TableHead>
                <TableHead className="w-24 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Phone</TableHead>
                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Capital</TableHead>
                <TableHead className="w-40 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Regions</TableHead>
                <TableHead className="w-40 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Languages</TableHead>
                <TableHead className="w-32 text-center text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Media Contacts</TableHead>
                <TableHead className="w-32 text-right text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted">
                    {searchTerm ? 'No countries match your search' : 'No countries found'}
                  </TableCell>
                </TableRow>
              ) : (
                countries.map((country) => (
                  <TableRow 
                    key={country.id} 
                    className="hover:bg-muted/50 cursor-pointer transition-colors border-b border-subtle"
                    onClick={() => onView && onView(country)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onView && onView(country);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${country.name}`}
                  >
                    <TableCell>
                      <span className="text-2xl" title={`${country.name} flag`}>
                        {country.flag_emoji || "🏳️"}
                      </span>
                    </TableCell>
                    <TableCell className="text-strong font-medium">
                      {country.name}
                    </TableCell>
                    <TableCell>
                      {country.code && (
                        <Badge variant="quiet" className="font-mono text-xs">
                          {country.code}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted">
                      {country.phone_code || "—"}
                    </TableCell>
                    <TableCell className="text-muted">
                      {country.capital || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {country.regions && Array.isArray(country.regions) && country.regions.length > 0 ? (
                          country.regions.map((region) => (
                            <Badge 
                              key={region.id} 
                              variant="quiet" 
                              className="text-xs font-mono"
                              title={`${region.name} (${region.category})`}
                            >
                              {region.code}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-subtle text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {country.languages && Array.isArray(country.languages) && country.languages.length > 0 ? (
                          country.languages.map((language) => (
                            <Badge 
                              key={language.id} 
                              variant="quiet" 
                              className="text-xs font-mono"
                              title={language.name}
                            >
                              {language.code.toUpperCase()}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-subtle text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="quiet" className="font-mono">
                        {country._count?.media_contacts || 0}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView && onView(country)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit && onEdit(country)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={() => onDelete && onDelete(country)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} countries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Results summary for single page */}
        {totalPages <= 1 && countries.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing all {countries.length} countries
          </p>
        )}
      </div>
      
      {/* Edit Country Sheet */}
      {editingCountry && (
        <EditCountrySheet
          isOpen={!!editingCountry}
          onOpenChange={(open) => !open && setEditingCountry(null)}
          onSuccess={handleEditSuccess}
          country={editingCountry}
        />
      )}
      
      {/* Delete Country Dialog */}
      {deletingCountry && (
        <DeleteCountryDialog
          isOpen={!!deletingCountry}
          onClose={() => setDeletingCountry(null)}
          onSuccess={handleDeleteSuccess}
          country={deletingCountry}
        />
      )}
    </TooltipProvider>
  );
});