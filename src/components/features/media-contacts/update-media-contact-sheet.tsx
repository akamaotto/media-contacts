'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    // SheetClose, // Removed unused import
} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Textarea} from '@/components/ui/textarea';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {CheckIcon, ChevronsUpDownIcon, Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/badge';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
// Migrated from server action to API endpoint for consistency
import { ClientErrorHandler } from '@/lib/api/client-error-handler';
import type { MediaContactActionResult } from '@/features/media-contacts/lib/types';
import type { MediaContactTableItem, Country } from './types';
import {TagInput} from '@/components/ui/tag-input';
import {toast} from 'sonner';
import {OutletAutocomplete} from '@/components/features/media-contacts/outlet-autocomplete';
import {CountryAutocomplete} from '@/components/features/media-contacts/country-autocomplete';
import {BeatAutocomplete} from '@/components/features/media-contacts/beat-autocomplete';
// AI enrichment UI removed

// Ensure necessary TypeScript configurations are applied
/** @jsxRuntime automatic */
/** @jsxImportSource react */

/**
 * Enhanced Zod schema for form validation with explicit type handling
 * Following Rust-inspired approach for comprehensive validation
 */
const mediaContactUpsertSchema = z.object({
    name: z.string().min(1, {message: 'Name is required.'}),
    title: z.string().min(1, {message: 'Title is required.'}),
    email: z
        .string()
        .email({message: 'Invalid email address.'})
        .optional()
        .or(z.literal('')),
    email_verified_status: z.boolean().optional(),
    bio: z.string().optional().nullable(),
    socials: z.array(z.string().url({message: 'Invalid URL format.'})).max(5, {
        message: 'Maximum 5 social media links allowed.',
    }),
    authorLinks: z
        .array(z.string().url({message: 'Invalid URL format.'}))
        .max(5, {
            message: 'Maximum 5 author links allowed.',
        }),
    countryIds: z.array(z.string().uuid()).optional(),
    beats: z
        .array(
            z.string().min(2, {message: 'Beat must be at least 2 characters.'}),
        )
        .max(10, {
            message: 'Maximum 10 beats allowed.',
        }),
    outlets: z
        .array(
            z
                .string()
                .min(2, {message: 'Outlet must be at least 2 characters.'}),
        )
        .max(10, {
            message: 'Maximum 10 outlets allowed.',
        }),
});

/**
 * Type definition inferred from Zod schema for type safety
 */
type MediaContactUpsertFormData = z.infer<typeof mediaContactUpsertSchema>;



/**
 * Props interface for UpdateMediaContactSheet component
 * Following Rust-inspired explicit typing pattern with comprehensive documentation
 */
interface UpdateMediaContactSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    contact?: MediaContactTableItem | null;
    onSuccess?: () => void; // Changed from onContactUpdate to onSuccess
    countries?: Array<{
        id: string;
        name: string;
        code?: string;
        phone_code?: string;
        capital?: string;
        flag_emoji?: string;
    }>;
    beats?: Array<{id: string; name: string; description?: string}>;
}

