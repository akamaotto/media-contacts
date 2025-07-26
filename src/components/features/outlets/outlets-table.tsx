'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Loader2, Search, MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react';
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

import type { Outlet } from '@/backend/outlets/actions';

interface OutletsTableProps {
  onEdit: (outlet: Outlet) => void;
  onDelete: (outlet: Outlet) => void;
}

export const OutletsTable = forwardRef<{ refresh: () => void }, OutletsTableProps>(
  function OutletsTable({ onEdit, onDelete }, ref) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [filteredOutlets, setFilteredOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter outlets based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOutlets(outlets);
    } else {
      const filtered = outlets.filter(outlet => {
        const searchLower = searchTerm.toLowerCase();
        return (
          outlet.name.toLowerCase().includes(searchLower) ||
          outlet.description?.toLowerCase().includes(searchLower) ||
          outlet.website?.toLowerCase().includes(searchLower) ||
          outlet.publisher?.name.toLowerCase().includes(searchLower) ||
          outlet.categories?.some(category =>
            category.name.toLowerCase().includes(searchLower)
          ) ||
          outlet.countries?.some(country => 
            country.name.toLowerCase().includes(searchLower) ||
            country.code.toLowerCase().includes(searchLower)
          )
        );
      });
      setFilteredOutlets(filtered);
    }
  }, [searchTerm, outlets]);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/outlets');
      if (!response.ok) {
        throw new Error('Failed to fetch outlets');
      }
      const data = await response.json();
      setOutlets(data);
      setFilteredOutlets(data);
    } catch (err) {
      console.error("Error fetching outlets:", err);
      setError('Failed to load outlets. Please try again.');
      toast.error('Failed to load outlets');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search outlets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {filteredOutlets.length} of {outlets.length} outlets
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Outlet <Badge className="font-mono text-xs">{filteredOutlets.length}</Badge></TableHead>
              <TableHead className="w-40">Countries</TableHead>
              <TableHead className="w-36">Publisher</TableHead>
              <TableHead className="w-44">Categories</TableHead>
              <TableHead className="w-24 text-center">Contacts</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOutlets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No outlets match your search' : 'No outlets found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredOutlets.map((outlet) => (
                <TableRow key={outlet.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{outlet.name}</div>
                      {outlet.website && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <ExternalLink className="h-3 w-3" />
                          <a 
                            href={outlet.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 hover:underline"
                          >
                            {outlet.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {outlet.description && (
                        <div className="text-sm text-gray-600 max-w-xs">
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
                              <Badge variant="outline" className="text-xs">
                                {country.flag_emoji} {country.code}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{country.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))
                      ) : (
                        <span className="text-gray-400 italic text-sm">No countries</span>
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
                    {outlet.publisher ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {outlet.publisher.name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 italic text-sm">Independent</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {outlet.categories && outlet.categories.length > 0 ? (
                        outlet.categories.slice(0, 3).map((category) => (
                          <Tooltip key={category.id}>
                            <TooltipTrigger>
                              <Badge 
                                variant="outline" 
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
                        <span className="text-gray-400 italic text-sm">No categories</span>
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
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {outlet.contactCount || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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

      {/* Results summary */}
      {filteredOutlets.length > 0 && (
        <p className="text-sm text-gray-600">
          Showing {filteredOutlets.length} of {outlets.length} outlets
        </p>
      )}
    </div>
  );
});

OutletsTable.displayName = 'OutletsTable';
