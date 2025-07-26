"use client";

import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { Search, Edit, Trash2, MoreHorizontal } from "lucide-react";
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
import { getAllRegions } from "@/backend/regions/actions";
import type { Region } from "@/lib/country-data";

interface RegionsTableProps {
  onEdit?: (region: Region) => void;
  onDelete?: (region: Region) => void;
  onView?: (region: Region) => void;
}

export const RegionsTable = forwardRef<{ refresh: () => void }, RegionsTableProps>(({ onEdit, onDelete, onView }, ref) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load regions data
  useEffect(() => {
    async function loadRegions() {
      try {
        setLoading(true);
        const regionsData = await getAllRegions();
        setRegions(regionsData);
        setError(null);
      } catch (err) {
        console.error("Error loading regions:", err);
        setError("Failed to load regions");
      } finally {
        setLoading(false);
      }
    }

    loadRegions();
  }, []);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      try {
        setLoading(true);
        const regionsData = await getAllRegions();
        setRegions(regionsData);
        setError(null);
      } catch (err) {
        console.error("Error loading regions:", err);
        setError("Failed to load regions");
      } finally {
        setLoading(false);
      }
    }
  }));

  // Filter regions based on search term
  const filteredRegions = useMemo(() => {
    if (!searchTerm.trim()) return regions;

    const searchLower = searchTerm.toLowerCase();
    return regions.filter(region =>
      region.name.toLowerCase().includes(searchLower) ||
      region.code.toLowerCase().includes(searchLower) ||
      region.category.toLowerCase().includes(searchLower) ||
      (region.description && region.description.toLowerCase().includes(searchLower))
    );
  }, [regions, searchTerm]);

  // Get countries for a region (up to 4) from database data
  const getRegionCountries = (region: Region) => {
    if (!region.countries || !Array.isArray(region.countries)) {
      return [];
    }
    return region.countries.slice(0, 4); // Limit to 4 countries as requested
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'continent':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'subregion':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'organization':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'economic':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      case 'political':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'trade_agreement':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'geographical':
        return 'bg-teal-100 text-teal-800 hover:bg-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search Input */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search regions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {filteredRegions.length} of {regions.length} regions
          </Badge>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region <Badge className="font-mono text-xs">{filteredRegions.length}</Badge></TableHead>
                <TableHead className="w-24">Code</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead className="w-48">Countries</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No regions match your search' : 'No regions found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegions.map((region) => {
                  const regionCountries = getRegionCountries(region);
                  const totalCountries = region.countries?.length || 0;
                  
                  return (
                    <TableRow 
                      key={region.code} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onView?.(region)}
                    >
                      <TableCell className="font-medium">
                        {region.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {region.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs capitalize ${getCategoryColor(region.category)}`}
                        >
                          {region.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {regionCountries.length > 0 ? (
                            <>
                              {regionCountries.map((country: any, index: number) => (
                                <Tooltip key={country.code}>
                                  <TooltipTrigger>
                                    <span 
                                      className="text-xl cursor-help hover:scale-110 transition-transform"
                                      title={country.name}
                                    >
                                      {country.flag_emoji || "🏳️"}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">{country.name}</p>
                                    <p className="text-xs text-muted-foreground">{country.code}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {totalCountries > 4 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs ml-1 cursor-help"
                                    >
                                      +{totalCountries - 4}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{totalCountries - 4} more countries</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">No countries</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {region.description ? (
                          <span className="text-sm text-muted-foreground">
                            {region.description.length > 80 
                              ? `${region.description.substring(0, 80)}...` 
                              : region.description
                            }
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
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
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onView?.(region);
                              }}
                              className="cursor-pointer"
                            >
                              <Search className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(region);
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(region);
                              }}
                              className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
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
      </div>
    </TooltipProvider>
  );
});

