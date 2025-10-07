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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Minimal Category type based on component usage
type Category = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  beatCount?: number;
  outletCount?: number;
};

interface CategoriesTableProps {
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onView?: (category: Category) => void;
}

export const CategoriesTable = forwardRef<{ refresh: () => void }, CategoriesTableProps>(({ onEdit, onDelete, onView }, ref) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);

  // Server-side filtering - update API call when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1); // Reset to first page when searching
      }
      fetchCategories();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentPage, pageSize]);

  const fetchCategories = async () => {
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
      
      const res = await fetch(`/api/categories?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load categories');
      }
      const response = await res.json();
      
      // Handle paginated response structure
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
        setFilteredCategories(response.data);
        setTotalCount(response.totalCount || 0);
      } else {
        // Fallback for non-paginated response
        const categories = Array.isArray(response) ? response : [];
        setCategories(categories);
        setFilteredCategories(categories);
        setTotalCount(categories.length);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError('Failed to load categories. Please try again.');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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
  const refreshCategories = () => {
    fetchCategories();
  };

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: refreshCategories
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchCategories} variant="outline">
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
              placeholder="Search categories..."
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
              <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Category <Badge className="font-mono text-xs">{filteredCategories.length}</Badge></TableHead>
              <TableHead className="w-24 text-center text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Beats</TableHead>
              <TableHead className="w-24 text-center text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Outlets</TableHead>
              <TableHead className="w-20 text-right text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!Array.isArray(filteredCategories) || filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted">
                  {searchTerm ? 'No categories match your search' : 'No categories found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow 
                  key={category.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors border-b border-subtle"
                  onClick={() => onView && onView(category)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onView && onView(category);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${category.name}`}
                >
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-3">
                        {category.color && (
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <span className="text-strong font-medium">{category.name}</span>
                      </div>
                      {category.description && (
                        <span className="text-muted text-xs ml-7">
                          {category.description.length > 100 
                            ? `${category.description.substring(0, 100)}...` 
                            : category.description
                          }
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="quiet">
                      {category.beatCount || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="quiet">
                      {category.outletCount || 0}
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
                          <DropdownMenuItem onClick={() => onView(category)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(category)}
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
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} categories
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
      {totalPages <= 1 && filteredCategories.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing all {filteredCategories.length} categories
        </p>
      )}
    </div>
  );
});
