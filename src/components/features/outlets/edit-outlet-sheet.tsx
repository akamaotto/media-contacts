'use client';

import { useState, useEffect, useRef } from 'react';
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
import type { Outlet } from '@/features/outlets/lib/types';

const outletSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Outlet name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  publisherId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  countryIds: z.array(z.string()).optional(),
});

type OutletFormData = z.infer<typeof outletSchema>;

interface EditOutletSheetProps {
  outlet: Outlet;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedId?: string | null; // optional stable id from parent
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

export function EditOutletSheet({ outlet, isOpen, onOpenChange, onSuccess, selectedId }: EditOutletSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  // Stabilize outlet ID to avoid transient undefined during re-renders
  const outletIdRef = useRef<string | null>(selectedId ?? outlet?.id ?? null);
  const initialIdRef = useRef<string | null>(selectedId ?? outlet?.id ?? null);
  // Capture and preserve ID when available; never overwrite with null/undefined
  useEffect(() => {
    if (outlet?.id) {
      outletIdRef.current = outlet.id;
      if (!initialIdRef.current) initialIdRef.current = outlet.id;
      console.debug('[EditOutletSheet] effect: captured outlet id (prop)', {
        propId: outlet.id,
        outletIdRef: outletIdRef.current,
        initialIdRef: initialIdRef.current,
      });
    }
  }, [outlet?.id]);
  useEffect(() => {
    if (selectedId) {
      outletIdRef.current = selectedId;
      if (!initialIdRef.current) initialIdRef.current = selectedId;
      console.debug('[EditOutletSheet] effect: captured outlet id (selectedId)', {
        selectedId,
        outletIdRef: outletIdRef.current,
        initialIdRef: initialIdRef.current,
      });
    }
  }, [selectedId]);
  useEffect(() => {
    console.debug('[EditOutletSheet] mount', { id: outlet?.id, selectedId, outlet });
  }, []);
  useEffect(() => {
    if (isOpen) {
      console.debug('[EditOutletSheet] opened', { id: outlet?.id, outlet });
    }
  }, [isOpen]);

  const form = useForm<OutletFormData>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      id: (selectedId ?? outlet.id) || '',
      name: outlet.name,
      description: outlet.description || '',
      website: outlet.website || '',
      publisherId: outlet.publisher?.id || 'none',
      categoryIds: outlet.categories?.map(cat => cat.id) || [],
      countryIds: outlet.countries?.map(c => c.id) || [],
    },
  });

  // Reset form when outlet or selectedId changes
  useEffect(() => {
    if (outlet) {
      const nextId = (selectedId ?? outlet.id) || '';
      form.reset({
        id: nextId,
        name: outlet.name,
        description: outlet.description || '',
        website: outlet.website || '',
        publisherId: outlet.publisher?.id || 'none',
        categoryIds: outlet.categories?.map(cat => cat.id) || [],
        countryIds: outlet.countries?.map(c => c.id) || [],
      });
      console.debug('[EditOutletSheet] form.reset with id', nextId);
    }
  }, [outlet, selectedId, form]);

  // Keep RHF id in sync if refs/props change
  useEffect(() => {
    const nextId = (selectedId ?? outlet?.id ?? outletIdRef.current ?? initialIdRef.current ?? '') as string;
    const current = form.getValues('id') || '';
    if (nextId && current !== nextId) {
      form.setValue('id', nextId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      console.debug('[EditOutletSheet] form.setValue("id") sync', { nextId, current });
    }
  }, [selectedId, outlet?.id]);

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

  const onInvalid = (errors: any) => {
    console.error('[EditOutletSheet] form validation errors:', errors);
    const first = (errors && Object.values(errors)[0]) as any;
    const message = first?.message || 'Please fix the highlighted errors and try again.';
    toast.error(message);
  };

  const onSubmit = async (data: OutletFormData) => {
    try {
      setIsSubmitting(true);
      // Diagnostics
      console.debug('[EditOutletSheet] onSubmit outlet info:', {
        idFromProp: outlet?.id,
        idFromRef: outletIdRef.current,
        idFromSelected: selectedId,
        idFromForm: (form.getValues('id') || '').trim(),
        typeofPropId: typeof (outlet as any)?.id,
        outlet,
      });
      // Guard against missing/empty outlet ID which would cause a 405 on /api/outlets (no PUT)
      const idFromForm = (form.getValues('id') || '').trim();
      const stableId = idFromForm
        || ((outletIdRef.current ?? initialIdRef.current) ?? '').trim()
        || (outlet?.id || '').trim();
      console.debug('[EditOutletSheet] resolved stableId', {
        idFromForm,
        idFromRef: outletIdRef.current,
        idFromInitial: initialIdRef.current,
        stableId,
      });
      if (!stableId) {
        console.error('[EditOutletSheet] Missing/empty outlet.id during submit:', { outlet, idFromRef: outletIdRef.current });
        toast.error('Invalid outlet (missing ID). Please refresh and try again.');
        return;
      }

      const requestUrl = `/api/outlets/${encodeURIComponent(stableId)}`;
      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: stableId,
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          publisherId: data.publisherId === 'none' ? undefined : data.publisherId || undefined,
          categoryIds: data.categoryIds || [],
          countryIds: data.countryIds || [],
        }),
      });

      if (!response.ok) {
        // Do not assume the response has a JSON body. Try text first and parse conditionally.
        const status = response.status;
        const statusText = response.statusText;
        let errorMessage: string | undefined;
        try {
          const text = await response.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              errorMessage = (data as any)?.error || text;
            } catch {
              errorMessage = text; // Non-JSON body; surface raw text
            }
          }
        } catch {
          // ignore parsing errors
        }

        if (!errorMessage) {
          // Fallback based on HTTP status
          if (status === 401) {
            errorMessage = 'Unauthorized. Please log in and try again.';
          } else if (status === 404) {
            errorMessage = 'Outlet or related records not found.';
          } else if (status === 409) {
            errorMessage = 'An outlet with this name already exists.';
          } else if (status === 405) {
            errorMessage = `Method not allowed. This often means the request URL is wrong (missing outlet ID). Tried: ${requestUrl}`;
          } else {
            errorMessage = `Failed to update outlet (HTTP ${status}${statusText ? ` ${statusText}` : ''})`;
          }
        }

        throw new Error(errorMessage);
      }

      // Success path: body is not needed; avoid parsing JSON to prevent empty-body issues.
      toast.success('Outlet updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating outlet:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update outlet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
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
          <SheetTitle>Edit Outlet</SheetTitle>
          <SheetDescription>
            Update the outlet information, categories, and countries.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6 mt-6 px-6">
            {/* Hidden ID field to keep id in RHF state */}
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || loadingData}>
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
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => console.debug('[EditOutletSheet] submit button clicked')}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Outlet
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}