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
  MapPin, 
  Users, 
  Globe, 
  Building2, 
  Edit,
  X
} from "lucide-react";
import type { Region } from "@/lib/country-data";

interface RegionDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  region: Region | null;
  onEdit?: (region: Region) => void;
}

export function RegionDetailSheet({
  isOpen,
  onOpenChange,
  region,
  onEdit,
}: RegionDetailSheetProps) {
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch countries for this region when sheet opens
  useEffect(() => {
    if (region && isOpen) {
      const fetchCountries = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/regions/${region.code}/countries`);
          if (response.ok) {
            const data = await response.json();
            setCountries(data);
          }
        } catch (error) {
          console.error('Error fetching region countries:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchCountries();
    }
  }, [region, isOpen]);

  if (!region) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'continent':
        return <Globe className="h-4 w-4" />;
      case 'subregion':
        return <MapPin className="h-4 w-4" />;
      case 'economic':
      case 'trade_agreement':
        return <Building2 className="h-4 w-4" />;
      case 'political':
      case 'organization':
        return <Users className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'continent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'subregion':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'economic':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'political':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'organization':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'trade_agreement':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      
      <SheetContent className="w-[480px] sm:w-[520px] p-0">
        {/* Accessibility: Required SheetTitle for screen readers */}
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Region Details: {region.name}</SheetTitle>
            <SheetDescription>
              View detailed information about the {region.name} region including member countries and statistics.
            </SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        
        {/* Header with proper Swedish design spacing */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-3">
              <h1 className="text-xl font-medium text-foreground leading-tight">
                {region.name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${getCategoryColor(region.category)} text-xs font-medium px-2 py-1 flex items-center gap-1.5`}
                >
                  {getCategoryIcon(region.category)}
                  {region.category.replace('_', ' ')}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                  {region.code}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(region)}
              className="h-8 px-3 text-sm mr-6 font-medium hover:bg-muted/50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </div>
          
          {region.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {region.description}
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
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Region Code</span>
                <p className="font-mono text-sm text-foreground">{region.code}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span>
                <p className="text-sm text-foreground capitalize">{region.category.replace('_', ' ')}</p>
              </div>
              {region.parentCode && (
                <div className="col-span-2 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parent Region</span>
                  <p className="font-mono text-sm text-foreground">{region.parentCode}</p>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Member Countries Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Member Countries
              </h2>
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {countries.length}
              </Badge>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground"></div>
              </div>
            ) : countries.length > 0 ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {countries.map((country) => (
                  <div
                    key={country.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-lg leading-none">{country.flag_emoji}</span>
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
                <p className="text-sm text-muted-foreground mb-1">No countries assigned</p>
                <p className="text-xs text-muted-foreground">Use the Edit button to assign countries</p>
              </div>
            )}
          </div>
          
        </div>
      </SheetContent>
    </Sheet>
  );
}
