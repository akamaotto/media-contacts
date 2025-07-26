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

import { getAllPublishers } from '@/backend/publishers/actions';
import type { Publisher } from '@/backend/publishers/actions';

interface PublishersTableProps {
  onEdit: (publisher: Publisher) => void;
  onDelete: (publisher: Publisher) => void;
}

export const PublishersTable = forwardRef<{ refresh: () => void }, PublishersTableProps>(({ onEdit, onDelete }, ref) => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [filteredPublishers, setFilteredPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter publishers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPublishers(publishers);
    } else {
      const filtered = publishers.filter(publisher => {
        const searchLower = searchTerm.toLowerCase();
        return (
          publisher.name.toLowerCase().includes(searchLower) ||
          publisher.description?.toLowerCase().includes(searchLower) ||
          publisher.website?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredPublishers(filtered);
    }
  }, [searchTerm, publishers]);

  const fetchPublishers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllPublishers();
      setPublishers(data);
      setFilteredPublishers(data);
    } catch (err) {
      console.error("Error fetching publishers:", err);
      setError('Failed to load publishers. Please try again.');
      toast.error('Failed to load publishers');
    } finally {
      setLoading(false);
    }
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
      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search publishers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {filteredPublishers.length} of {publishers.length} publishers
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Publisher <Badge className="font-mono text-xs">{filteredPublishers.length}</Badge></TableHead>
              <TableHead className="w-48">Countries</TableHead>
              <TableHead className="w-32">Website</TableHead>
              <TableHead className="w-44 text-center">Outlets</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPublishers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No publishers match your search' : 'No publishers found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPublishers.map((publisher) => (
                <TableRow key={publisher.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col space-y-1">
                      <span className="font-semibold">{publisher.name}</span>
                      {publisher.description && (
                        <span className="text-sm text-muted-foreground">
                          {publisher.description.length > 60 
                            ? `${publisher.description.substring(0, 60)}...` 
                            : publisher.description
                          }
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {publisher.countries && publisher.countries.length > 0 ? (
                        <>
                          {publisher.countries.slice(0, 8).map((country) => (
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
                          ))}
                          {publisher.countries.length > 8 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs cursor-pointer">
                                  +{publisher.countries.length - 8}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-semibold text-xs">Additional countries:</p>
                                  {publisher.countries.slice(8).map((country) => (
                                    <p key={country.id} className="text-xs">
                                      {country.flag_emoji} {country.name}
                                    </p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No countries</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {publisher.website ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={publisher.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-24">{publisher.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No website</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {publisher.outlets && publisher.outlets.length > 0 ? (
                        <>
                          {publisher.outlets.slice(0, 3).map((outlet) => (
                            <Badge key={outlet.id} variant="secondary" className="text-xs">
                              {outlet.name}
                            </Badge>
                          ))}
                          {publisher.outlets.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs cursor-pointer">
                                  +{publisher.outlets.length - 3}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold text-xs">Additional outlets:</p>
                                  {publisher.outlets.slice(3).map((outlet) => (
                                    <p key={outlet.id} className="text-xs">
                                      {outlet.name}
                                    </p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No outlets</span>
                      )}
                    </div>
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

      {/* Results Summary */}
      {searchTerm && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredPublishers.length} of {publishers.length} publishers
        </p>
      )}
    </div>
  );
});
