"use client";

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  // SheetClose, // Removed unused import
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
import { type MediaContactTableItem } from "@/components/media-contacts/columns";
import { getCountries, type Country } from '@/app/actions/country-actions';
import { TagInput } from "@/components/ui/tag-input";
import { toast } from "@/components/ui/sonner";

// Ensure necessary TypeScript configurations are applied
/** @jsxRuntime automatic */
/** @jsxImportSource react */

/**
 * Enhanced Zod schema for form validation with explicit type handling
 * Following Rust-inspired approach for comprehensive validation
 */
const mediaContactUpsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  title: z.string().min(1, { message: "Title is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), 
  email_verified_status: z.boolean().optional(),
  bio: z.string().optional().nullable(),
  socials: z.array(z.string().url({ message: "Invalid URL format." })).max(5, {
    message: "Maximum 5 social media links allowed."
  }),
  countryIds: z.array(z.string().uuid()).optional(), 
  beats: z.array(z.string().min(2, { message: "Beat must be at least 2 characters." })).max(10, {
    message: "Maximum 10 beats allowed."
  }),
  outlets: z.array(z.string().min(2, { message: "Outlet must be at least 2 characters." })).max(10, {
    message: "Maximum 10 outlets allowed."
  }),
});

/**
 * Type definition inferred from Zod schema for type safety
 */
type MediaContactUpsertFormData = z.infer<typeof mediaContactUpsertSchema>;

/**
 * Type for social platform detection
 */
enum SocialPlatformType {
  Twitter = "twitter",
  LinkedIn = "linkedin",
  Facebook = "facebook",
  Instagram = "instagram",
  Other = "other"
}

/**
 * Utility function to detect social platform type from URL
 * @param url The social media URL to analyze
 * @returns The detected platform type
 */
