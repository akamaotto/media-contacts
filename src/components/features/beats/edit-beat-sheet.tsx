'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2, Save, X } from 'lucide-react';

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

import { getAllCategories } from '@/backend/categories/actions';
import type { Beat } from '@/backend/beats/actions';
import type { Category } from '@/backend/categories/actions';

const beatFormSchema = z.object({
  name: z.string().min(1, 'Beat name is required').max(100, 'Beat name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  categoryIds: z.array(z.string()).optional(),
});

type BeatFormValues = z.infer<typeof beatFormSchema>;

interface EditBeatSheetProps {
  beat: Beat;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditBeatSheet({ beat, isOpen, onOpenChange, onSuccess }: EditBeatSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [openCategorySelect, setOpenCategorySelect] = useState(false);

  const form = useForm({
    resolver: zodResolver(beatFormSchema),
    defaultValues: {
      name: beat.name || '',
      description: beat.description || '',
      categoryIds: beat.categories?.map(cat => cat.id) || [],
    } as any,
  });

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAllCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Reset form when beat changes
  useEffect(() => {
    form.reset({
      name: beat.name || '',
      description: beat.description || '',
      categoryIds: beat.categories?.map(cat => cat.id) || [],
    });
  }, [beat, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/beats/${beat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          categoryIds: data.categoryIds || [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update beat');
      }

      toast.success('Beat updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update beat:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update beat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Beat</SheetTitle>
          <SheetDescription>
            Update the beat information and description.
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beat Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Technology, Healthcare, Finance"
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
                      placeholder="Brief description of this beat..."
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
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Popover open={openCategorySelect} onOpenChange={setOpenCategorySelect}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCategorySelect}
                            className="w-full justify-between"
                            disabled={isSubmitting}
                          >
                            {field.value && field.value.length > 0
                              ? `${field.value.length} categor${field.value.length === 1 ? 'y' : 'ies'} selected`
                              : "Select categories..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search categories..." />
                            <CommandEmpty>No categories found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {categories.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  onSelect={() => {
                                    const currentIds = field.value || [];
                                    const isSelected = currentIds.includes(category.id);
                                    const newIds = isSelected
                                      ? currentIds.filter((id: string) => id !== category.id)
                                      : [...currentIds, category.id];
                                    field.onChange(newIds);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value?.includes(category.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex items-center space-x-2">
                                    {category.color && (
                                      <div 
                                        className="w-3 h-3 rounded-full border border-gray-200"
                                        style={{ backgroundColor: category.color }}
                                      />
                                    )}
                                    <span>{category.name}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Selected categories display */}
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((categoryId: string) => {
                            const category = categories.find(c => c.id === categoryId);
                            if (!category) return null;
                            return (
                              <Badge 
                                key={categoryId} 
                                variant="outline"
                                className="text-xs"
                                style={category.color ? { borderColor: category.color, color: category.color } : {}}
                              >
                                {category.name}
                                <button
                                  type="button"
                                  className="ml-1 hover:bg-gray-200 rounded-full"
                                  onClick={() => {
                                    const newIds = field.value.filter((id: string) => id !== categoryId);
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
                Update Beat
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}