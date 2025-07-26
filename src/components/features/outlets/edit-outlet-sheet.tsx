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
import type { Outlet } from '@/backend/outlets/actions';

const outletSchema = z.object({
  name: z.string().min(1, 'Outlet name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  publisherId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

type OutletFormData = z.infer<typeof outletSchema>;

interface EditOutletSheetProps {
  outlet: Outlet;
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

export function EditOutletSheet({ outlet, isOpen, onOpenChange, onSuccess }: EditOutletSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const form = useForm<OutletFormData>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      name: outlet.name,
      description: outlet.description || '',
      website: outlet.website || '',
      publisherId: outlet.publisher?.id || 'none',
      categoryIds: outlet.categories?.map(cat => cat.id) || [],
    },
  });

  // Reset form when outlet changes
  useEffect(() => {
    if (outlet) {
      form.reset({
        name: outlet.name,
        description: outlet.description || '',
        website: outlet.website || '',
        publisherId: outlet.publisher?.id || 'none',
        categoryIds: outlet.categories?.map(cat => cat.id) || [],
      });
    }
  }, [outlet, form]);

  // Fetch publishers and categories when sheet opens
  useEffect(() => {
    if (isOpen) {
      fetchPublishersAndCategories();
    }
  }, [isOpen]);

  const fetchPublishersAndCategories = async () => {
    try {
      setLoadingData(true);
      
      const [publishersResponse, categoriesResponse] = await Promise.all([
        fetch('/api/publishers'),
        fetch('/api/categories')
      ]);

      if (publishersResponse.ok) {
        const publishersData = await publishersResponse.json();
        setPublishers(publishersData);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load publishers and categories');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: OutletFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/outlets/${outlet.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
          publisherId: data.publisherId === 'none' ? undefined : data.publisherId || undefined,
          categoryIds: data.categoryIds || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update outlet');
      }

      const result = await response.json();
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

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Outlet</SheetTitle>
          <SheetDescription>
            Update the outlet information and categories.
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
                Update Outlet
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}