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
  Globe, 
  Users, 
  Edit,
  Hash
} from "lucide-react";
import type { Language } from '@/lib/types/geography';

interface LanguageDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language | null;
  onEdit?: (language: Language) => void;
}

export function LanguageDetailSheet({
  isOpen,
  onOpenChange,
  language,
  onEdit,
}: LanguageDetailSheetProps) {
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch countries for this language when sheet opens
  useEffect(() => {
    if (language && isOpen) {
      const fetchLanguageDetails = async () => {
        try {
          setLoading(true);
          
          // Fetch countries that use this language
          // Note: This would require a specific API endpoint to fetch countries by language
          // For now, we'll show an empty state since the API doesn't exist
          setCountries([]);
        } catch (error) {
          console.error('Error fetching language details:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchLanguageDetails();
    }
  }, [language, isOpen]);

  if (!language) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:w-[540px] p-0">
        {/* Accessibility: Required SheetTitle for screen readers */}
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>Language Details: {language.name}</SheetTitle>
            <SheetDescription>
              View detailed information about the {language.name} language.
            </SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        
        {/* Header with proper spacing */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-3">
              <h1 className="text-xl font-medium text-foreground leading-tight flex items-center gap-3">
                <Globe className="h-6 w-6 text-muted-foreground" />
                {language.name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                  {language.code}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(language)}
              className="h-8 px-3 text-sm mr-6 font-medium hover:bg-muted/50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </div>
          
          {language.native && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Native name: {language.native}
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
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Language Name</span>
                <p className="text-sm text-foreground">{language.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Language Code</span>
                <p className="font-mono text-sm text-foreground">{language.code}</p>
              </div>
              {language.native && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Native Name</span>
                  <p className="text-sm text-foreground">{language.native}</p>
                </div>
              )}
              {language.rtl !== undefined && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Writing Direction</span>
                  <p className="text-sm text-foreground">
                    {language.rtl ? "Right-to-left" : "Left-to-right"}
                  </p>
                </div>
              )}
            </div>
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
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-foreground"></div>
              </div>
            ) : countries.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {countries.map((country) => (
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
                <p className="text-sm text-muted-foreground mb-1">No countries assigned</p>
                <p className="text-xs text-muted-foreground">Use the Edit button to assign countries</p>
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
                  {language.contactCount || 0}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase">Outlets</span>
                </div>
                <p className="text-2xl font-semibold">
                  {language.outletCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}