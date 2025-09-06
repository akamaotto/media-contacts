"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { 
  Building2, 
  Globe, 
  Newspaper,
  Edit,
  X
} from "lucide-react";
import type { Publisher } from "@/features/publishers/lib/types";

interface PublisherDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  publisher: Publisher | null;
  onEdit?: (publisher: Publisher) => void;
}

export function PublisherDetailSheet({
  isOpen,
  onOpenChange,
  publisher,
  onEdit,
}: PublisherDetailSheetProps) {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Fetch outlets for this publisher when sheet opens
  useEffect(() => {
    if (publisher && isOpen) {
      const fetchOutlets = async () => {
        try {
          setLoadingOutlets(true);
          const response = await fetch(`/api/outlets/publisher/${publisher.id}`);
          if (response.ok) {
            const data = await response.json();
            setOutlets(data.data || []);
          }
        } catch (error) {
          console.error('Error fetching publisher outlets:', error);
        } finally {
          setLoadingOutlets(false);
        }
      };

      // Fetch countries from outlets
      const fetchCountries = async () => {
        try {
          setLoadingCountries(true);
          const response = await fetch(`/api/outlets/publisher/${publisher.id}`);
          if (response.ok) {
            const data = await response.json();
            const allCountries = data.data?.flatMap((outlet: any) => outlet.countries || []) || [];
            // Remove duplicates by country ID
            const uniqueCountries = Array.from(
              new Map(allCountries.map((country: any) => [country.id, country])).values()
            );
            setCountries(uniqueCountries);
          }
        } catch (error) {
          console.error('Error fetching publisher countries:', error);
        } finally {
          setLoadingCountries(false);
        }
      };

      fetchOutlets();
      fetchCountries();
    }
  }, [publisher, isOpen]);

  if (!publisher) return null;

  // Helper function to clean website URL for display
  const cleanWebsiteUrl = (url: string | null | undefined): string => {
    if (!url) return 'N/A';
    
    try {
      // Remove protocol (http://, https://, etc.)
      let cleanUrl = url.replace(/^https?:\/\//, '');
      
      // Remove everything after the first slash (including the slash)
      cleanUrl = cleanUrl.split('/')[0];
      
      // Remove trailing slashes
      cleanUrl = cleanUrl.replace(/\/+$/, '');
      
      return cleanUrl || url; // Fallback to original if cleaning results in empty string
    } catch (error) {
      return url; // Return original URL if there's an error
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      
      <SheetContent className="w-[480px] sm:w-[520px] p-0">
        {/* Accessibility: Required SheetTitle for screen readers */}
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Publisher Details: {publisher.name}</SheetTitle>
            <SheetDescription>
              View detailed information about the {publisher.name} publisher including outlets and statistics.
            </SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        
        {/* Header with proper Swedish design spacing */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-3">
              <h1 className="text-xl font-medium text-foreground leading-tight">
                {publisher.name}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(publisher)}
              className="h-8 px-3 text-sm mr-6 font-medium hover:bg-muted/50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </div>
          
          {publisher.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {publisher.description}
            </p>
          )}
        </div>

        {/* Content sections with Swedish design spacing */}
        <div className="px-6 py-5 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {publisher.website && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Website: 
                  </span>
                  <a 
                    href={publisher.website || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                  >
                    {cleanWebsiteUrl(publisher.website)}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Outlets Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Outlets
              </h2>
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {publisher.outletCount || 0}
              </Badge>
            </div>
            
            {loadingOutlets ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground"></div>
              </div>
            ) : outlets.length > 0 ? (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                {outlets.map((outlet) => (
                  <div
                    key={outlet.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center">
                      <Newspaper className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{outlet.name}</p>
                      {outlet.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {outlet.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Newspaper className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">No outlets assigned</p>
                <p className="text-xs text-muted-foreground">Use the Edit button to assign outlets</p>
              </div>
            )}
          </div>

          <div className="h-px bg-border/50" />

          {/* Countries Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Countries
              </h2>
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {countries.length}
              </Badge>
            </div>
            
            {loadingCountries ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground"></div>
              </div>
            ) : countries.length > 0 ? (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                {countries.map((country) => (
                  <div
                    key={country.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-lg leading-none">
                      {country.flag_emoji || "🏳️"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{country.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {country.code}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">No countries found</p>
                <p className="text-xs text-muted-foreground">Outlets need to be assigned to countries</p>
              </div>
            )}
          </div>
          
        </div>
      </SheetContent>
    </Sheet>
  );
}