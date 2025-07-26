"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertCircle, Globe, Edit, Trash2, Search, MoreHorizontal } from "lucide-react";
import { toast } from 'sonner';
import { EditCountrySheet } from './edit-country-sheet';
import { DeleteCountryDialog } from './delete-country-dialog';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Country {
  id: string;
  name: string;
  code?: string | null;
  phone_code?: string | null;
  capital?: string | null;
  flag_emoji?: string | null;
  regions?: {
    id: string;
    name: string;
    code: string;
    category: string;
  }[];
  languages?: {
    id: string;
    name: string;
    code: string;
  }[];
  _count?: {
    mediaContacts: number;
  };
}

interface CountriesResponse {
  countries: Country[];
  total: number;
  timestamp: string;
}

export function CountriesTable() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/countries");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CountriesResponse = await response.json();
      setCountries(data.countries);
      setFilteredCountries(data.countries);

    } catch (err) {
      console.error("Failed to fetch countries:", err);
      setError('Failed to load countries. Please try again.');
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    fetchCountries();
  };

  const handleDeleteSuccess = () => {
    fetchCountries();
    setDeletingCountry(null);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter((country) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          country.name.toLowerCase().includes(searchLower) ||
          country.code?.toLowerCase().includes(searchLower) ||
          country.capital?.toLowerCase().includes(searchLower) ||
          country.phone_code?.includes(searchTerm) ||
          country.regions?.some(region => 
            region.name.toLowerCase().includes(searchLower) ||
            region.code.toLowerCase().includes(searchLower)
          ) ||
          country.languages?.some(language => 
            language.name.toLowerCase().includes(searchLower) ||
            language.code.toLowerCase().includes(searchLower)
          )
        );
      });
      setFilteredCountries(filtered);
    }
  }, [searchTerm, countries]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Countries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading countries...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Countries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading countries: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
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
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {filteredCountries.length} of {countries.length} countries
          </Badge>
        </div>
        
        {/* Countries Table */}
        <div className="rounded-md border">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Flag</TableHead>
              <TableHead>Country <Badge className="font-mono text-xs">{filteredCountries.length}</Badge></TableHead>
              <TableHead className="w-20">Code</TableHead>
              <TableHead className="w-24">Phone</TableHead>
              <TableHead>Capital</TableHead>
              <TableHead className="w-40">Regions</TableHead>
              <TableHead className="w-40">Languages</TableHead>
              <TableHead className="w-32 text-center">Media Contacts</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCountries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No countries match your search' : 'No countries found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCountries.map((country) => (
                <TableRow key={country.id} className="hover:bg-muted/50">
                  <TableCell>
                    <span className="text-2xl" title={`${country.name} flag`}>
                      {country.flag_emoji || "🏳️"}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {country.name}
                  </TableCell>
                  <TableCell>
                    {country.code && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {country.code}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {country.phone_code || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {country.capital || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {country.regions && country.regions.length > 0 ? (
                        country.regions.map((region) => (
                          <Badge 
                            key={region.id} 
                            variant="outline" 
                            className="text-xs font-mono"
                            title={`${region.name} (${region.category})`}
                          >
                            {region.code}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {country.languages && country.languages.length > 0 ? (
                        country.languages.map((language) => (
                          <Badge 
                            key={language.id} 
                            variant="secondary" 
                            className="text-xs font-mono"
                            title={language.name}
                          >
                            {language.code.toUpperCase()}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={country._count?.mediaContacts ? "default" : "secondary"}
                      className="font-mono"
                    >
                      {country._count?.mediaContacts || 0}
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
                        <DropdownMenuItem onClick={() => setEditingCountry(country)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingCountry(country)}
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
      </div>
      
      {/* Edit Country Sheet */}
      {editingCountry && (
        <EditCountrySheet
          isOpen={!!editingCountry}
          onOpenChange={(open) => !open && setEditingCountry(null)}
          onSuccess={handleEditSuccess}
          country={editingCountry}
        />
      )}
      
      {/* Delete Country Dialog */}
      {deletingCountry && (
        <DeleteCountryDialog
          isOpen={!!deletingCountry}
          onClose={() => setDeletingCountry(null)}
          onSuccess={handleDeleteSuccess}
          country={deletingCountry}
        />
      )}
    </TooltipProvider>
  );
}
