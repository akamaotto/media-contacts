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

// Minimal local type to avoid backend dependency
type Publisher = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  countries: Array<{ id: string; code: string; name: string; flag_emoji?: string | null }>;
  outlets: Array<{ id: string; name: string }>;
};

interface PublishersTableProps {
  onEdit: (publisher: Publisher) => void;
  onDelete: (publisher: Publisher) => void;
  onView?: (publisher: Publisher) => void;
}

export const PublishersTable = forwardRef<{ refresh: () => void }, PublishersTableProps>(({ onEdit, onDelete, onView }, ref) => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
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
      fetchPublishers();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, pageSize]);

  // Utility function to safely access publishers data
  const getSafePublishers = (data: any): Publisher[] => {
    try {
      if (!data) {
        return [];
      }
      
      // Extract data from paginated result
      const publishersData = data && typeof data === 'object' && 'data' in data 
        ? Array.isArray(data.data) ? data.data : [] 
        : Array.isArray(data) ? data : [];
      
      // Validate that data is an array
      if (!Array.isArray(publishersData)) {
        return [];
      }
      
      return publishersData;
    } catch (err) {
      console.error('Error in getSafePublishers', { 
        error: err instanceof Error ? err.message : String(err)
      });
      return [];
    }
  };

  const fetchPublishers = async () => {
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
      
      const res = await fetch(`/api/publishers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch publishers');
      const response = await res.json();
      
      // Handle paginated response structure
      if (response.data && Array.isArray(response.data)) {
        setPublishers(response.data);
        setTotalCount(response.totalCount || 0);
      } else {
        // Fallback for non-paginated response
        const publishersData = getSafePublishers(response);
        setPublishers(publishersData);
        setTotalCount(publishersData.length);
      }
    } catch (err) {
      console.error("Error fetching publishers:", err);
      setError('Failed to load publishers. Please try again.');
      toast.error('Failed to load publishers');
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
    fetchPublishers();
  }, []);

  // Refresh function to be called after CRUD operations
  const refreshPublishers = () => {
    fetchPublishers();
  };

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshPublishers
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading publishers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchPublishers} variant="outline">
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
              placeholder="Search publishers..."
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
              <TableHead className="w-1/3 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Publisher <Badge className="font-mono text-xs">{publishers.length}</Badge></TableHead>
              <TableHead className="w-48 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Countries</TableHead>
              <TableHead className="w-32 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Website</TableHead>
              <TableHead className="w-44 text-center text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Outlets</TableHead>
              <TableHead className="w-20 text-right text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publishers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted">
                  {searchTerm ? 'No publishers match your search' : 'No publishers found'}
                </TableCell>
              </TableRow>
            ) : (
              publishers.map((publisher) => (
                <TableRow 
                  key={publisher.id} 
                  className="hover:bg-muted/50 cursor-pointer transition-colors border-b border-subtle"
                  onClick={() => onView && onView(publisher)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onView && onView(publisher);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${publisher.name}`}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-strong font-medium">{publisher.name}</div>
                      {publisher.description && (
                        <div className="text-muted text-xs max-w-xs">
                          <span className="truncate block" title={publisher.description}>
                            {publisher.description}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {publisher.countries && publisher.countries.length > 0 ? (
                        publisher.countries.slice(0, 4).map((country) => (
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
                      {publisher.countries && publisher.countries.length > 4 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              +{publisher.countries.length - 4}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {publisher.countries.slice(4).map((country) => (
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
                    {publisher.website ? (
                      <a 
                        href={publisher.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-default hover:text-strong underline flex items-center gap-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit
                      </a>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="quiet">
                      {publisher.outlets?.length || 0} outlets
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
                          <DropdownMenuItem onClick={() => onView && onView(publisher)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEdit(publisher)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(publisher)}
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
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} publishers
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
      {totalPages <= 1 && publishers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing all {publishers.length} publishers
        </p>
      )}
    </div>
  );
});