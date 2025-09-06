"use client";

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { Search, Edit, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Region } from "@/lib/types/geography";
import { debugLogger } from '@/lib/debug/logger';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RegionsTableProps {
  onEdit?: (region: Region) => void;
  onDelete?: (region: Region) => void;
  onView?: (region: Region) => void;
}

export const RegionsTable = forwardRef<{ refresh: () => void }, RegionsTableProps>(({ onEdit, onDelete, onView }, ref) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Server-side filtering - update API call when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1); // Reset to first page when searching
      }
      fetchRegions();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, pageSize]);

  const fetchRegions = async () => {
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
        debugLogger.log('Fetching regions data', { url: '/api/regions', params: params.toString() }, 'RegionsTable');
      }
      
      const res = await fetch(`/api/regions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch regions');
      const response = await res.json();
      
      // Handle paginated response structure
      if (response.data && Array.isArray(response.data)) {
        setRegions(response.data);
        setTotalCount(response.totalCount || 0);
      } else {
        // Fallback for non-paginated response
        const regionsData = Array.isArray(response) ? response : [];
        setRegions(regionsData);
        setTotalCount(regionsData.length);
      }
    } catch (err) {
      console.error("Error loading regions:", err);
      debugLogger.error('Error loading regions', { 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }, 'RegionsTable');
      setError("Failed to load regions");
      toast.error('Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      try {
        setLoading(true);
        // Reduce logging frequency - only log in development
        if (process.env.NODE_ENV === 'development') {
          debugLogger.log('Refreshing regions data', { url: '/api/regions' }, 'RegionsTable');
        }
        
        const res = await fetch('/api/regions');
        if (!res.ok) throw new Error('Failed to fetch regions');
        const payload = await res.json();
        
        // Extract data from paginated result
        const data = payload && typeof payload === 'object' && 'data' in payload 
          ? Array.isArray(payload.data) ? payload.data : [] 
          : Array.isArray(payload) ? payload : [];
        
        // Validate that data is an array
        if (!Array.isArray(data)) {
          throw new Error(`Expected array data but got ${typeof data}`);
        }
        
        setRegions(data);
        setError(null);
      } catch (err) {
        console.error("Error loading regions:", err);
        debugLogger.error('Error refreshing regions', { 
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        }, 'RegionsTable');
        setError("Failed to load regions");
        toast.error('Failed to load regions');
      } finally {
        setLoading(false);
      }
    }
  }));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  // Filter regions based on search term
  const filteredRegions = useMemo(() => {
    // Ensure regions is an array before filtering
    if (!Array.isArray(regions)) {
      debugLogger.warn('Regions is not an array in filter function', { 
        regionsType: typeof regions,
        regionsValue: regions
      }, 'RegionsTable');
      return [];
    }
    
    if (!searchTerm.trim()) return regions;
    
    const searchLower = searchTerm.toLowerCase();
    return regions.filter(region =>
      region && typeof region === 'object' &&
      (region.name && region.name.toLowerCase().includes(searchLower) ||
      region.code && region.code.toLowerCase().includes(searchLower) ||
      region.category && region.category.toLowerCase().includes(searchLower) ||
      (region.description && region.description.toLowerCase().includes(searchLower)))
    );
  }, [regions, searchTerm]);

  // Utility function to safely access countries data
  const getSafeCountries = (region: any): any[] => {
    try {
      if (!region || typeof region !== 'object') {
        return [];
      }
      
      const countries = region.countries;
      if (countries === undefined || countries === null) {
        return [];
      }
      
      if (!Array.isArray(countries)) {
        // Only log warnings in development mode to reduce log volume
        if (process.env.NODE_ENV === 'development') {
          debugLogger.warn('Region countries is not an array', { 
            regionCode: region.code,
            countriesType: typeof countries,
            countriesValue: countries
          }, 'RegionsTable');
        }
        return [];
      }
      
      return countries;
    } catch (err) {
      debugLogger.error('Error in getSafeCountries', { 
        error: err instanceof Error ? err.message : String(err),
        region: region?.code
      }, 'RegionsTable');
      return [];
    }
  };

  // Get countries for a region (up to 4) from database data
  const getRegionCountries = (region: Region) => {
    try {
      return getSafeCountries(region).slice(0, 4); // Limit to 4 countries as requested
    } catch (err) {
      debugLogger.error('Error in getRegionCountries', { 
        error: err instanceof Error ? err.message : String(err),
        region: region?.code
      }, 'RegionsTable');
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading regions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading regions: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search and Controls */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search regions..."
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
                <TableHead className="w-24 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Code</TableHead>
                <TableHead className="w-32 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Category</TableHead>
                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Region <Badge className="font-mono text-xs">{filteredRegions.length}</Badge></TableHead>
                <TableHead className="w-64 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Countries</TableHead>
                <TableHead className="w-32 text-right text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted">
                    {searchTerm ? "No regions match your search" : "No regions found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegions.map((region) => {
                  const countries = getRegionCountries(region);
                  return (
                    <TableRow 
                      key={region.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors border-b border-subtle"
                      onClick={() => onView && onView(region)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onView && onView(region);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${region.name}`}
                    >
                      <TableCell>
                        <Badge variant="quiet" className="font-mono text-xs">
                          {region.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="quiet" className="text-xs">
                          {region.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-strong font-medium">
                        <div className="space-y-1">
                          <div>{region.name}</div>
                          {region.description && (
                            <div className="text-muted text-xs max-w-xs truncate">
                              {region.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {countries.length > 0 ? (
                            <>
                              {countries.map((country: any) => (
                                <Tooltip key={country.id}>
                                  <TooltipTrigger asChild>
                                    <Badge variant="quiet" className="text-xs">
                                      {country.flag_emoji} {country.code}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{country.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {getSafeCountries(region).length > 4 && (
                                <Badge variant="quiet" className="text-xs">
                                  +{getSafeCountries(region).length - 4}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-subtle text-xs">No countries</span>
                          )}
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
                              <DropdownMenuItem onClick={() => onView(region)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit && onEdit(region)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={() => onDelete && onDelete(region)}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} regions
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
        {totalPages <= 1 && filteredRegions.length > 0 && (
          <p className="text-sm text-gray-600">
            Showing all {filteredRegions.length} regions
          </p>
        )}
      </div>
    </TooltipProvider>
  );
});