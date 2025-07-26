'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Loader2, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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

import { getAllBeats } from '@/backend/beats/actions';
import type { Beat } from '@/backend/beats/actions';

interface BeatsTableProps {
  onEdit: (beat: Beat) => void;
  onDelete: (beat: Beat) => void;
}

export const BeatsTable = forwardRef<{ refresh: () => void }, BeatsTableProps>(({ onEdit, onDelete }, ref) => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [filteredBeats, setFilteredBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter beats based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBeats(beats);
    } else {
      const filtered = beats.filter(beat => {
        const searchLower = searchTerm.toLowerCase();
        return (
          beat.name.toLowerCase().includes(searchLower) ||
          beat.description?.toLowerCase().includes(searchLower) ||
          beat.countries?.some(country => 
            country.name.toLowerCase().includes(searchLower) ||
            country.code.toLowerCase().includes(searchLower)
          ) ||
          beat.categories?.some(category =>
            category.name.toLowerCase().includes(searchLower)
          )
        );
      });
      setFilteredBeats(filtered);
    }
  }, [searchTerm, beats]);

  const fetchBeats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllBeats();
      setBeats(data);
      setFilteredBeats(data);
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
      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search beats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {filteredBeats.length} of {beats.length} beats
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Beat <Badge className="font-mono text-xs">{filteredBeats.length}</Badge></TableHead>
              <TableHead className="w-40">Countries</TableHead>
              <TableHead className="w-44">Categories</TableHead>
              <TableHead className="w-24 text-center">Contacts</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBeats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No beats match your search' : 'No beats found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredBeats.map((beat) => (
                <TableRow key={beat.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col space-y-1">
                      <span className="font-semibold">{beat.name}</span>
                      {beat.description && (
                        <span className="text-sm text-muted-foreground">
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
                      {beat.categories && beat.categories.length > 0 ? (
                        beat.categories.slice(0, 3).map((category) => (
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
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {beat.contactCount || 0}
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

      {/* Results summary */}
      {filteredBeats.length > 0 && (
        <p className="text-sm text-gray-600">
          Showing {filteredBeats.length} of {beats.length} beats
        </p>
      )}
    </div>
  );
});
