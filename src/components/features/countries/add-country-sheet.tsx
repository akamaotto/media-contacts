"use client";

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CountryForm } from './country-form';
import { toast } from 'sonner';

interface AddCountrySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

export function AddCountrySheet({ isOpen, onOpenChange, onSuccess }: AddCountrySheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CountryFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/countries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create country');
      }

      toast.success('Country created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create country:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create country');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Country</SheetTitle>
        </SheetHeader>
        <CountryForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </SheetContent>
    </Sheet>
  );
}
