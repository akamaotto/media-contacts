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
import { upsertMediaContactAction, type UpsertMediaContactActionState } from "@/backend/media-contacts-table/actions";
import { MediaContactTableItem, Country, Beat, Outlet } from '@/components/features/media-contacts/columns';
import { getCountries, type Country as ApiCountry } from '@/backend/media-contacts-filters/country-actions';
import { TagInput } from "@/components/ui/tag-input";
import { toast } from "@/components/ui/sonner";
import { OutletAutocomplete } from "@/components/features/media-contacts/outlet-autocomplete";
import { CountryAutocomplete } from "@/components/features/media-contacts/country-autocomplete";
import { BeatAutocomplete } from "@/components/features/media-contacts/beat-autocomplete";

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
  authorLinks: z.array(z.string().url({ message: "Invalid URL format." })).max(5, {
    message: "Maximum 5 author links allowed."
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
 * Type for author link type detection
 */
enum AuthorLinkType {
  Article = "article",
  Blog = "blog",
  Publication = "publication",
  Portfolio = "portfolio",
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

/**
 * Utility function to detect author link type from URL
 * @param url The author link URL to analyze
 * @returns The detected author link type
 */
function detectAuthorLinkType(url: string): AuthorLinkType {
  try {
    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('medium.com') || 
        lowercaseUrl.includes('blog.') || 
        lowercaseUrl.includes('/blog/')) {
      return AuthorLinkType.Blog;
    }
    if (lowercaseUrl.includes('/article/') || 
        lowercaseUrl.includes('/articles/') || 
        lowercaseUrl.includes('news.')) {
      return AuthorLinkType.Article;
    }
    if (lowercaseUrl.includes('publication') || 
        lowercaseUrl.includes('magazine') || 
        lowercaseUrl.includes('journal')) {
      return AuthorLinkType.Publication;
    }
    if (lowercaseUrl.includes('portfolio') || 
        lowercaseUrl.includes('about-me') || 
        lowercaseUrl.includes('about.me')) {
      return AuthorLinkType.Portfolio;
    }
    return AuthorLinkType.Other;
  } catch (error) {
    console.error('Error detecting author link type:', error);
    return AuthorLinkType.Other;
  }
}

/**
 * Props interface for UpdateMediaContactSheet component
 * Following Rust-inspired explicit typing pattern with comprehensive documentation
 */
interface UpdateMediaContactSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact?: MediaContactTableItem | null;
  onContactUpdate: (contact: MediaContactTableItem) => void;
}

export function UpdateMediaContactSheet({
  isOpen,
  onOpenChange,
  contact,
  onContactUpdate,
}: UpdateMediaContactSheetProps) {
  // Form state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCountries, setAllCountries] = useState<ApiCountry[]>([]);
  // Country selection is now handled by the CountryAutocomplete component
  const [formActionFeedback, setFormActionFeedback] = useState<UpsertMediaContactActionState | null>(null);
  // State for social media and author links
  const [socialTags, setSocialTags] = useState<string[]>([]);
  const [authorTags, setAuthorTags] = useState<string[]>([]);
  const [beatTags, setBeatTags] = useState<string[]>([]);
  const [outletTags, setOutletTags] = useState<string[]>([]);

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
        const contactSocials = contact.socials ? 
          (Array.isArray(contact.socials) ? contact.socials.filter(Boolean) : []) : [];
        
        // Handle author links array safely
        const contactAuthorLinks = contact.authorLinks ? 
          (Array.isArray(contact.authorLinks) ? contact.authorLinks.filter(Boolean) : []) : [];
        
        // Set form default values
        form.reset({
          name: contact.name || '',
          title: contact.title || '',
          email: contact.email || '',
          email_verified_status: contact.email_verified_status || false,
          bio: contact.bio || '',
          socials: contactSocials,
          authorLinks: contactAuthorLinks,
          countryIds: contact.countries?.map(c => c.id) || [],
          beats: contact.beats?.map(b => b.name) || [],
          outlets: contact.outlets?.map(o => o.name) || [],
        });
        
        // Set tag inputs
        setBeatTags(contact.beats?.map(b => b.name) || []);
        setOutletTags(contact.outlets?.map(o => o.name) || []);
        setSocialTags(contactSocials);
        setAuthorTags(contactAuthorLinks);
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
      
      const processedData = {
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
        authorLinks: data.authorLinks ? [...data.authorLinks] : [],
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
        
        // Close sheet and trigger refresh of the table with updated contact data
        onOpenChange(false);
        
        // Create a properly typed contact object to pass to the parent callback
        // Following Rust-inspired fail-fast approach with explicit type validation
        const updatedContact: MediaContactTableItem = {
          id: result.data?.id || contact?.id || '',
          name: data.name,
          email: data.email || '',
          title: data.title || '',
          email_verified_status: data.email_verified_status || false,
          emailVerified: data.email_verified_status || false, // Add the emailVerified property
          updated_at: new Date().toISOString(),
          outlets: data.outlets?.map(name => ({ id: '', name })) || [],
          countries: (data.countryIds?.map(id => {
            const country = allCountries.find((c: ApiCountry) => c.id === id);
            if (!country) return null;
            return {
              id: country.id,
              name: country.name,
              code: country.code || ''
            } as Country;
          }).filter(Boolean) as Country[]) || [],
          beats: data.beats?.map(name => ({ id: '', name })) || [],
          bio: data.bio || null,
          socials: data.socials || null
        };
        
        // Call the parent callback with the updated contact
        onContactUpdate(updatedContact);
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
    // Reset form state when closing
    form.reset();
    setFormActionFeedback(null);
    setOutletTags([]);
    setBeatTags([]);
    setSocialTags([]);
    // Call onOpenChange prop to close the sheet
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

              {/* Countries - Enhanced with CountryAutocomplete */}
              <div className="mb-6">
                <Label htmlFor="countryIds">Countries</Label>
                <Controller
                  name="countryIds"
                  control={form.control}
                  render={({ field }) => {
                    // Convert IDs to Country objects for the component
                    const selectedCountries = field.value?.map((id: string) => {
                      const country = allCountries.find((c: ApiCountry) => c.id === id);
                      return country || { id: '', name: '', code: '' };
                    }).filter((c: ApiCountry) => c.id !== '') || [];
                    
                    return (
                      <CountryAutocomplete
                        countries={allCountries}
                        selectedCountries={selectedCountries}
                        onCountriesChange={(newSelectedCountries) => {
                          // Extract IDs from the selected countries
                          const newCountryIds = newSelectedCountries.map((c: ApiCountry) => c.id);
                          // Update the form field value directly
                          field.onChange(newCountryIds);
                        }}
                        allCountries={allCountries}
                        placeholder="Select countries..."
                        error={form.formState.errors.countryIds?.message as string}
                      />
                    );
                  }}
                />
              </div>

              {/* Beats - Enhanced with BeatAutocomplete */}
              <div className="mb-6">
                <Label htmlFor="beats">Beats</Label>
                <Controller
                  name="beats"
                  control={form.control}
                  render={({ field }) => {
                    // Ensure field value is always an array for type safety
                    return (
                      <BeatAutocomplete
                        beats={beatTags}
                        onBeatsChange={(newTags: string[]) => {
                          setBeatTags(newTags);
                          field.onChange(newTags);
                        }}
                        placeholder="Search beats or add new..."
                        error={form.formState.errors.beats?.message as string}
                      />
                    );
                  }}
                />
              </div>

              {/* Outlets - Enhanced with OutletAutocomplete */}
              <div className="mb-6">
                <Label htmlFor="outlets">Outlets</Label>
                <Controller
                  name="outlets"
                  control={form.control}
                  render={({ field }) => {
                    // Ensure field value is always an array for type safety
                    return (
                      <OutletAutocomplete
                        outlets={outletTags}
                        onOutletsChange={(newTags: string[]) => {
                          setOutletTags(newTags);
                          field.onChange(newTags);
                        }}
                        placeholder="Search outlets or add new..."
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
              <div className="mb-6">
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
              
              {/* Author Links - Enhanced with TagInput */}
              <div>
                <Label htmlFor="authorLinks">Author Links</Label>
                <Controller
                  name="authorLinks"
                  control={form.control}
                  render={({ field }) => {
                    return (
                      <TagInput
                        tags={authorTags}
                        onTagsChange={(newTags: string[]) => {
                          setAuthorTags(newTags);
                          field.onChange(newTags);
                        }}
                        placeholder="Add author article/blog URL..."
                        validation={{
                          maxTags: 5,
                          pattern: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
                        }}
                        error={form.formState.errors.authorLinks?.message as string}
                      />
                    );
                  }}
                />
                {authorTags.length > 0 && (
                  <div className="mt-2">
                    {authorTags.map((url, index) => {
                      const linkType = detectAuthorLinkType(url);
                      return (
                        <Badge key={index} variant="outline" className="mr-2 mb-2">
                          {linkType}: {url}
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
