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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
// Local minimal Publisher type for this sheet
type Publisher = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
};

const publisherSchema = z.object({
  name: z.string().min(1, 'Publisher name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type PublisherFormData = z.infer<typeof publisherSchema>;

interface EditPublisherSheetProps {
  publisher: Publisher;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPublisherSheet({ publisher, isOpen, onOpenChange, onSuccess }: EditPublisherSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PublisherFormData>({
    resolver: zodResolver(publisherSchema),
    defaultValues: {
      name: '',
      description: '',
      website: '',
    },
  });

  // Update form when publisher changes
  useEffect(() => {
    if (publisher) {
      form.reset({
        name: publisher.name,
        description: publisher.description || '',
        website: publisher.website || '',
      });
    }
  }, [publisher, form]);

  const onSubmit = async (data: PublisherFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/publishers/${publisher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          website: data.website || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update publisher');
      }

      const result = await response.json();
      toast.success('Publisher updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating publisher:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update publisher');
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
          <SheetTitle>Edit Publisher</SheetTitle>
          <SheetDescription>
            Update the publisher information.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publisher Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., New York Times Company"
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
                      placeholder="Brief description of the publisher..."
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
                Update Publisher
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}