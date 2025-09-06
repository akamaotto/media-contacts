'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2, Save, Search, X } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Minimal types used locally to avoid importing backend types
interface Beat { id: string; name: string; description?: string | null }
interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  beats?: Array<{ id: string; name: string; description?: string | null }>;
}

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color (e.g., #3B82F6)').optional(),
  beatIds: z.array(z.string()).optional(),
});

interface EditCategorySheetProps {
  category: Category;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCategorySheet({ category, isOpen, onOpenChange, onSuccess }: EditCategorySheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [openBeatSelect, setOpenBeatSelect] = useState(false);
  const [beatSearchQuery, setBeatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Beat[]>([]);

  const form = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category.name || '',
      description: category.description || '',
      color: category.color || '#3B82F6',
      beatIds: category.beats?.map(beat => beat.id) || [],
    } as any,
  });

  // Fetch all beats on component mount
  useEffect(() => {
    const fetchBeats = async () => {
      try {
        const res = await fetch('/api/beats');
        if (!res.ok) {
          throw new Error('Failed to fetch beats');
        }
        const response = await res.json();
        
        // Handle paginated response structure
        const beatsData = response.data || response;
        const beats = Array.isArray(beatsData) ? beatsData : [];
        
        setBeats(beats);
        setSearchResults(beats); // Initialize search results with all beats
      } catch (error) {
        console.error('Failed to fetch beats:', error);
      }
    };
    
    if (isOpen) {
      fetchBeats();
    }
  }, [isOpen]);

  // Handle beat search
  useEffect(() => {
    const performSearch = async () => {
      if (beatSearchQuery.trim().length < 2) {
        setSearchResults(beats); // Show all beats if query is too short
        return;
      }

      try {
        const res = await fetch(`/api/beats/search?q=${encodeURIComponent(beatSearchQuery)}&limit=20`);
        if (!res.ok) {
          throw new Error('Failed to search beats');
        }
        const response = await res.json();
        const results = response.data || [];
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error('Failed to search beats:', error);
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [beatSearchQuery, beats]);

  // Reset form when category changes
  useEffect(() => {
    form.reset({
      name: category.name || '',
      description: category.description || '',
      color: category.color || '#3B82F6',
      beatIds: category.beats?.map(beat => beat.id) || [],
    });
  }, [category, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          color: data.color?.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update category');
      }

      toast.success('Category updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
    }
  };

  // Predefined color options for quick selection
  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Indigo', value: '#6366F1' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Category</SheetTitle>
          <SheetDescription>
            Update the category information and styling.
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Technology, Business, Health"
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this category..."
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Input
                        placeholder="#3B82F6"
                        {...field}
                        disabled={isSubmitting}
                      />
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className="w-full h-8 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                            style={{ backgroundColor: color.value }}
                            onClick={() => form.setValue('color', color.value)}
                            title={color.name}
                            disabled={isSubmitting}
                          />
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="beatIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associated Beats (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Popover open={openBeatSelect} onOpenChange={setOpenBeatSelect}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBeatSelect}
                            className="w-full justify-between"
                            disabled={isSubmitting}
                          >
                            {field.value && field.value.length > 0
                              ? `${field.value.length} beat${field.value.length === 1 ? '' : 's'} selected`
                              : "Search and select beats..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search beats..." 
                              value={beatSearchQuery}
                              onValueChange={setBeatSearchQuery}
                            />
                            <CommandEmpty>No beats found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {searchResults.map((beat) => (
                                <CommandItem
                                  key={beat.id}
                                  onSelect={() => {
                                    const currentIds = field.value || [];
                                    const isSelected = currentIds.includes(beat.id);
                                    const newIds = isSelected
                                      ? currentIds.filter((id: string) => id !== beat.id)
                                      : [...currentIds, beat.id];
                                    field.onChange(newIds);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value?.includes(beat.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{beat.name}</span>
                                    {beat.description && (
                                      <span className="text-sm text-muted-foreground">{beat.description}</span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Selected beats display */}
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((beatId: string) => {
                            const beat = beats.find(b => b.id === beatId);
                            if (!beat) return null;
                            return (
                              <Badge 
                                key={beatId} 
                                variant="outline"
                                className="text-xs"
                              >
                                {beat.name}
                                <button
                                  type="button"
                                  className="ml-1 hover:bg-gray-200 rounded-full"
                                  onClick={() => {
                                    const newIds = field.value.filter((id: string) => id !== beatId);
                                    field.onChange(newIds);
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Category
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}