function detectSocialPlatform(url: string): SocialPlatformType {
  try {
    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) {
      return SocialPlatformType.Twitter;
    }
    if (lowercaseUrl.includes('linkedin.com')) {
      return SocialPlatformType.LinkedIn;
    }
    if (lowercaseUrl.includes('facebook.com') || lowercaseUrl.includes('fb.com')) {
      return SocialPlatformType.Facebook;
    }
    if (lowercaseUrl.includes('instagram.com')) {
      return SocialPlatformType.Instagram;
    }
    return SocialPlatformType.Other;
  } catch (error) {
    console.error('Error detecting social platform:', error);
    return SocialPlatformType.Other;
  }
}

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
  // Form state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [isCountriesPopoverOpen, setIsCountriesPopoverOpen] = useState(false);
  const [searchCountryTerm, setSearchCountryTerm] = useState('');
  const [formActionFeedback, setFormActionFeedback] = useState<UpsertMediaContactActionState | null>(null);
  
  // Tag management state with explicit typing (Rust-inspired)
  const [outletTags, setOutletTags] = useState<string[]>([]);
  const [beatTags, setBeatTags] = useState<string[]>([]);
  const [socialTags, setSocialTags] = useState<string[]>([]);

  const form = useForm<MediaContactUpsertFormData>({
    resolver: zodResolver(mediaContactUpsertSchema),
    defaultValues: {
      name: '',
      title: '',
      email: '',
      bio: '',
      socials: [],
      email_verified_status: false,
      countryIds: [],
      beats: [],
      outlets: [],
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
        // Initialize tag states from contact data with explicit handling for null/undefined
        // Ensure proper type conversion from potential complex objects to string arrays
        const contactOutlets = contact.outlets ? 
          (Array.isArray(contact.outlets) ? contact.outlets.map(o => typeof o === 'string' ? o : o.name || '').filter(Boolean) : []) : [];
        
        const contactBeats = contact.beats ? 
          (Array.isArray(contact.beats) ? contact.beats.map(b => typeof b === 'string' ? b : b.name || '').filter(Boolean) : []) : [];
        
        const contactSocials = contact.socials ? 
          (Array.isArray(contact.socials) ? contact.socials.map(s => typeof s === 'string' ? s : '').filter(Boolean) : []) : [];
        
        setOutletTags(contactOutlets);
        setBeatTags(contactBeats);
        setSocialTags(contactSocials);
        
        form.reset({
          name: contact.name || '',
          title: contact.title || "",
          email: contact.email || "",
          bio: contact.bio || "",
          socials: contactSocials,
          email_verified_status: contact.email_verified_status === null ? false : contact.email_verified_status,
          // Use explicit typing instead of 'any' for countries
          countryIds: contact.countries?.map((c: {id: string}) => c.id) || [],
          beats: contactBeats,
          outlets: contactOutlets,
        });
      } else { 
        form.reset({
          name: '',
          title: '',
          email: '',
          bio: '',
          // Ensure socials is an empty array, not an empty string, for type consistency
          socials: [], 
          email_verified_status: false,
          countryIds: [],
          beats: [],
          outlets: [],
        });
      }
    }
  }, [contact, form, isOpen]);

  /**
   * Handles form submission with comprehensive validation and error handling
   * @param data The form data to be submitted
   */
  const onSubmit = async (data: MediaContactUpsertFormData) => {
    setIsSubmitting(true);
    try {
      // Process data with explicit type handling for robustness
      // Destructure to avoid property collision and explicitly handle each field
      const { email, bio, countryIds, ...restData } = data;
      
      const processedData: UpsertMediaContactData = {
        ...restData,
        // Ensure email is always a string, never undefined
        email: email || '',
        // Ensure bio is a string, never null or undefined
        bio: bio || '',
        // Ensure countryIds is always an array
        countryIds: countryIds || [],
        id: contact?.id,
        // Apply explicit null safety for arrays with spread operator to ensure new array instances
        beats: data.beats ? [...data.beats] : [], 
        outlets: data.outlets ? [...data.outlets] : [],
        socials: data.socials ? [...data.socials] : [],
      };

      const result = await upsertMediaContactAction(processedData);
      setFormActionFeedback(result);

      if (!result.errors) {
        // Use Sonner toast instead of window.alert
        toast.success(contact ? "Contact updated successfully" : "Contact created successfully", {
          description: `${data.name} has been ${contact ? 'updated' : 'added'} to your contacts.`,
          action: {
            label: "View All",
            onClick: () => {
              // This function would navigate to contacts list if needed
              // For now, just close the sheet
            },
          },
        });
        
        // Close sheet and trigger refresh of the table
        onOpenChange(false);
        onContactUpdate();
      } else {
        // Show error toast
        toast.error("Failed to save contact", {
          description: result.errors._form ? result.errors._form[0] : "Please check the form for errors",
        });
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setFormActionFeedback({ errors: { _form: [`An unexpected error occurred: ${error}`] } });
      
      // Show error toast
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sheetTitle = contact ? "Edit Media Contact" : "Add New Media Contact";
  const sheetDescription = contact ? "Update the details of the media contact." : "Fill in the form to add a new media contact.";
  const submitButtonText = contact ? "Save Changes" : "Add Contact";

  const handleClose = () => {
    form.reset();
    setFormActionFeedback(null);
    // Clear tag states
    setOutletTags([]);
    setBeatTags([]);
    setSocialTags([]);
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
              <div className="mb-6">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" {...form.register('name')} className="mt-2" />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="mb-6">
                <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                <Input id="title" {...form.register('title')} className="mt-2" />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="mb-6">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} className="mt-2" />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2 pt-1 mb-6">
                <Controller
                  name="email_verified_status"
                  control={form.control}
                  render={({ field }) => (
                    <input 
                      type="checkbox" 
                      id="email_verified_status"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-2"
                    />
                  )}
                />
                <Label htmlFor="email_verified_status" className="text-sm font-medium text-gray-700 select-none">
                  Email Verified
                </Label>
              </div>

              {/* Countries Multi-Select Popover - Stays as is */}
              <div className="mb-6">
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

              {/* Beats - Enhanced with TagInput */}
              <div className="mb-6">
                <Label htmlFor="beats">Beats</Label>
                <Controller
                  name="beats"
                  control={form.control}
                  render={({ field }) => {
                    // Ensure field value is always an array for type safety
                    // Using value directly in the component, no need for separate variable
                    return (
                      <TagInput
                        tags={beatTags}
                        onTagsChange={(newTags: string[]) => {
                          setBeatTags(newTags);
                          field.onChange(newTags);
                        }}
                        placeholder="Add beat..."
                        validation={{
                          maxTags: 10,
                          minLength: 2,
                          pattern: /^[\w\s\-\.]+$/,
                        }}
                        error={form.formState.errors.beats?.message as string}
                      />
                    );
                  }}
                />
              </div>

              {/* Outlets - Enhanced with TagInput */}
              <div className="mb-6">
                <Label htmlFor="outlets">Outlets</Label>
                <Controller
                  name="outlets"
                  control={form.control}
                  render={({ field }) => {
                    // Ensure field value is always an array for type safety
                    // Using value directly in the component, no need for separate variable
                    return (
                      <TagInput
                        tags={outletTags}
                        onTagsChange={(newTags: string[]) => {
                          setOutletTags(newTags);
                          field.onChange(newTags);
                        }}
                        placeholder="Add outlet..."
                        validation={{
                          maxTags: 10,
                          minLength: 2,
                          pattern: /^[\w\s\-\.]+$/,
                        }}
                        error={form.formState.errors.outlets?.message as string}
                      />
                    );
                  }}
                />
              </div>

              <div className="mb-6">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" {...form.register('bio')} className="mt-1" rows={3} />
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.bio.message as string}</p>
                )}
              </div>

              {/* Socials - Enhanced with TagInput */}
              <div>
                <Label htmlFor="socials">Social Media Links</Label>
                <Controller
                  name="socials"
                  control={form.control}
                  render={({ field }) => {
                    // Ensure field value is always an array for type safety
                    // Using value directly in the component, no need for separate variable
                    return (
                      <TagInput
                        tags={socialTags}
                        onTagsChange={(newTags: string[]) => {
                          setSocialTags(newTags);
                          field.onChange(newTags);
                        }}
                        placeholder="Add social media URL..."
                        validation={{
                          maxTags: 5,
                          pattern: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
                        }}
                        error={form.formState.errors.socials?.message as string}
                      />
                    );
                  }}
                />
                {socialTags.length > 0 && (
                  <div className="mt-2">
                    {socialTags.map((url, index) => {
                      const platform = detectSocialPlatform(url);
                      return (
                        <Badge key={index} variant="outline" className="mr-2 mb-2">
                          {platform}: {url}
                        </Badge>
                      );
                    })}
                  </div>
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
