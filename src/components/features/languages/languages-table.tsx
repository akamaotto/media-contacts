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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Trash2, Search, Globe, Loader2, AlertCircle, ChevronLeft, ChevronRight, MoreHorizontal, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Language } from "@/lib/types/geography";
import { toast } from 'sonner';
import { debugLogger } from '@/lib/debug/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguagesTableProps {
  onEdit: (language: Language) => void;
  onDelete: (language: Language) => void;
  onView?: (language: Language) => void;
}

export const LanguagesTable = forwardRef<{ refresh: () => void }, LanguagesTableProps>(({ onEdit, onDelete, onView }, ref) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const totalPages = Math.ceil(totalCount / pageSize);

  // Server-side filtering - update API call when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1); // Reset to first page when searching
      }
      fetchLanguages();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, pageSize]);

  const fetchLanguages = async () => {
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
      
      // Reduce logging frequency - only log in development
      if (process.env.NODE_ENV === 'development') {
        debugLogger.log('Fetching languages data', { url: '/api/languages', params: params.toString() }, 'LanguagesTable');
      }
      
      const res = await fetch(`/api/languages?${params}`);
      if (!res.ok) throw new Error('Failed to fetch languages');
      const response = await res.json();
      
      // Handle paginated response structure
      if (response.data && Array.isArray(response.data)) {
        setLanguages(response.data);
        setFilteredLanguages(response.data);
        setTotalCount(response.totalCount || 0);
      } else {
        // Fallback for non-paginated response
        const languagesData = Array.isArray(response) ? response : [];
        setLanguages(languagesData);
        setFilteredLanguages(languagesData);
        setTotalCount(languagesData.length);
      }
    } catch (err) {
      console.error("Error fetching languages:", err);
      debugLogger.error('Error fetching languages', { 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }, 'LanguagesTable');
      
      setError('Failed to load languages. Please try again.');
      toast.error('Failed to load languages');
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

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredLanguages(languages);
    } else {
      const filtered = languages.filter((language) => {
        const matchesLang =
          language.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          language.code.toLowerCase().includes(searchTerm.toLowerCase());
        const safeCountries = getSafeCountries(language);
        const matchesCountry = safeCountries.some((country: any) =>
          country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return matchesLang || matchesCountry;
      });
      setFilteredLanguages(filtered);
    }
  }, [searchTerm, languages]);

  // Expose refresh function to parent components via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchLanguages,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading languages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading languages: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Utility function to safely access countries data
  const getSafeCountries = (language: any): any[] => {
    try {
      if (!language || typeof language !== 'object') {
        return [];
      }
      
      const countries = language.countries;
      if (countries === undefined || countries === null) {
        return [];
      }
      
      if (!Array.isArray(countries)) {
        // Only log warnings in development mode to reduce log volume
        if (process.env.NODE_ENV === 'development') {
          debugLogger.warn('Language countries is not an array', { 
            languageCode: language.code,
            countriesType: typeof countries,
            countriesValue: countries
          }, 'LanguagesTable');
        }
        return [];
      }
      
      return countries;
    } catch (err) {
      debugLogger.error('Error in getSafeCountries', { 
        error: err instanceof Error ? err.message : String(err),
        language: language?.code
      }, 'LanguagesTable');
      return [];
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search and Controls */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {totalCount} total
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20">
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

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Code</TableHead>
                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Language <Badge className="font-mono text-xs">{Array.isArray(filteredLanguages) ? filteredLanguages.length : 0}</Badge></TableHead>
                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Countries</TableHead>
                <TableHead className="w-32 text-right text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(filteredLanguages) && filteredLanguages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted">
                    {searchTerm ? "No languages match your search" : "No languages found"}
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(filteredLanguages) ? filteredLanguages.map((language) => (
                  <TableRow 
                    key={language.code}
                    className="hover:bg-muted/50 cursor-pointer transition-colors border-b border-subtle"
                    onClick={() => onView && onView(language)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onView && onView(language);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${language.name}`}
                  >
                    {/* Remove excessive per-row logging to reduce log volume */}
                    <TableCell>
                      <Badge variant="quiet" className="font-mono text-xs">
                        {language.code.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-strong font-medium">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted" />
                        {language.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const safeCountries = getSafeCountries(language);
                          return safeCountries.length > 0 ? (
                            safeCountries.slice(0, 4).map((country: any) => {
                              // Add error handling for individual country rendering
                              try {
                                return (
                                  <Tooltip key={country.id}>
                                    <TooltipTrigger asChild>
                                      <Badge variant="quiet" className="text-xs cursor-help">
                                        {country.flag_emoji} {country.code}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{country.name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              } catch (renderError) {
                                debugLogger.error('Error rendering country badge', {
                                  error: renderError instanceof Error ? renderError.message : String(renderError),
                                  country: country?.code,
                                  language: language?.code
                                }, 'LanguagesTable');
                                return null;
                              }
                            }).filter(Boolean).concat(
                              safeCountries.length > 4 ? (
                                <Badge key="more" variant="quiet" className="text-xs">
                                  +{safeCountries.length - 4}
                                </Badge>
                              ) : []
                            )
                          ) : (
                            <span className="text-subtle text-xs">No countries</span>
                          );
                        })()}
                      </div>
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
                            <DropdownMenuItem onClick={() => onView && onView(language)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEdit(language)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(language)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : null
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} languages
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
        {totalPages <= 1 && filteredLanguages.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing all {filteredLanguages.length} languages
          </p>
        )}
      </div>
    </TooltipProvider>
  );
});