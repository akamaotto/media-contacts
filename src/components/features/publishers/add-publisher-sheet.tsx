'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const publisherSchema = z.object({
  name: z.string().min(1, 'Publisher name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  outletIds: z.array(z.string()).optional(),
});

type PublisherFormData = z.infer<typeof publisherSchema>;

interface AddPublisherSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Outlet {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
}

export function AddPublisherSheet({ isOpen, onOpenChange, onSuccess }: AddPublisherSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);

  const form = useForm<PublisherFormData>({
    resolver: zodResolver(publisherSchema),
    defaultValues: {
      name: '',
      description: '',
      website: '',
      outletIds: [],
    },
  });

  // Fetch outlets for selection
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await fetch('/api/outlets');
        if (response.ok) {
          const outletsData = await response.json();
          // Filter outlets that don't have a publisher assigned
          const availableOutlets = outletsData.filter((outlet: any) => !outlet.publisherId);
          setOutlets(availableOutlets);
        }
      } catch (error) {
        console.error('Failed to fetch outlets:', error);
      }
    };

    if (isOpen) {
      fetchOutlets();
    }
  }, [isOpen]);

  const onSubmit = async (data: PublisherFormData) => {
    try {
      setIsSubmitting(true);

      // Create publisher first
      const response = await fetch('/api/publishers', {
        method: 'POST',
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
        throw new Error(errorData.error || 'Failed to create publisher');
      }

      const result = await response.json();

      // Associate selected outlets with the publisher
      if (selectedOutlets.length > 0) {
        const outletUpdatePromises = selectedOutlets.map(outletId => 
          fetch(`/api/outlets/${outletId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              publisherId: result.id,
            }),
          })
        );

        await Promise.all(outletUpdatePromises);
      }

      toast.success('Publisher created successfully');
      form.reset();
      setSelectedOutlets([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating publisher:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create publisher');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle outlet selection
  const handleOutletToggle = (outletId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedOutlets, outletId]
      : selectedOutlets.filter(id => id !== outletId);
    
    setSelectedOutlets(newSelection);
    form.setValue('outletIds', newSelection);
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
      if (!open) {
        form.reset();
        setSelectedOutlets([]);
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Publisher</SheetTitle>
          <SheetDescription>
            Create a new publisher to organize media outlets.
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

            {/* Outlet Selection */}
            {outlets.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Associate Outlets (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Select existing outlets to associate with this publisher
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                    {outlets.map((outlet) => (
                      <div key={outlet.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`outlet-${outlet.id}`}
                          checked={selectedOutlets.includes(outlet.id)}
                          onCheckedChange={(checked) => handleOutletToggle(outlet.id, checked as boolean)}
                          disabled={isSubmitting}
                        />
                        <Label 
                          htmlFor={`outlet-${outlet.id}`} 
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <div>
                            <div className="font-medium">{outlet.name}</div>
                            {outlet.description && (
                              <div className="text-xs text-muted-foreground">
                                {outlet.description.length > 60 
                                  ? `${outlet.description.substring(0, 60)}...` 
                                  : outlet.description
                                }
                              </div>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedOutlets.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedOutlets.length} outlet{selectedOutlets.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </div>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Publisher
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}