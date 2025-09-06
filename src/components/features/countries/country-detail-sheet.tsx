'use client';

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
  MapPin, 
  Users, 
  Globe, 
  Building2, 
  Edit,
  X,
  Phone,
  Map,
  Hash
} from "lucide-react";
import type { Country } from '@/app/api/countries/types';

interface CountryDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null;
  onEdit?: (country: Country) => void;
}

export function CountryDetailSheet({
  isOpen,
  onOpenChange,
  country,
  onEdit,
}: CountryDetailSheetProps) {
  const [regions, setRegions] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch related data for this country when sheet opens
  useEffect(() => {
    if (country && isOpen) {
      const fetchCountryDetails = async () => {
        try {
          setLoading(true);
          
          // Fetch regions for this country
          const regionsResponse = await fetch(`/api/countries/${country.id}/regions`);
          if (regionsResponse.ok) {
            const regionsData = await regionsResponse.json();
            setRegions(regionsData);
          }
          
          // Fetch languages for this country
          const languagesResponse = await fetch(`/api/countries/${country.id}/languages`);
          if (languagesResponse.ok) {
            const languagesData = await languagesResponse.json();
            setLanguages(languagesData);
          }
          
          // Fetch beats for this country
          const beatsResponse = await fetch(`/api/countries/${country.id}/beats`);
          if (beatsResponse.ok) {
            const beatsData = await beatsResponse.json();
            setBeats(beatsData);
          }
        } catch (error) {
          console.error('Error fetching country details:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchCountryDetails();
    }
  }, [country, isOpen]);

  if (!country) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:w-[540px] p-0">
        {/* Accessibility: Required SheetTitle for screen readers */}
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Country Details: {country.name}</SheetTitle>
            <SheetDescription>
              View detailed information about {country.name} including regions, languages, and statistics.
            </SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        
        {/* Header with proper spacing */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-3">
              <h1 className="text-xl font-medium text-foreground leading-tight flex items-center gap-3">
                <span className="text-2xl">{country.flag_emoji || "🏳️"}</span>
                {country.name}
              </h1>
              <div className="flex items-center gap-2">
                {country.code && (
                  <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                    {country.code}
                  </Badge>
                )}
                {country.phone_code && (
                  <Badge variant="outline" className="font-mono text-xs px-2 py-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {country.phone_code}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(country)}
              className="h-8 px-3 text-sm mr-6 font-medium hover:bg-muted/50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </div>
          
          {country.capital && (
            <p className="text-sm text-muted-foreground leading-relaxed flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Capital: {country.capital}
            </p>
          )}
        </div>

        {/* Content sections with proper spacing */}
        <div className="px-6 py-5 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Basic Information
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country Name</span>
                <p className="text-sm text-foreground">{country.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country Code</span>
                <p className="font-mono text-sm text-foreground">{country.code || "N/A"}</p>
              </div>
              {country.capital && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capital</span>
                  <p className="text-sm text-foreground">{country.capital}</p>
                </div>
              )}
              {country.phone_code && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone Code</span>
                  <p className="font-mono text-sm text-foreground">{country.phone_code}</p>
                </div>
              )}
              {country.latitude && country.longitude && (
                <div className="col-span-2 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coordinates</span>
                  <p className="text-sm text-foreground">
                    {country.latitude}, {country.longitude}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Regions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Regions
              </h2>
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {regions.length}
              </Badge>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground"></div>
              </div>
            ) : regions.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{region.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-mono">
                          {region.code}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {region.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">No regions assigned</p>
              </div>
            )}
          </div>

          <div className="h-px bg-border/50" />

          {/* Languages Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Languages
              </h2>
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {languages.length}
              </Badge>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground"></div>
              </div>
            ) : languages.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {languages.map((language) => (
                  <div
                    key={language.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{language.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {language.code}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">No languages assigned</p>
              </div>
            )}
          </div>

          <div className="h-px bg-border/50" />

          {/* Beats Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Beats
              </h2>
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {beats.length}
              </Badge>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground"></div>
              </div>
            ) : beats.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {beats.map((beat) => (
                  <div
                    key={beat.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{beat.name}</p>
                      {beat.description && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {beat.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">No beats assigned</p>
              </div>
            )}
          </div>

          <div className="h-px bg-border/50" />

          {/* Statistics */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Statistics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase">Media Contacts</span>
                </div>
                <p className="text-2xl font-semibold">
                  {country.contactCount || 0}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase">Outlets</span>
                </div>
                <p className="text-2xl font-semibold">
                  {country.outletCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}