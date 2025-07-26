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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Trash2, Search, Globe, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAllLanguages } from "@/backend/languages/actions";
import { Language } from "@/lib/language-data";
import { toast } from 'sonner';

interface LanguagesTableProps {
  onEdit: (language: Language) => void;
  onDelete: (language: Language) => void;
}

export function LanguagesTable({ onEdit, onDelete }: LanguagesTableProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredLanguages(languages);
    } else {
      const filtered = languages.filter(
        (language) =>
          language.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          language.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (language.countries && language.countries.some(country => 
            country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            country.code.toLowerCase().includes(searchTerm.toLowerCase())
          ))
      );
      setFilteredLanguages(filtered);
    }
  }, [searchTerm, languages]);

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllLanguages();
      setLanguages(data);
      setFilteredLanguages(data);
    } catch (err) {
      console.error("Error fetching languages:", err);
      setError('Failed to load languages. Please try again.');
      toast.error('Failed to load languages');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading languages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading languages: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredLanguages.length} of {languages.length} languages
          </Badge>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Code</TableHead>
                <TableHead>Language <Badge className="font-mono text-xs">{filteredLanguages.length}</Badge></TableHead>
                <TableHead>Countries</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLanguages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No languages match your search" : "No languages found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLanguages.map((language) => (
                  <TableRow key={language.code}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {language.code.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {language.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {language.countries && language.countries.length > 0 ? (
                          language.countries.slice(0, 4).map((country) => (
                            <Tooltip key={country.id}>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs cursor-help">
                                  {country.flag_emoji} {country.code}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{country.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))
                        ) : (
                          <span className="text-muted-foreground italic text-sm">No countries assigned</span>
                        )}
                        {language.countries && language.countries.length > 4 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">
                                +{language.countries.length - 4}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs">
                                <p className="font-medium mb-1">Additional countries:</p>
                                <div className="text-sm">
                                  {language.countries.slice(4).map((country) => (
                                    <div key={country.id} className="flex items-center gap-1">
                                      <span>{country.flag_emoji}</span>
                                      <span>{country.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(language)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit language</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(language)}
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete language</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredLanguages.length} of {languages.length} languages
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>
    </TooltipProvider>
  );
}
