"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Language } from '@/lib/types/geography';
import { getCountries } from '@/features/countries/lib/queries';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';

// Form validation schema
const languageFormSchema = z.object({
  code: z.string().min(2, 'Language code must be at least 2 characters').max(3, 'Language code must be at most 3 characters'),
  name: z.string().min(1, 'Language name is required'),
});

type LanguageFormData = z.infer<typeof languageFormSchema>;

interface EditLanguageSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  language: Language;
}

export function EditLanguageSheet({ isOpen, onOpenChange, onSuccess, language }: EditLanguageSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<any[]>([]);
  const [assignedCountries, setAssignedCountries] = useState<any[]>(language.countries || []);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countrySelectOpen, setCountrySelectOpen] = useState(false);

  // Load available countries
  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const countries = await getCountries();
        setAvailableCountries(countries);
      } catch (error) {
        console.error('Failed to load countries:', error);
        toast.error('Failed to load countries');
      } finally {
        setLoadingCountries(false);
      }
    };
    
    if (isOpen) {
      loadCountries();
    }
  }, [isOpen]);

  // Reset assigned countries when language changes
  useEffect(() => {
    setAssignedCountries(language.countries || []);
  }, [language]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      code: language.code || '',
      name: language.name || '',
    } as any
  });

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Update the language basic info AND country assignments
      const updateData = {
        ...data,
        countries: assignedCountries.map(country => country.id) // Send country IDs
      };
      
      const response = await fetch(`/api/languages/${language.code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update language');
      }

      toast.success('Language updated successfully');
      onSuccess(); // This should refresh the languages table
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update language:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update language');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Language</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Language Code *</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="e.g., en, es, fr"
                maxLength={3}
                className="uppercase"
                disabled={isSubmitting}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{String(errors.code.message || errors.code)}</p>
              )}
              <p className="text-xs text-muted-foreground">
                ISO 639-1 two-letter or ISO 639-2 three-letter code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Language Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., English, Spanish, French"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{String(errors.name.message || errors.name)}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Country Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Countries</Label>
                <p className="text-sm text-muted-foreground">
                  Countries where this language is spoken
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {assignedCountries.length} assigned
              </Badge>
            </div>

            {/* Assigned Countries */}
            {assignedCountries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assigned Countries</Label>
                <div className="flex flex-wrap gap-2">
                  {assignedCountries.map((country) => (
                    <div key={country.id} className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {country.flag_emoji} {country.name}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          setAssignedCountries(prev => 
                            prev.filter(c => c.id !== country.id)
                          );
                        }}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Country Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Countries</Label>
              {!loadingCountries ? (
                <Popover open={countrySelectOpen} onOpenChange={setCountrySelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countrySelectOpen}
                      className="w-full justify-between"
                      disabled={isSubmitting}
                    >
                      Search and select countries...
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search countries..." />
                      <CommandEmpty>No countries found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {availableCountries
                          .filter(country => !assignedCountries.some(assigned => assigned.id === country.id))
                          .map((country) => (
                          <CommandItem
                            key={country.id}
                            value={country.name}
                            onSelect={() => {
                              setAssignedCountries(prev => [...prev, country]);
                              setCountrySelectOpen(false);
                            }}
                          >
                            <Check className="mr-2 h-4 w-4 opacity-0" />
                            <span className="mr-2">{country.flag_emoji}</span>
                            {country.name} ({country.code})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading countries...</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Update Language
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
