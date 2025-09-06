"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { CountryAssignment } from "./country-assignment";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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

// Validation schema for region creation
const addRegionSchema = z.object({
  code: z.string()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must be at most 10 characters")
    .regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores"),
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

type AddRegionFormData = z.infer<typeof addRegionSchema>;

interface AddRegionSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableParentRegions?: { code: string; name: string }[];
}

export function AddRegionSheet({ 
  isOpen, 
  onOpenChange, 
  onSuccess,
  availableParentRegions = []
}: AddRegionSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddRegionFormData>({
    resolver: zodResolver(addRegionSchema) as any,
    defaultValues: {
      code: "",
      name: "",
      category: "continent" as const,
      parentCode: "",
      description: "",
    },
  });

  const onSubmit = async (data: AddRegionFormData) => {
    try {
      setIsSubmitting(true);
      
      // Clean up data - handle special "no parent" value
      const cleanData = {
        ...data,
        parentCode: data.parentCode === "__none__" ? undefined : data.parentCode || undefined,
        description: data.description || undefined,
      };

      const response = await fetch("/api/regions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create region");
      }

      toast.success("Region created successfully!");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating region:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create region");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Region</SheetTitle>
          <SheetDescription>
            Create a new geographical or organizational region.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 px-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region Code *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., EU, ASEAN, NAF" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (2-10 characters, uppercase letters, numbers, underscores)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {availableParentRegions.length > 0 && (
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
                        {availableParentRegions.map((region) => (
                          <SelectItem key={region.code} value={region.code}>
                            {region.name} ({region.code})
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Countries</label>
              <p className="text-xs text-muted-foreground mb-3">
                Assign countries to this region. You can add countries after creating the region.
              </p>
              <div className="p-3 border rounded-md bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  Countries can be assigned after the region is created.
                </span>
              </div>
            </div>

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
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Region
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
