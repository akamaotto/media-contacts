'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const outletSchema = z.object({
  name: z.string().min(1, 'Outlet name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  publisherId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  countryIds: z.array(z.string()).optional(),
});

type OutletFormData = z.infer<typeof outletSchema>;

interface AddOutletSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Publisher {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  color?: string | null;
}

interface Country {
  id: string;
  name: string;
  code?: string | null;
  flag_emoji?: string | null;
}

export function AddOutletSheet({ isOpen, onOpenChange, onSuccess }: AddOutletSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const form = useForm<OutletFormData>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      name: '',
      description: '',
      website: '',
      publisherId: 'none',
      categoryIds: [],
      countryIds: [],
    },
  });

  // Fetch publishers, categories and countries when sheet opens
  useEffect(() => {
    if (isOpen) {
      fetchPublishersAndCategories();
    }
  }, [isOpen]);

  const fetchPublishersAndCategories = async () => {
    try {
      setLoadingData(true);
      
      const [publishersResponse, categoriesResponse, countriesResponse] = await Promise.all([
        fetch('/api/publishers'),
        fetch('/api/categories'),
        fetch('/api/countries'),
      ]);

      if (publishersResponse.ok) {
        const publishersPayload = await publishersResponse.json();
        // Extract data from paginated result
        const publishersData = publishersPayload && typeof publishersPayload === 'object' && 'data' in publishersPayload 
          ? Array.isArray(publishersPayload.data) ? publishersPayload.data : [] 
          : Array.isArray(publishersPayload) ? publishersPayload : [];
        setPublishers(publishersData);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }

      if (countriesResponse.ok) {
        const countriesData = await countriesResponse.json();
        setCountries(countriesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load publishers, categories, and countries');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: OutletFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/outlets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          publisherId: data.publisherId === 'none' ? undefined : data.publisherId || undefined,
          categoryIds: data.categoryIds || [],
          countryIds: data.countryIds || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create outlet');
      }

      const result = await response.json();
      toast.success('Outlet created successfully');
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating outlet:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create outlet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
      if (!open) {
        form.reset();
      }
    }
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategories = form.getValues('categoryIds') || [];
    if (checked) {
      form.setValue('categoryIds', [...currentCategories, categoryId]);
    } else {
      form.setValue('categoryIds', currentCategories.filter(id => id !== categoryId));
    }
  };

  const handleCountryChange = (countryId: string, checked: boolean) => {
    const current = form.getValues('countryIds') || [];
    if (checked) {
      form.setValue('countryIds', [...current, countryId]);
    } else {
      form.setValue('countryIds', current.filter(id => id !== countryId));
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Outlet</SheetTitle>
          <SheetDescription>
            Create a new media outlet to organize your contacts.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outlet Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., TechCrunch"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the outlet..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publisherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publisher</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting || loadingData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a publisher (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No publisher</SelectItem>
                      {publishers.map((publisher) => (
                        <SelectItem key={publisher.id} value={publisher.id}>
                          {publisher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {categories.length > 0 && (
              <FormField
                control={form.control}
                name="categoryIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Categories</FormLabel>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={form.watch('categoryIds')?.includes(category.id) || false}
                            onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                            disabled={isSubmitting}
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {countries.length > 0 && (
              <FormField
                control={form.control}
                name="countryIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Countries</FormLabel>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {countries.map((country) => (
                        <div key={country.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country.id}`}
                            checked={form.watch('countryIds')?.includes(country.id) || false}
                            onCheckedChange={(checked) => handleCountryChange(country.id, checked as boolean)}
                            disabled={isSubmitting}
                          />
                          <label
                            htmlFor={`country-${country.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <span className="mr-1">{country.flag_emoji || ''}</span>
                            {country.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loadingData}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Outlet
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}