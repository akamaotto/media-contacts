'use client';

import {useState, useEffect, useCallback, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {Skeleton} from '@/components/ui/skeleton';
import {
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    Copy,
    Eye,
    Pencil,
    Trash2,
    RefreshCw,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {toast} from 'sonner';
import {EnhancedPagination} from './enhanced-pagination';
import {EnhancedBadgeList, BadgePresets} from './enhanced-badge-list';
import {FastTableContact} from './types';
import { EmptyState, ErrorState, TableLoadingSkeleton, FadeIn } from '@/components/ui/enhanced-states';
import { Database, Search, UserPlus } from 'lucide-react';
import { SortableHeader } from '@/components/ui/sortable-header';
import { Badge } from '@/components/ui/badge';

interface FastTableProps {
    searchTerm?: string;
    countryIds?: string[];
    beatIds?: string[];
    outletIds?: string[];
    regionCodes?: string[];
    languageCodes?: string[];
    emailVerified?: 'all' | 'verified' | 'unverified';
    page?: number;
    pageSize?: number;
    refreshKey?: number; // Add refresh key to trigger data reload
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onEditContact: (contact: FastTableContact) => void;
    onDeleteContact: (contact: FastTableContact) => void;
    onViewContact: (contact: FastTableContact) => void;
    onDataChange?: (totalCount: number) => void;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onDataUpdate?: (data: FastTableContact[]) => void; // Add this new prop
    onSortChange?: (sortBy: string | undefined, sortOrder: 'asc' | 'desc' | undefined) => void;
}


export function FastMediaContactsTable({
    searchTerm = '',
    countryIds = [],
    beatIds = [],
    outletIds = [],
    regionCodes = [],
    languageCodes = [],
    emailVerified = 'all',
    page = 1,
    pageSize = 10,
    refreshKey = 0, // Add refreshKey parameter
    sortBy,
    sortOrder,
    onEditContact,
    onDeleteContact,
    onViewContact,
    onDataChange,
    onPageChange,
    onPageSizeChange,
    onDataUpdate, // Add this missing destructuring
    onSortChange,
}: FastTableProps) {
    const [data, setData] = useState<FastTableContact[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchControllerRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef(0);

    const fetchData = useCallback(async () => {
        const controller = new AbortController();
        requestIdRef.current += 1;
        const requestId = requestIdRef.current;

        // Cancel any in-flight request before starting a new one
        fetchControllerRef.current?.abort();
        fetchControllerRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            // Build query parameters
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                emailVerified,
            });

            if (searchTerm.trim()) {
                params.append('searchTerm', searchTerm.trim());
            }

            if (countryIds.length > 0) {
                params.append('countryIds', countryIds.join(','));
            }

            if (beatIds.length > 0) {
                params.append('beatIds', beatIds.join(','));
            }

            if (outletIds.length > 0) {
                params.append('outletIds', outletIds.join(','));
            }

            if (regionCodes.length > 0) {
                params.append('regionCodes', regionCodes.join(','));
            }

            if (languageCodes.length > 0) {
                params.append('languageCodes', languageCodes.join(','));
            }

            // Add sort parameters
            if (sortBy) {
                params.append('sortBy', sortBy);
            }
            
            if (sortOrder) {
                params.append('sortOrder', sortOrder);
            }

            // Include refreshKey to force fresh fetches when parent requests refresh
            if (refreshKey) {
                params.append('refreshKey', String(refreshKey));
            }

            // SINGLE API CALL - No more multiple requests!
            const response = await fetch(`/api/media-contacts?${params}` , { cache: 'no-store', signal: controller.signal });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const result = await response.json();
            console.log('API Response:', result);

            if (requestId !== requestIdRef.current) {
                return;
            }

            // Fix: API returns data in 'data' property, not 'contacts'
            // Transform MediaContact objects to FastTableContact objects
            const transformedData = (result.data || []).map((contact: any) => ({
                id: contact.id,
                name: contact.name,
                email: contact.email,
                title: contact.title,
                email_verified_status: contact.email_verified_status,
                updated_at: contact.updatedAt || contact.updated_at, // Fix date field mapping - use camelCase updatedAt from API
                outlets: contact.outlets || [],
                beats: contact.beats || [],
                ai_beats: contact.ai_beats || [],
                countries: contact.countries || [],
                regions: contact.regions || [],
                languages: contact.languages || [],
                outletCount: contact._count?.outlets || contact.outletCount || 0,
                beatCount: contact._count?.beats || contact.beatCount || 0,
                countryCount: contact._count?.countries || contact.countryCount || 0,
                regionCount: contact.regionCount || 0,
                languageCount: contact.languageCount || 0
            }));
            console.log('Transformed data:', transformedData);
            setData(transformedData);
            onDataUpdate?.(transformedData);
            setTotalCount(result.pagination?.totalCount || 0);
            setTotalPages(result.pagination?.totalPages || 1);

            onDataChange?.(result.pagination?.totalCount || 0);
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                return;
            }

            if (requestId !== requestIdRef.current) {
                return;
            }

            console.error('❌ [FAST-TABLE] Fetch error:', err);
            setError(
                err instanceof Error ? err.message : 'Failed to load contacts',
            );
            setData([]);
            setTotalCount(0);
        } finally {
            if (requestId === requestIdRef.current && !controller.signal.aborted) {
                setIsLoading(false);
                fetchControllerRef.current = null;
            }
        }
    }, [searchTerm,
        countryIds,
        beatIds,
        outletIds,
        regionCodes,
        languageCodes,
        emailVerified,
        page,
        pageSize,
        refreshKey,
        sortBy,
        sortOrder,
        onDataChange,
        onDataUpdate,
    ]);

    useEffect(() => {
        fetchData();
        return () => {
            fetchControllerRef.current?.abort();
        };
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className='space-y-4'>
                <div className='rounded-md border'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Name</TableHead>
                                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Email</TableHead>
                                <TableHead className="w-[200px] text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Outlets</TableHead>
                                <TableHead className="w-[180px] text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Beats</TableHead>
                                <TableHead className="w-[180px] text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Countries</TableHead>
                                <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Updated</TableHead>
                                <TableHead className='w-[50px] text-right border-subtle border-b'>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({length: pageSize}).map((_, index) => (
                                <TableRow key={index} className='h-14 border-b border-subtle'>
                                    <TableCell className='py-2'>
                                        <div className='space-y-1'>
                                            <Skeleton className='h-4 w-32' />
                                            <Skeleton className='h-3 w-24' />
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className='flex items-center space-x-2'>
                                            <Skeleton className='h-4 w-40' />
                                            <Skeleton className='h-3 w-3 rounded-full' />
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className='flex gap-1'>
                                            <Skeleton className='h-5 w-16 rounded-full' />
                                            <Skeleton className='h-5 w-12 rounded-full' />
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className='flex gap-1'>
                                            <Skeleton className='h-5 w-20 rounded-full' />
                                            <Skeleton className='h-5 w-14 rounded-full' />
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className='flex gap-1'>
                                            <Skeleton className='h-5 w-18 rounded-full' />
                                            <Skeleton className='h-5 w-16 rounded-full' />
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <Skeleton className='h-3 w-12' />
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <Skeleton className='h-6 w-6 rounded' />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className='flex items-center justify-center py-4'>
                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
                        <span>Loading contacts...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <ErrorState
                title="Failed to Load Contacts"
                description={error.includes('HTTP 500')
                    ? 'There was a server error. Please try again in a moment.'
                    : error.includes('HTTP 404')
                    ? 'The requested data could not be found.'
                    : error.includes('Failed to fetch')
                    ? 'Unable to connect to the server. Please check your internet connection.'
                    : error}
                onRetry={fetchData}
                retryLabel="Try Again"
                className="py-12"
            />
        );
    }

    return (
        <FadeIn className='space-y-4'>
            <div className='rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Name</TableHead>
                            <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Email</TableHead>
                            <TableHead className="w-[200px] text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Outlets</TableHead>
                            <TableHead className="w-[180px] text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Beats</TableHead>
                            <TableHead className="w-[180px] text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Countries</TableHead>
                            <TableHead className="text-muted uppercase tracking-wide text-[11px] border-subtle border-b">Updated</TableHead>
                            <TableHead className='w-[50px] text-right border-subtle border-b'>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((contact, index) => (
                                <TableRow
                                    key={contact.id}
                                    className='hover:bg-muted/50 cursor-pointer h-14 focus-within:bg-muted/50 transition-colors border-b border-subtle'
                                    onClick={() => {
                                        console.log('Row clicked, contact:', contact);
                                        onViewContact(contact);
                                    }}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === 'Enter' ||
                                            e.key === ' '
                                        ) {
                                            e.preventDefault();
                                            console.log('Row key pressed, contact:', contact);
                                            onViewContact(contact);
                                        }
                                    }}
                                    tabIndex={0}
                                    role='button'
                                    aria-label={`View details for ${contact.name}`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <TableCell className='py-2'>
                                        <div className='flex flex-col min-w-0'>
                                            <span className="text-strong font-medium">{contact.name}</span>
                                            <span className="text-muted text-xs">{contact.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className='flex items-center space-x-2 min-w-0'>
                                            <a 
                                                href={`mailto:${contact.email}`} 
                                                className="text-default hover:text-strong underline-offset-4 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {contact.email}
                                            </a>
                                            <div className='flex-shrink-0'>
                                                {contact.email_verified_status ? (
                                                    <div className='flex items-center gap-1'>
                                                        <CheckCircle2 className='h-3 w-3 text-green-600' />
                                                        <span className='text-xs text-green-600 font-medium'>
                                                            Verified
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className='flex items-center gap-1'>
                                                        <XCircle className='h-3 w-3 text-amber-500' />
                                                        <span className='text-xs text-amber-600 font-medium'>
                                                            Unverified
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className="flex flex-wrap gap-1">
                                            {contact.outlets.slice(0, 2).map(outlet => (
                                                <Badge key={outlet.id} variant="quiet" className="mr-1">
                                                    {outlet.name}
                                                </Badge>
                                            ))}
                                            {contact.outletCount > 2 && (
                                                <Badge variant="quiet" className="mr-1">
                                                    +{contact.outletCount - 2}
                                                </Badge>
                                            )}
                                            {contact.outlets.length === 0 && (
                                                <span className="text-subtle text-xs">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className="flex flex-wrap gap-1">
                                            {contact.beats.slice(0, 2).map(beat => (
                                                <Badge key={beat.id} variant="quiet" className="mr-1">
                                                    {beat.name}
                                                </Badge>
                                            ))}
                                            {contact.beatCount > 2 && (
                                                <Badge variant="quiet" className="mr-1">
                                                    +{contact.beatCount - 2}
                                                </Badge>
                                            )}
                                            {contact.beats.length === 0 && (
                                                <span className="text-subtle text-xs">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className="flex flex-wrap gap-1">
                                            {contact.countries.slice(0, 2).map(country => (
                                                <Badge key={country.id} variant="quiet" className="mr-1">
                                                    {country.name}
                                                </Badge>
                                            ))}
                                            {contact.countryCount > 2 && (
                                                <Badge variant="quiet" className="mr-1">
                                                    +{contact.countryCount - 2}
                                                </Badge>
                                            )}
                                            {contact.countries.length === 0 && (
                                                <span className="text-subtle text-xs">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <time className="text-subtle text-xs">
                                            {(() => {
                                                // Handle potential invalid dates gracefully
                                                const dateValue = contact.updated_at;
                                                if (!dateValue) return 'N/A';
                                                
                                                const date = new Date(dateValue);
                                                if (isNaN(date.getTime())) {
                                                    console.warn('Invalid date value:', dateValue);
                                                    return 'Invalid Date';
                                                }
                                                
                                                return date.toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                });
                                            })()}
                                        </time>
                                    </TableCell>
                                    <TableCell
                                        className='py-2 text-right'
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant='ghost'
                                                    className='h-8 w-8 p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                                                >
                                                    <span className='sr-only'>
                                                        Open menu
                                                    </span>
                                                    <MoreHorizontal className='h-4 w-4' />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align='end'
                                                className='w-40'
                                            >
                                                <DropdownMenuLabel className='text-xs'>
                                                    Actions
                                                </DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(
                                                            contact.email,
                                                        );
                                                        toast.success(
                                                            'Email copied',
                                                        );
                                                    }}
                                                    className='text-xs'
                                                >
                                                    <Copy className='mr-2 h-3 w-3' />
                                                    Copy Email
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onViewContact(contact)
                                                    }
                                                    className='text-xs'
                                                >
                                                    <Eye className='mr-2 h-3 w-3' />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onEditContact(contact)
                                                    }
                                                    className='text-xs'
                                                >
                                                    <Pencil className='mr-2 h-3 w-3' />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className='text-red-600 hover:!text-red-600 text-xs'
                                                    onClick={() =>
                                                        onDeleteContact(contact)
                                                    }
                                                >
                                                    <Trash2 className='mr-2 h-3 w-3' />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                    <EmptyState
                                        icon={<Search className="h-8 w-8" />}
                                        title="No contacts found"
                                        description={searchTerm || countryIds.length > 0 || beatIds.length > 0 || outletIds.length > 0 || regionCodes.length > 0 || languageCodes.length > 0 || emailVerified !== 'all'
                                            ? "Try adjusting your search criteria or filters to find what you're looking for."
                                            : "Get started by adding your first media contact to the database."}
                                        className="py-12"
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {(totalCount > 0 || isLoading) &&
                onPageChange &&
                onPageSizeChange && (
                    <EnhancedPagination
                        currentPage={page}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalCount={totalCount}
                        onPageChange={onPageChange}
                        onPageSizeChange={onPageSizeChange}
                        isLoading={isLoading}
                    />
                )}
        </FadeIn>
    );
}
