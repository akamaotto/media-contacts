"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { CountryAssignment } from "./country-assignment";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Region } from "@/lib/types/geography";

// Validation schema for region editing
const editRegionSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  category: z.enum([
    "continent",
    "subregion", 
    "economic",
    "political",
    "organization",
    "trade_agreement",
    "geographical",
    "other"
  ]),
  parentCode: z.string().optional(),
  description: z.string().optional(),
});

type EditRegionFormData = z.infer<typeof editRegionSchema>;

interface EditRegionSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCountryChange?: () => void;
  region: Region;
  availableParentRegions?: { code: string; name: string }[];
}

export function EditRegionSheet({ 
  isOpen, 
  onOpenChange, 
  onSuccess,
  onCountryChange,
  region,
  availableParentRegions = []
}: EditRegionSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditRegionFormData>({
    resolver: zodResolver(editRegionSchema) as any,
    defaultValues: {
      name: "",
      category: "continent" as const,
      parentCode: "",
      description: "",
    },
  });

  // Reset form when region changes
  useEffect(() => {
    if (region) {
      form.reset({
        name: region.name,
        category: region.category,
        parentCode: region.parentCode || "__none__",
        description: region.description || "",
      });
    }
  }, [region, form]);

  const onSubmit = async (data: EditRegionFormData) => {
    try {
      setIsSubmitting(true);
      
      // Clean up data - handle special "no parent" value
      const cleanData = {
        ...data,
        parentCode: data.parentCode === "__none__" ? undefined : data.parentCode || undefined,
        description: data.description || undefined,
      };

      const response = await fetch(`/api/regions/${region.code}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update region");
      }

      toast.success("Region updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating region:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update region");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out the current region from parent options to prevent circular references
  const filteredParentRegions = availableParentRegions.filter(
    parent => parent.code !== region.code
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Region</SheetTitle>
          <SheetDescription>
            Update the details for {region.name} ({region.code}).
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 px-6">
            {/* Region Code - Read Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Region Code
              </label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
                {region.code}
              </div>
              <p className="text-xs text-muted-foreground">
                Region code cannot be changed
              </p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., European Union, Southeast Asia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="continent">Continent</SelectItem>
                      <SelectItem value="subregion">Subregion</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                      <SelectItem value="economic">Economic Group</SelectItem>
                      <SelectItem value="political">Political Alliance</SelectItem>
                      <SelectItem value="trade_agreement">Trade Agreement</SelectItem>
                      <SelectItem value="geographical">Geographical</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {filteredParentRegions.length > 0 && (
              <FormField
                control={form.control}
                name="parentCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent region (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No parent region</SelectItem>
                        {filteredParentRegions.map((parentRegion) => (
                          <SelectItem key={parentRegion.code} value={parentRegion.code}>
                            {parentRegion.name} ({parentRegion.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optional parent region for subregions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description of the region..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description or additional information
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country Assignment Section */}
            <CountryAssignment 
              regionCode={region.code}
              disabled={isSubmitting}
              onRefreshNeeded={onCountryChange}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Region
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
