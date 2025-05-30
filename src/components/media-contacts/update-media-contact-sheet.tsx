"use client";

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { upsertMediaContactAction, type UpsertMediaContactActionState } from "@/backend/media-contacts/actions";
import { type UpsertMediaContactData } from "@/backend/media-contacts/repository";
import { type MediaContactTableItem } from "@/components/media-contacts/columns"; // Corrected import path
import { getCountries, type Country } from '@/app/actions/country-actions';

// Zod schema for form validation - Beats and Outlets are now comma-separated strings
const mediaContactUpsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  title: z.string().min(1, { message: "Title is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), 
  email_verified_status: z.boolean().optional(),
  bio: z.string().optional().nullable(),
  socials: z.string().optional().nullable(), // Comma-separated string for social media links
  countryIds: z.array(z.string().uuid()).optional(), // Stays as array of UUIDs for multi-select popover
  beats: z.string().optional().nullable(), // Comma-separated string for beats
  outlets: z.string().optional().nullable(), // Comma-separated string for outlets
});

type MediaContactUpsertFormData = z.infer<typeof mediaContactUpsertSchema>;

interface UpdateMediaContactSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact?: MediaContactTableItem | null;
  onContactUpdate: () => void;
}

export function UpdateMediaContactSheet({
  isOpen,
  onOpenChange,
  contact,
  onContactUpdate,
}: UpdateMediaContactSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [isCountriesPopoverOpen, setIsCountriesPopoverOpen] = useState(false);
  const [searchCountryTerm, setSearchCountryTerm] = useState('');
  const [formActionFeedback, setFormActionFeedback] = useState<UpsertMediaContactActionState | null>(null);

  const form = useForm<MediaContactUpsertFormData>({
    resolver: zodResolver(mediaContactUpsertSchema),
    defaultValues: {
      name: '',
      title: '',
      email: '',
      bio: '',
      socials: '',
      email_verified_status: false,
      countryIds: [],
      beats: "",
      outlets: "",
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const countriesData = await getCountries();
        setAllCountries(countriesData);
      } catch (error) {
        console.error("Failed to fetch countries", error);
        // TODO: Display error to user for countries fetching
      }
    }
    if (isOpen) {
      fetchData();
      setFormActionFeedback(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (contact) { 
        form.reset({
          name: contact.name || '',
          title: contact.title || "",
          email: contact.email || "",
          bio: contact.bio || "",
          socials: contact.socials?.join(', ') || "",
          email_verified_status: contact.email_verified_status === null ? false : contact.email_verified_status,
          countryIds: contact.countries?.map((c: any) => c.id) || [],
          beats: contact.beats?.map((b: any) => b.name).join(', ') || "", // Changed from beatIds to beats (names)
          outlets: contact.outlets?.map((o: any) => o.name).join(', ') || "", // Changed from outletIds to outlets (names)
        });
      } else { 
        form.reset({
          name: '',
          title: '',
          email: '',
          bio: '',
          socials: '',
          email_verified_status: false,
          countryIds: [],
          beats: "",
          outlets: "",
        });
      }
    }
  }, [contact, form, isOpen]);

  const onSubmit = async (data: MediaContactUpsertFormData) => {
    setIsSubmitting(true);
    setFormActionFeedback(null);

    const payload: UpsertMediaContactData = {
      id: contact?.id,
      name: data.name ?? '', 
      title: data.title ?? '', 
      email: data.email ?? '', 
      email_verified_status: data.email_verified_status,
      bio: data.bio || null,
      socials: data.socials ? data.socials.split(',').map(s => s.trim()).filter(s => s.length > 0) : [],
      countryIds: data.countryIds || [],
      beats: data.beats ? data.beats.split(',').map(s => s.trim()).filter(s => s.length > 0) : [],
      outlets: data.outlets ? data.outlets.split(',').map(s => s.trim()).filter(s => s.length > 0) : [],
    };

    const result = await upsertMediaContactAction(payload);
    setFormActionFeedback(result);
    setIsSubmitting(false);

    if (result.data && !result.errors) { 
      onContactUpdate();
      onOpenChange(false); 
    }
  };

  const sheetTitle = contact ? "Edit Media Contact" : "Add New Media Contact";
  const sheetDescription = contact ? "Update the details of the media contact." : "Fill in the form to add a new media contact.";
  const submitButtonText = contact ? "Save Changes" : "Add Contact";

  const handleClose = () => {
    form.reset();
    setFormActionFeedback(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        {formActionFeedback?.errors?._form && (
          <div className="mx-6 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
            <p className="font-semibold">Error:</p>
            <p>{formActionFeedback.errors._form[0]}</p> {/* Display the first form-level error */}
          </div>
        )}
        {formActionFeedback?.message && !formActionFeedback.errors && (
          <div className="mx-6 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">
            <p>{formActionFeedback.message}</p>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow px-6">
            <div className="space-y-4 py-6">
              {/* Form Fields */}
              <div>
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" {...form.register('name')} className="mt-1" />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                <Input id="title" {...form.register('title')} className="mt-1" />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} className="mt-1" />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2 pt-1">
                <Controller
                  name="email_verified_status"
                  control={form.control}
                  render={({ field }) => (
                    <input 
                      type="checkbox" 
                      id="email_verified_status"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  )}
                />
                <Label htmlFor="email_verified_status" className="text-sm font-medium text-gray-700 select-none">
                  Email Verified
                </Label>
              </div>

              {/* Countries Multi-Select Popover - Stays as is */}
              <div>
                <Label>Countries</Label>
                <Controller
                  name="countryIds"
                  control={form.control}
                  render={({ field }) => (
                    <Popover open={isCountriesPopoverOpen} onOpenChange={setIsCountriesPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isCountriesPopoverOpen}
                          className="w-full justify-between mt-1 font-normal"
                        >
                          <span className="truncate">
                            {field.value && field.value.length > 0
                              ? field.value
                                  .map(id => allCountries.find(c => c.id === id)?.name)
                                  .filter(Boolean)
                                  .map(name => <Badge key={name} variant="secondary" className="mr-1 mb-1">{name}</Badge>)
                              : "Select countries..."}
                          </span>
                          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search country..." 
                            value={searchCountryTerm}
                            onValueChange={setSearchCountryTerm}
                          />
                          <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                              {allCountries
                                .filter(country => 
                                  country.name.toLowerCase().includes(searchCountryTerm.toLowerCase())
                                )
                                .map((country) => (
                                  <CommandItem
                                    key={country.id}
                                    value={country.name} 
                                    onSelect={() => {
                                      const currentValues = field.value || [];
                                      const newValue = currentValues.includes(country.id)
                                        ? currentValues.filter((id) => id !== country.id)
                                        : [...currentValues, country.id];
                                      field.onChange(newValue);
                                      setSearchCountryTerm('');
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value?.includes(country.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {country.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.countryIds && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.countryIds.message}</p>
                )}
              </div>

              {/* Beats - Changed to Text Input */}
              <div>
                <Label htmlFor="beats">Beats (comma-separated)</Label>
                <Input id="beats" {...form.register('beats')} className="mt-1" />
                {form.formState.errors.beats && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.beats.message}</p>
                )}
              </div>

              {/* Outlets - Changed to Text Input */}
              <div>
                <Label htmlFor="outlets">Outlets (comma-separated)</Label>
                <Input id="outlets" {...form.register('outlets')} className="mt-1" />
                {form.formState.errors.outlets && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.outlets.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" {...form.register('bio')} className="mt-1" rows={3} />
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.bio.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="socials">Socials (comma-separated)</Label>
                <Input id="socials" {...form.register('socials')} className="mt-1" />
                {form.formState.errors.socials && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.socials.message}</p>
                )}
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="p-6 border-t bg-background">
            <div className="flex justify-between w-full">
              <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
              </Button>
            </div>
          </SheetFooter>
        </form>
        {/* Fallback content removed as form is always rendered, content visibility handled by isOpen prop on Sheet */}
      </SheetContent>
    </Sheet>
  );
}