export function UpdateMediaContactSheet({
    isOpen,
    onOpenChange,
    contact,
    onSuccess = () => {},
    countries = [],
    beats = [],
}: UpdateMediaContactSheetProps) {
    // Form state management
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);
    const [timedOut, setTimedOut] = useState(false);
    const timedOutRef = useRef(false);
    const [allCountries, setAllCountries] = useState<Country[]>([]);
    // AI enrichment removed
    // Country selection is now handled by the CountryAutocomplete component
    const [formActionFeedback, setFormActionFeedback] =
        useState<MediaContactActionResult | null>(null);
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
            authorLinks: [], // Added missing authorLinks default value
            email_verified_status: false,
            countryIds: [],
            beats: [],
            outlets: [],
        },
    });

    // Enhanced error handler for API calls
    const errorHandler = useMemo(() => new ClientErrorHandler({
        enableToasts: false, // Silent for background data loading
        enableConsoleLogging: false
    }), []);

    useEffect(() => {
        async function fetchData() {
            try {
                // Direct fetch to avoid issues with errorHandler
                const response = await fetch('/api/filters/countries?limit=247');

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.items && Array.isArray(result.items)) {
                    const mappedCountries = result.items.map((c: any) => ({
                        id: c.id,
                        name: c.label,  // Store as name internally
                        code: c.code ?? null,
                    }));
                    setAllCountries(mappedCountries);
                } else {
                    console.warn('Failed to fetch countries, using empty array - invalid response format');
                    setAllCountries([]);
                }
            } catch (error) {
                console.warn('Failed to fetch countries:', error);
                setAllCountries([]);
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
                // Initialize form with contact data

                // Initialize tag states from contact data with explicit handling for null/undefined
                const contactSocials = contact.socials
                    ? Array.isArray(contact.socials)
                        ? contact.socials.filter(Boolean)
                        : []
                    : [];

                // Handle author links array safely
                const contactAuthorLinks = contact.authorLinks
                    ? Array.isArray(contact.authorLinks)
                        ? contact.authorLinks.filter(Boolean)
                        : []
                    : [];

                // Set form default values
                form.reset({
                    name: contact.name || '',
                    title: contact.title || '',
                    email: contact.email || '',
                    email_verified_status:
                        contact.email_verified_status || false,
                    bio: contact.bio || '',
                    socials: contactSocials,
                    authorLinks: contactAuthorLinks,
                    countryIds: contact.countries?.map((c) => c.id) || [],
                    beats: contact.beats?.map((b) => b.name) || [],
                    outlets: contact.outlets?.map((o) => o.name) || [],
                });

                // Set tag inputs
                const initialBeats = contact.beats?.map((b) => b.name) || [];
                console.log('UpdateMediaContactSheet: Setting initial beats:', initialBeats);
                console.log('UpdateMediaContactSheet: Setting initial country IDs:', contact.countries?.map((c) => c.id) || []);
                setBeatTags(initialBeats);
                setOutletTags(contact.outlets?.map((o) => o.name) || []);
                setSocialTags(contactSocials);
                setAuthorTags(contactAuthorLinks);
            }
        }
    }, [contact, isOpen]); // Removed 'form' from dependencies to prevent infinite re-renders

    // Update form country IDs when allCountries is loaded and contact data is available
    useEffect(() => {
        if (isOpen && contact && allCountries.length > 0) {
            const contactCountryIds = contact.countries?.map((c) => c.id) || [];
            console.log('UpdateMediaContactSheet: Updating form countryIds after allCountries loaded:', contactCountryIds);
            form.setValue('countryIds', contactCountryIds);
        }
    }, [contact, isOpen, allCountries, form]);

    /**
     * Handles form submission with comprehensive validation and error handling
     * @param data The form data to be submitted
     */
    const onSubmit = async (data: MediaContactUpsertFormData) => {
        const start = performance.now();
        console.log('UpdateMediaContactSheet.onSubmit: start', {
            isEdit: !!contact,
            contactId: contact?.id,
        });
        setIsSubmitting(true);
        isSubmittingRef.current = true;
        setTimedOut(false);
        timedOutRef.current = false;

        // Timeout guard to keep UI usable if the action hangs
        const TIMEOUT_MS = 15_000;
        const timeoutId = setTimeout(() => {
            if (isSubmittingRef.current) {
                console.warn('UpdateMediaContactSheet.onSubmit: timeout fired', {
                    elapsedMs: Math.round(performance.now() - start),
                });
                setTimedOut(true);
                timedOutRef.current = true;
                setIsSubmitting(false);
                isSubmittingRef.current = false;
                toast.error('Saving is taking longer than expected', {
                    description:
                        'We\'re still working on it in the background. You can keep using the app or try again.',
                });
            }
        }, TIMEOUT_MS);
        try {
            // Process data with explicit type handling for robustness
            // Destructure to avoid property collision and explicitly handle each field
            const {email, bio, countryIds, ...restData} = data;

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

            console.log('UpdateMediaContactSheet: Submitting data:', {
                isEdit: !!contact,
                contactId: contact?.id,
                email: processedData.email,
                hasId: !!processedData.id
            });

            // Resolve names -> IDs for beats/outlets
            async function resolveBeatIds(names: string[]): Promise<{ ids: string[]; missing: string[] }> {
                const unique = Array.from(new Set((names || []).filter(Boolean)));
                const results = await Promise.all(unique.map(async (name) => {
                    try {
                        const res = await fetch(`/api/search/beats?q=${encodeURIComponent(name)}`, { cache: 'no-store' });
                        if (!res.ok) return { name, id: null };
                        const json = await res.json();
                        const match = (json.beats || []).find((b: any) => (b.name || '').toLowerCase() === name.toLowerCase());
                        return { name, id: match?.id || null };
                    } catch {
                        return { name, id: null };
                    }
                }));
                const ids = results.filter(r => r.id).map(r => r.id as string);
                const missing = results.filter(r => !r.id).map(r => r.name);
                return { ids, missing };
            }

            async function resolveOutletIds(names: string[]): Promise<{ ids: string[]; missing: string[] }> {
                const unique = Array.from(new Set((names || []).filter(Boolean)));
                const results = await Promise.all(unique.map(async (name) => {
                    try {
                        const res = await fetch(`/api/search/outlets?q=${encodeURIComponent(name)}`, { cache: 'no-store' });
                        if (!res.ok) return { name, id: null };
                        const json = await res.json();
                        const match = (json.outlets || []).find((o: any) => (o.name || '').toLowerCase() === name.toLowerCase());
                        return { name, id: match?.id || null };
                    } catch {
                        return { name, id: null };
                    }
                }));
                const ids = results.filter(r => r.id).map(r => r.id as string);
                const missing = results.filter(r => !r.id).map(r => r.name);
                return { ids, missing };
            }

            const [{ ids: beatIds, missing: missingBeats }, { ids: outletIds, missing: missingOutlets }] = await Promise.all([
                resolveBeatIds(processedData.beats || []),
                resolveOutletIds(processedData.outlets || []),
            ]);

            if (missingBeats.length || missingOutlets.length) {
                toast.message('Some items were not found', {
                    description: [
                        missingBeats.length ? `Beats: ${missingBeats.join(', ')}` : '',
                        missingOutlets.length ? `Outlets: ${missingOutlets.join(', ')}` : '',
                    ].filter(Boolean).join(' | '),
                });
            }

            // Build API payload
            const payload = {
                name: processedData.name,
                email: processedData.email,
                title: processedData.title,
                bio: processedData.bio,
                socials: processedData.socials,
                authorLinks: processedData.authorLinks,
                email_verified_status: processedData.email_verified_status,
                countryIds: processedData.countryIds || [],
                beatIds,
                outletIds,
            };

            // Guard: require email + name for API
            if (!payload.name || !payload.email) {
                setFormActionFeedback({ success: false, error: 'Name and email are required.' });
                throw new Error('validation');
            }

            // Call API (PUT for edit, POST for create)
            const endpoint = contact?.id ? `/api/media-contacts/${contact.id}` : '/api/media-contacts';
            const method = contact?.id ? 'PUT' : 'POST';
            const controller = new AbortController();
            const apiTimeout = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                cache: 'no-store',
                signal: controller.signal,
            });
            clearTimeout(apiTimeout);

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `Request failed: ${response.status}`);
            }
            const json = await response.json().catch(() => ({}));

            // Normalize success detection across endpoints
            const success = json?.success === true || !!json?.data || response.ok;
            setFormActionFeedback(success ? { success: true, message: contact ? 'Contact updated successfully.' : 'Contact created successfully.' } : { success: false, error: 'Failed to save contact' });

            if (success) {
                // Success handling differs if we already timed out (to keep UX predictable)
                if (timedOutRef.current) {
                    toast.success(
                        contact
                            ? 'Contact updated successfully'
                            : 'Contact created successfully',
                        {
                            description:
                                'Operation completed after a delay. You can close this panel.',
                            action: {
                                label: 'Close',
                                onClick: () => onOpenChange(false),
                            },
                        },
                    );
                    setTimedOut(false);
                    timedOutRef.current = false;
                } else {
                    // Normal flow: notify and close immediately
                    toast.success(
                        contact
                            ? 'Contact updated successfully'
                            : 'Contact created successfully',
                        {
                            description: `${data.name} has been ${
                                contact ? 'updated' : 'added'
                            } to your contacts.`,
                            action: { label: 'View All', onClick: () => {} },
                        },
                    );
                    // Close sheet and trigger refresh of the table with updated contact data
                    onOpenChange(false);
                }

                // Create a properly typed contact object to pass to the parent callback
                // Following Rust-inspired fail-fast approach with explicit type validation
                const updatedContact: MediaContactTableItem = {
                    id: json?.data?.id || contact?.id || '',
                    name: data.name,
                    email: data.email || '',
                    title: data.title || '',
                    email_verified_status: data.email_verified_status || false,
                    emailVerified: data.email_verified_status || false, // Add the emailVerified property
                    updated_at: json?.data?.updated_at || new Date().toISOString(),
                    outlets:
                        json?.data?.outlets || 
                        data.outlets?.map((name) => ({id: '', name})) || [],
                    countries:
                        json?.data?.countries ||
                        (data.countryIds
                            ?.map((id) => {
                                const country = allCountries.find(
                                    (c: Country) => c.id === id,
                                );
                                if (!country) return null;
                                return {
                                    id: country.id,
                                    name: country.name,
                                    code: country.code || '',
                                } as Country;
                            })
                            .filter(Boolean) as Country[]) || [],
                    beats: 
                        json?.data?.beats ||
                        data.beats?.map((name) => ({id: '', name})) || [],
                    bio: data.bio || null,
                    socials: data.socials || null,
                    authorLinks: data.authorLinks || null,
                };

                // Call the parent callback
                onSuccess();
            } else {
                // Show error toast
                toast.error('Failed to save contact', {
                    description: 'Please check the form for errors or try again.',
                });
            }
        } catch (error) {
            console.error('Error submitting contact form:', error);
            setFormActionFeedback({
                success: false,
                error: error instanceof Error ? error.message : `An unexpected error occurred: ${String(error)}`,
            });

            // Show error toast
            toast.error('An unexpected error occurred', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Please try again later',
            });
        } finally {
            clearTimeout(timeoutId);
            // If timeout already fired, isSubmitting is already false
            if (isSubmittingRef.current) {
                setIsSubmitting(false);
            }
            isSubmittingRef.current = false;
            console.log('UpdateMediaContactSheet.onSubmit: end', {
                elapsedMs: Math.round(performance.now() - start),
                timedOut: timedOutRef.current,
            });
        }
    };

    const sheetTitle = contact ? 'Edit Media Contact' : 'Add New Media Contact';
    const sheetDescription = contact
        ? 'Update the details of the media contact.'
        : 'Fill in the form to add a new media contact.';
    const submitButtonText = contact ? 'Save Changes' : 'Add Contact';

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
            <SheetContent className='w-full sm:max-w-xl flex flex-col p-0'>
                <SheetHeader className='p-6 pb-2 border-b'>
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <SheetTitle>{sheetTitle}</SheetTitle>
                            <SheetDescription>{sheetDescription}</SheetDescription>
                            {/* AI enrichment actions removed */}
                        </div>
                        
                    </div>
                </SheetHeader>

                {formActionFeedback?.error && (
                    <div className='mx-6 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md'>
                        <p className='font-semibold'>Error:</p>
                        <p>{formActionFeedback.error}</p>{' '}
                        {/* Display the first form-level error */}
                    </div>
                )}
                {formActionFeedback?.message && formActionFeedback.success && (
                    <div className='mx-6 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md'>
                        <p>{formActionFeedback.message}</p>
                    </div>
                )}

                <div className='flex-grow overflow-hidden'>
                    <ScrollArea className='h-full px-6'>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-6 pb-8'>
                            {/* Form Fields */}
                            <div className='mb-6'>
                                <Label htmlFor='name'>
                                    Name <span className='text-red-500'>*</span>
                                </Label>
                                <Input
                                    id='name'
                                    {...form.register('name')}
                                    className='mt-2'
                                />
                                {form.formState.errors.name && (
                                    <p className='text-sm text-red-500 mt-1'>
                                        {form.formState.errors.name.message}
                                    </p>
                                )}
                            </div>

                            <div className='mb-6'>
                                <Label htmlFor='title'>
                                    Title{' '}
                                    <span className='text-red-500'>*</span>
                                </Label>
                                <Input
                                    id='title'
                                    {...form.register('title')}
                                    className='mt-2'
                                />
                                {form.formState.errors.title && (
                                    <p className='text-sm text-red-500 mt-1'>
                                        {form.formState.errors.title.message}
                                    </p>
                                )}
                            </div>

                            <div className='mb-6'>
                                <Label htmlFor='email'>Email</Label>
                                <Input
                                    id='email'
                                    type='email'
                                    {...form.register('email')}
                                    className='mt-2'
                                />
                                {form.formState.errors.email && (
                                    <p className='text-sm text-red-500 mt-1'>
                                        {form.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className='flex items-center space-x-2 pt-1 mb-6'>
                                <Controller
                                    name='email_verified_status'
                                    control={form.control}
                                    render={({field}) => (
                                        <input
                                            type='checkbox'
                                            id='email_verified_status'
                                            checked={field.value ?? false}
                                            onChange={(e) =>
                                                field.onChange(e.target.checked)
                                            }
                                            className='h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-2'
                                        />
                                    )}
                                />
                                <Label
                                    htmlFor='email_verified_status'
                                    className='text-sm font-medium text-gray-700 select-none'
                                >
                                    Email Verified
                                </Label>
                            </div>

                            {/* Countries - Enhanced with CountryAutocomplete */}
                            <div className='mb-6'>
                                <Label htmlFor='countryIds'>Countries</Label>
                                <Controller
                                    name='countryIds'
                                    control={form.control}
                                    render={({field}) => {
                                        // Convert IDs to Country objects for the component
                                        const selectedCountries =
                                            field.value
                                                ?.map((id: string) => {
                                                    const country =
                                                        allCountries.find(
                                                            (c: any) =>
                                                                c.id === id,
                                                        );
                                                    if (!country) {
                                                        return null;
                                                    }
                                                    // Convert from API format (name) to component format (label)
                                                    return {
                                                        id: country.id,
                                                        label: country.name,  // Map name to label
                                                        code: country.code || '',
                                                    };
                                                })
                                                .filter(
                                                    (c: any) =>
                                                        c && c.id !== '',
                                                ) || [];

                                        return (
                                            <CountryAutocomplete
                                                selectedCountries={
                                                    selectedCountries
                                                }
                                                onCountriesChange={(
                                                    newSelectedCountries,
                                                ) => {
                                                    // Extract IDs from the selected countries
                                                    const newCountryIds =
                                                        newSelectedCountries.map(
                                                            (c: Country) => c.id,
                                                        );
                                                    // Update the form field value directly
                                                    field.onChange(
                                                        newCountryIds,
                                                    );
                                                }}
                                                allCountries={allCountries}
                                                placeholder='Select countries...'
                                                error={
                                                    form.formState.errors
                                                        .countryIds
                                                        ?.message as string
                                                }
                                            />
                                        );
                                    }}
                                />
                            </div>

                            {/* Beats - Enhanced with BeatAutocomplete */}
                            <div className='mb-6'>
                                <Label htmlFor='beats'>Beats</Label>
                                <Controller
                                    name='beats'
                                    control={form.control}
                                    render={({field}) => {
                                        // Ensure field value is always an array for type safety
                                        return (
                                            <BeatAutocomplete
                                                beats={beatTags}
                                                onBeatsChange={(
                                                    newTags: string[],
                                                ) => {
                                                    setBeatTags(newTags);
                                                    field.onChange(newTags);
                                                }}
                                                placeholder='Search beats or add new...'
                                                error={
                                                    form.formState.errors.beats
                                                        ?.message as string
                                                }
                                            />
                                        );
                                    }}
                                />
                            </div>

                            {/* AI Beats - Read-only display to surface enrichment */}
                            {contact?.ai_beats && contact.ai_beats.length > 0 && (
                                <div className='mb-6'>
                                    <Label>AI Beats (enriched)</Label>
                                    <div className='mt-2 flex flex-wrap gap-2'>
                                        {contact.ai_beats.map((b, idx) => (
                                            <Badge key={`${b}-${idx}`} variant="secondary">{b}</Badge>
                                        ))}
                                    </div>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        AI-suggested beats are displayed for reference and are not directly editable here.
                                    </p>
                                </div>
                            )}

                            {/* Outlets - Enhanced with OutletAutocomplete */}
                            <div className='mb-6'>
                                <Label htmlFor='outlets'>Outlets</Label>
                                <Controller
                                    name='outlets'
                                    control={form.control}
                                    render={({field}) => {
                                        // Ensure field value is always an array for type safety
                                        return (
                                            <OutletAutocomplete
                                                outlets={outletTags}
                                                onOutletsChange={(
                                                    newTags: string[],
                                                ) => {
                                                    setOutletTags(newTags);
                                                    field.onChange(newTags);
                                                }}
                                                placeholder='Search outlets or add new...'
                                                error={
                                                    form.formState.errors
                                                        .outlets
                                                        ?.message as string
                                                }
                                            />
                                        );
                                    }}
                                />
                            </div>

                            <div className='mb-6'>
                                <Label htmlFor='bio'>Bio</Label>
                                <Textarea
                                    id='bio'
                                    {...form.register('bio')}
                                    className='mt-1'
                                    rows={3}
                                />
                                {form.formState.errors.bio && (
                                    <p className='text-sm text-red-500 mt-1'>
                                        {
                                            form.formState.errors.bio
                                                .message as string
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Socials - Enhanced with TagInput */}
                            <div className='mb-6'>
                                <Label htmlFor='socials'>
                                    Social Media Links
                                </Label>
                                <Controller
                                    name='socials'
                                    control={form.control}
                                    render={({field}) => {
                                        // Ensure field value is always an array for type safety
                                        // Using value directly in the component, no need for separate variable
                                        return (
                                            <TagInput
                                                tags={socialTags}
                                                onTagsChange={(
                                                    newTags: string[],
                                                ) => {
                                                    setSocialTags(newTags);
                                                    field.onChange(newTags);
                                                }}
                                                placeholder='Add social media URL...'
                                                validation={{
                                                    maxTags: 5,
                                                    minLength: 1,
                                                    // Temporarily disable pattern validation for testing
                                                    // pattern: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
                                                }}
                                                error={
                                                    form.formState.errors
                                                        .socials
                                                        ?.message as string
                                                }
                                            />
                                        );
                                    }}
                                />

                            </div>

                            {/* Author Links - Enhanced with TagInput */}
                            <div>
                                <Label htmlFor='authorLinks'>
                                    Author Links
                                </Label>
                                <Controller
                                    name='authorLinks'
                                    control={form.control}
                                    render={({field}) => {
                                        return (
                                            <TagInput
                                                tags={authorTags}
                                                onTagsChange={(
                                                    newTags: string[],
                                                ) => {
                                                    setAuthorTags(newTags);
                                                    field.onChange(newTags);
                                                }}
                                                placeholder='Add author article/blog URL...'
                                                validation={{
                                                    maxTags: 5,
                                                    minLength: 1,
                                                    // Temporarily disable pattern validation for testing
                                                    // pattern: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
                                                }}
                                                error={
                                                    form.formState.errors
                                                        .authorLinks
                                                        ?.message as string
                                                }
                                            />
                                        );
                                    }}
                                />

                            </div>
                        </form>
                    </ScrollArea>


                </div>

                <SheetFooter className='border-t'>
                    <div className='flex w-full items-center justify-between gap-2 sm:justify-end'>
                        <Button
                            variant='outline'
                            type='button'
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='button'
                            disabled={isSubmitting}
                            onClick={form.handleSubmit(onSubmit)}
                        >
                            {isSubmitting && (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            )}
                            {submitButtonText}
                        </Button>
                    </div>
                </SheetFooter>
                {/* Fallback content removed as form is always rendered, content visibility handled by isOpen prop on Sheet */}
            </SheetContent>
        </Sheet>
    );
}
