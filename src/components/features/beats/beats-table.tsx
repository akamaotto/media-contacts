'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Loader2, Search, MoreHorizontal, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
} from '@/components/ui/select';

// Minimal Beat type based on component usage
type Beat = {
  id: string;
  name: string;
  description?: string | null;
  countries?: { id: string; name: string; code: string; flag_emoji?: string | null }[];
  categories?: { id: string; name: string; color?: string | null; description?: string | null }[];
  contactCount?: number;
};

interface BeatsTableProps {
  onEdit: (beat: Beat) => void;
  onDelete: (beat: Beat) => void;
  onView?: (beat: Beat) => void;
}

export const BeatsTable = forwardRef<{ refresh: () => void }, BeatsTableProps>(({ onEdit, onDelete, onView }, ref) => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBeats, setFilteredBeats] = useState<Beat[]>([]);

  // Server-side filtering - update API call when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1); // Reset to first page when searching
      }
      fetchBeats();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, pageSize]);

  const fetchBeats = async () => {
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
      
      const res = await fetch(`/api/beats?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load beats');
      }
      const response = await res.json();
      
      // Handle paginated response structure
      if (response.data && Array.isArray(response.data)) {
        setBeats(response.data);
        setFilteredBeats(response.data);
        setTotalCount(response.totalCount || 0);
      } else {
        // Fallback for non-paginated response
        const beats = Array.isArray(response) ? response : [];
        setBeats(beats);
        setFilteredBeats(beats);
        setTotalCount(beats.length);
      }
    } catch (err) {
      console.error("Error fetching beats:", err);
      setError('Failed to load beats. Please try again.');
      toast.error('Failed to load beats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeats();
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  // Refresh function to be called after CRUD operations
  const refreshBeats = () => {
    fetchBeats();
  };

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshBeats
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading beats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchBeats} variant="outline">
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
              placeholder="Search beats..."
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
              <TableHead className="w-1/3 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Beat <Badge className="font-mono text-xs">{filteredBeats.length}</Badge></TableHead>
              <TableHead className="w-40 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Countries</TableHead>
              <TableHead className="w-44 text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Categories</TableHead>
              <TableHead className="w-24 text-center text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Contacts</TableHead>
              <TableHead className="w-20 text-right text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!Array.isArray(filteredBeats) || filteredBeats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted">
                  {loading ? 'Loading...' : searchTerm ? 'No beats match your search' : 'No beats found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredBeats.map((beat) => (
                <TableRow 
                  key={beat.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors border-b border-subtle"
                  onClick={() => onView && onView(beat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onView && onView(beat);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${beat.name}`}
                >
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <span className="text-strong font-medium">{beat.name}</span>
                      {beat.description && (
                        <span className="text-muted text-xs">
                          {beat.description.length > 80 
                            ? `${beat.description.substring(0, 80)}...` 
                            : beat.description
                          }
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {beat.countries && beat.countries.length > 0 ? (
                        beat.countries.slice(0, 4).map((country) => (
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
                      {beat.countries && beat.countries.length > 4 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              +{beat.countries.length - 4}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {beat.countries.slice(4).map((country) => (
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
                    <div className="flex flex-wrap gap-1">
                      {beat.categories && Array.isArray(beat.categories) && beat.categories.length > 0 ? (
                        beat.categories.slice(0, 3).map((category) => (
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
                      {beat.categories && beat.categories.length > 3 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              +{beat.categories.length - 3}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {beat.categories.slice(3).map((category) => (
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
                      {beat.contactCount || 0}
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
                          <DropdownMenuItem onClick={() => onView(beat)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEdit(beat)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(beat)}
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
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} beats
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
      {totalPages <= 1 && filteredBeats.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing all {filteredBeats.length} beats
        </p>
      )}
    </div>
  );
});
