'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Loader2, Search, MoreHorizontal, Edit, Trash2, ExternalLink, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Outlet } from '@/features/outlets/lib/types';

interface OutletsTableProps {
  onEdit: (outlet: Outlet) => void;
  onDelete: (outlet: Outlet) => void;
  onView?: (outlet: Outlet) => void;
}

export const OutletsTable = forwardRef<{ refresh: () => void }, OutletsTableProps>(
  function OutletsTable({ onEdit, onDelete, onView }, ref) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const totalPages = Math.ceil(totalCount / pageSize);

  // Server-side filtering - update API call when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1); // Reset to first page when searching
      }
      fetchOutlets();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, pageSize]);

  const fetchOutlets = async () => {
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
      
      const response = await fetch(`/api/outlets?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        let message = 'Failed to fetch outlets';
        try {
          const errBody = await response.json();
          if (typeof errBody?.error === 'string') message = errBody.error;
        } catch {}
        if (response.status === 401) {
          message = 'Unauthorized. Please log in.';
        }
        throw new Error(message);
      }
      const result = await response.json();
      
      // Handle paginated response structure
      if (result.data && Array.isArray(result.data)) {
        setOutlets(result.data);
        setTotalCount(result.totalCount || 0);
      } else {
        // Fallback for non-paginated response
        setOutlets(Array.isArray(result) ? result : []);
        setTotalCount(Array.isArray(result) ? result.length : 0);
      }
    } catch (err) {
      console.error('Error fetching outlets:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load outlets. Please try again.';
      setError(msg);
      toast.error(msg);
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

  // Filter outlets based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      // When no search term, we still need to fetch from API with pagination
      return;
    }
    
    // For client-side filtering when we have data
    const filtered = outlets.filter(outlet => {
      const searchLower = searchTerm.toLowerCase();
      return (
        outlet.name.toLowerCase().includes(searchLower) ||
        outlet.description?.toLowerCase().includes(searchLower) ||
        outlet.website?.toLowerCase().includes(searchLower) ||
        outlet.publishers?.name.toLowerCase().includes(searchLower) ||
        outlet.categories?.some(category =>
          category.name.toLowerCase().includes(searchLower)
        ) ||
        outlet.countries?.some(country => 
          country.name.toLowerCase().includes(searchLower) ||
          (country.code?.toLowerCase() ?? '').includes(searchLower)
        )
      );
    });
    // Note: For server-side search, we rely on the API call in the useEffect above
  }, [searchTerm, outlets]);

  useEffect(() => {
    fetchOutlets();
  }, []);

  // Refresh function to be called after CRUD operations
  const refreshOutlets = () => {
    fetchOutlets();
  };

  // Expose refresh function to parent components via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshOutlets,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading outlets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchOutlets} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search outlets..."
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
              <TableHead className="w-1/3 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Outlet <Badge className="font-mono text-xs">{outlets.length}</Badge></TableHead>
              <TableHead className="w-40 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Countries</TableHead>
              <TableHead className="w-36 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Publisher</TableHead>
              <TableHead className="w-44 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Categories</TableHead>
              <TableHead className="w-24 text-center text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Contacts</TableHead>
              <TableHead className="w-20 text-right text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outlets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted">
                  {searchTerm ? 'No outlets match your search' : 'No outlets found'}
                </TableCell>
              </TableRow>
            ) : (
              outlets.map((outlet) => (
                <TableRow 
                  key={outlet.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors border-b border-subtle"
                  onClick={() => onView && onView(outlet)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onView && onView(outlet);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${outlet.name}`}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-strong font-medium">{outlet.name}</div>
                      {outlet.website && (
                        <div className="flex items-center space-x-1 text-xs text-muted">
                          <ExternalLink className="h-3 w-3" />
                          <a 
                            href={outlet.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-strong hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {outlet.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {outlet.description && (
                        <div className="text-muted text-xs max-w-xs">
                          <span className="truncate block" title={outlet.description}>
                            {outlet.description}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {outlet.countries && outlet.countries.length > 0 ? (
                        outlet.countries.slice(0, 4).map((country) => (
                          <Tooltip key={country.id}>
                            <TooltipTrigger>
                              <Badge variant="quiet" className="text-xs">
                                {country.flag_emoji} {country.code}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{country.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))
                      ) : (
                        <span className="text-subtle text-xs">No countries</span>
                      )}
                      {outlet.countries && outlet.countries.length > 4 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              +{outlet.countries.length - 4}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {outlet.countries.slice(4).map((country) => (
                                <p key={country.id}>
                                  {country.flag_emoji} {country.name}
                                </p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {outlet.publishers ? (
                      <Badge variant="quiet" className="text-xs">
                        {outlet.publishers.name}
                      </Badge>
                    ) : (
                      <span className="text-subtle text-xs">No publisher</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {outlet.categories && outlet.categories.length > 0 ? (
                        outlet.categories.slice(0, 3).map((category) => (
                          <Tooltip key={category.id}>
                            <TooltipTrigger>
                              <Badge 
                                variant="quiet" 
                                className="text-xs"
                                style={category.color ? { borderColor: category.color, color: category.color } : {}}
                              >
                                {category.name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{category.description || category.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))
                      ) : (
                        <span className="text-subtle text-xs">No categories</span>
                      )}
                      {outlet.categories && outlet.categories.length > 3 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              +{outlet.categories.length - 3}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {outlet.categories.slice(3).map((category) => (
                                <p key={category.id}>{category.name}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="quiet">
                      {outlet.contactCount || 0}
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
                          <DropdownMenuItem onClick={() => onView && onView(outlet)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEdit(outlet)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(outlet)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
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
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} outlets
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
      {totalPages <= 1 && outlets.length > 0 && (
        <p className="text-sm text-gray-600">
          Showing all {outlets.length} outlets
        </p>
      )}
    </div>
  );
});