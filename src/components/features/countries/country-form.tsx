"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { getRegionsForCountryForm, getLanguagesForCountryForm, type Country } from '@/backend/countries/actions';

// Form validation schema
const countryFormSchema = z.object({
  name: z.string().min(1, 'Country name is required'),
  code: z.string().length(2, 'Country code must be exactly 2 characters'),
  phone_code: z.string().min(1, 'Phone code is required'),
  capital: z.string().min(1, 'Capital is required'),
  flag_emoji: z.string().min(1, 'Flag emoji is required'),
  regionIds: z.array(z.string()),
  languageIds: z.array(z.string()),
});

type CountryFormData = z.infer<typeof countryFormSchema>;

interface CountryFormProps {
  country?: Country;
  onSubmit: (data: CountryFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}



interface SelectOption {
  value: string;
  label: string;
}

export function CountryForm({ country, onSubmit, onCancel, isSubmitting = false }: CountryFormProps) {
  const [regions, setRegions] = useState<SelectOption[]>([]);
  const [languages, setLanguages] = useState<SelectOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const form = useForm<CountryFormData>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: {
      name: country?.name || '',
      code: country?.code || '',
      phone_code: country?.phone_code || '',
      capital: country?.capital || '',
      flag_emoji: country?.flag_emoji || '',
      regionIds: country?.regions?.map(r => r.id) || [],
      languageIds: country?.languages?.map(l => l.id) || [],
    }
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const selectedRegionIds = watch('regionIds');
  const selectedLanguageIds = watch('languageIds');

  // Load regions and languages on component mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        
        const [regionsData, languagesData] = await Promise.all([
          getRegionsForCountryForm(),
          getLanguagesForCountryForm()
        ]);

        setRegions(regionsData.map(region => ({
          value: region.id,
          label: `${region.name} (${region.code})`
        })));

        setLanguages(languagesData.map(language => ({
          value: language.id,
          label: `${language.name} (${language.code})`
        })));
      } catch (error) {
        console.error('Failed to load form options:', error);
        toast.error('Failed to load regions and languages');
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const handleFormSubmit = async (data: CountryFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to save country');
    }
  };

  if (isLoadingOptions) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading form...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Country Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., United States"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Country Code *</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="e.g., US"
                maxLength={2}
                className="uppercase"
                disabled={isSubmitting}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_code">Phone Code *</Label>
              <Input
                id="phone_code"
                {...register('phone_code')}
                placeholder="e.g., +1"
                disabled={isSubmitting}
              />
              {errors.phone_code && (
                <p className="text-sm text-red-600">{errors.phone_code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital">Capital *</Label>
              <Input
                id="capital"
                {...register('capital')}
                placeholder="e.g., Washington, D.C."
                disabled={isSubmitting}
              />
              {errors.capital && (
                <p className="text-sm text-red-600">{errors.capital.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="flag_emoji">Flag Emoji *</Label>
              <Input
                id="flag_emoji"
                {...register('flag_emoji')}
                placeholder="e.g., 🇺🇸"
                maxLength={4}
                disabled={isSubmitting}
              />
              {errors.flag_emoji && (
                <p className="text-sm text-red-600">{errors.flag_emoji.message}</p>
              )}
            </div>
          </div>

          {/* Relationships */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Regions</Label>
              <MultiSelect
                options={regions}
                selected={selectedRegionIds || []}
                onChange={(values: string[]) => setValue('regionIds', values)}
                placeholder="Select regions..."
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Select the geographical regions this country belongs to
              </p>
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <MultiSelect
                options={languages}
                selected={selectedLanguageIds || []}
                onChange={(values: string[]) => setValue('languageIds', values)}
                placeholder="Select languages..."
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Select the official or commonly spoken languages in this country
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
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
              {country ? 'Update Country' : 'Create Country'}
            </Button>
          </div>
        </form>
    </div>
  );
}
