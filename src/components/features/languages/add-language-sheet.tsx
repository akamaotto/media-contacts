"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

// Form validation schema
const languageFormSchema = z.object({
  code: z.string().min(2, 'Language code must be at least 2 characters').max(3, 'Language code must be at most 3 characters'),
  name: z.string().min(1, 'Language name is required'),
});

type LanguageFormData = z.infer<typeof languageFormSchema>;

interface AddLanguageSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddLanguageSheet({ isOpen, onOpenChange, onSuccess }: AddLanguageSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LanguageFormData>({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      code: '',
      name: '',
    }
  });

  const handleFormSubmit: SubmitHandler<LanguageFormData> = async (data) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/languages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create language');
      }

      toast.success('Language created successfully');
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Failed to create language:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create language');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Language</SheetTitle>
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
                <p className="text-sm text-red-600">{errors.code.message}</p>
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
                <p className="text-sm text-red-600">{errors.name.message}</p>
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
              Add Language
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
