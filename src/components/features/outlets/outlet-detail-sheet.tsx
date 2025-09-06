"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Users, 
  Edit,
  Hash,
  Globe,
  Link,
  Loader2
} from "lucide-react";
import type { Outlet } from '@/features/outlets/lib/types';

interface OutletDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  outlet: Outlet | null;
  onEdit?: (outlet: Outlet) => void;
}

export function OutletDetailSheet({
  isOpen,
  onOpenChange,
  outlet,
  onEdit,
}: OutletDetailSheetProps) {
  const [detailedOutlet, setDetailedOutlet] = useState<Outlet | null>(outlet);
  const [loading, setLoading] = useState(false);

  // Fetch detailed outlet data when the sheet opens
  useEffect(() => {
    if (outlet && isOpen) {
      const fetchOutletDetails = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/outlets/${outlet.id}`);
          if (response.ok) {
            const data = await response.json();
            setDetailedOutlet(data);
          } else {
            // If API call fails, use the provided outlet data
            setDetailedOutlet(outlet);
          }
        } catch (error) {
          console.error('Error fetching outlet details:', error);
          // If API call fails, use the provided outlet data
          setDetailedOutlet(outlet);
        } finally {
          setLoading(false);
        }
      };

      fetchOutletDetails();
    } else {
      setDetailedOutlet(outlet);
    }
  }, [outlet, isOpen]);

  if (!outlet) return null;

  if (loading) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-[480px] sm:w-[540px] p-0">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading outlet details...</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const displayOutlet = detailedOutlet || outlet;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:w-[540px] p-0">
        {/* Accessibility: Required SheetTitle for screen readers */}
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Outlet Details: {displayOutlet.name}</SheetTitle>
            <SheetDescription>
              View detailed information about the {displayOutlet.name} outlet.
            </SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        
        {/* Header with proper spacing */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-3">
              <h1 className="text-xl font-medium text-foreground leading-tight">
                {displayOutlet.name}
              </h1>
              <div className="flex items-center gap-2">
                {displayOutlet.publishers && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {displayOutlet.publishers.name}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(displayOutlet)}
              className="h-8 px-3 text-sm mr-6 font-medium hover:bg-muted/50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </div>
          
          {displayOutlet.website && (
            <a 
              href={displayOutlet.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1 leading-relaxed"
            >
              <Link className="h-4 w-4" />
              {displayOutlet.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Content sections with proper spacing */}
        <div className="px-6 py-5 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outlet Name</span>
                <p className="text-sm text-foreground">{displayOutlet.name}</p>
              </div>
              {displayOutlet.description && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</span>
                  <p className="text-sm text-foreground">{displayOutlet.description}</p>
                </div>
              )}
              {displayOutlet.website && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website</span>
                  <a 
                    href={displayOutlet.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {displayOutlet.website}
                  </a>
                </div>
              )}
              {displayOutlet.publishers && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Publisher</span>
                  <p className="text-sm text-foreground">{displayOutlet.publishers.name}</p>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Categories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Categories
              </h2>
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {displayOutlet.categories?.length || 0}
              </Badge>
            </div>
            
            {displayOutlet.categories && displayOutlet.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayOutlet.categories.map((category) => (
                  <Badge 
                    key={category.id} 
                    variant="outline" 
                    className="text-xs"
                    style={category.color ? { borderColor: category.color, color: category.color } : {}}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No categories assigned</p>
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
                {displayOutlet.countries?.length || 0}
              </Badge>
            </div>
            
            {displayOutlet.countries && displayOutlet.countries.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {displayOutlet.countries.map((country) => (
                  <div
                    key={country.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-lg leading-none">{country.flag_emoji || "🏳️"}</span>
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
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No countries assigned</p>
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
                  {displayOutlet.contactCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}