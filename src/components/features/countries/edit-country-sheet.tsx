"use client";

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CountryForm } from './country-form';
import { toast } from 'sonner';
import type { Country } from './types';

interface EditCountrySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  country: Country;
}

interface CountryFormData {
  name: string;
  code: string;
  phone_code: string;
  capital: string;
  flag_emoji: string;
  regionIds: string[];
  languageIds: string[];
}

export function EditCountrySheet({ isOpen, onOpenChange, onSuccess, country }: EditCountrySheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CountryFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/countries/${country.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update country');
      }

      toast.success('Country updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update country:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update country');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Country</SheetTitle>
        </SheetHeader>
        <CountryForm
          country={country}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </SheetContent>
    </Sheet>
  );
}
