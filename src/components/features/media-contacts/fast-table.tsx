'use client';

import {useState, useEffect, useCallback} from 'react';
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
    onEditContact: (contact: FastTableContact) => void;
    onDeleteContact: (contact: FastTableContact) => void;
    onViewContact: (contact: FastTableContact) => void;
    onDataChange?: (totalCount: number) => void;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
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
    onEditContact,
    onDeleteContact,
    onViewContact,
    onDataChange,
    onPageChange,
    onPageSizeChange,
}: FastTableProps) {
    const [data, setData] = useState<FastTableContact[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastQueryTime, setLastQueryTime] = useState<number>(0);

    const fetchData = useCallback(async () => {
        console.log('🚀 [FAST-TABLE] Starting single API call...');
        const fetchStartTime = Date.now();

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

            // SINGLE API CALL - No more multiple requests!
            const response = await fetch(`/api/media-contacts?${params}`);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const result = await response.json();

            setData(result.contacts || []);
            setTotalCount(result.totalCount || 0);
            setTotalPages(result.totalPages || 1);
            setLastQueryTime(result.performance?.totalTime || 0);

            onDataChange?.(result.totalCount || 0);

            const fetchTime = Date.now() - fetchStartTime;
            console.log(
                `✅ [FAST-TABLE] Single API call completed in ${fetchTime}ms (DB: ${result.performance?.queryTime}ms)`,
            );
        } catch (err) {
            console.error('❌ [FAST-TABLE] Fetch error:', err);
            setError(
                err instanceof Error ? err.message : 'Failed to load contacts',
            );
            setData([]);
            setTotalCount(0);
        } finally {
            setIsLoading(false);
        }
    }, [
        searchTerm,
        countryIds,
        beatIds,
        outletIds,
        regionCodes,
        languageCodes,
        emailVerified,
        page,
        pageSize,
        refreshKey, // Add refreshKey to dependencies
        onDataChange,
    ]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className='space-y-4'>
                <div className='rounded-md border'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-[200px]'>
                                    Name
                                </TableHead>
                                <TableHead className='w-[250px]'>
                                    Email
                                </TableHead>
                                <TableHead className='w-[200px]'>
                                    Outlets
                                </TableHead>
                                <TableHead className='w-[180px]'>
                                    Beats
                                </TableHead>
                                <TableHead className='w-[180px]'>
                                    Countries
                                </TableHead>
                                <TableHead className='w-[100px]'>
                                    Updated
                                </TableHead>
                                <TableHead className='w-[50px] text-right'>
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({length: pageSize}).map((_, index) => (
                                <TableRow key={index} className='h-14'>
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
            <div className='rounded-md border p-8 text-center space-y-4'>
                <div className='flex flex-col items-center gap-2'>
                    <XCircle className='h-12 w-12 text-destructive' />
                    <h3 className='text-lg font-semibold text-destructive'>
                        Failed to Load Contacts
                    </h3>
                </div>
                <div className='space-y-2'>
                    <p className='text-sm text-muted-foreground max-w-md mx-auto'>
                        {error.includes('HTTP 500')
                            ? 'There was a server error. Please try again in a moment.'
                            : error.includes('HTTP 404')
                            ? 'The requested data could not be found.'
                            : error.includes('Failed to fetch')
                            ? 'Unable to connect to the server. Please check your internet connection.'
                            : error}
                    </p>
                    {lastQueryTime > 0 && (
                        <p className='text-xs text-muted-foreground'>
                            Last successful load: {Math.round(lastQueryTime)}ms
                            ago
                        </p>
                    )}
                </div>
                <div className='flex gap-2 justify-center'>
                    <Button onClick={fetchData} variant='outline' size='sm'>
                        <RefreshCw className='mr-2 h-4 w-4' />
                        Try Again
                    </Button>
                    <Button
                        onClick={() => window.location.reload()}
                        variant='ghost'
                        size='sm'
                    >
                        Refresh Page
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            <div className='rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='w-[200px]'>Name</TableHead>
                            <TableHead className='w-[250px]'>Email</TableHead>
                            <TableHead className='w-[200px]'>Outlets</TableHead>
                            <TableHead className='w-[180px]'>Beats</TableHead>
                            <TableHead className='w-[180px]'>
                                Countries
                            </TableHead>
                            <TableHead className='w-[100px]'>Updated</TableHead>
                            <TableHead className='w-[50px] text-right'>
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((contact) => (
                                <TableRow
                                    key={contact.id}
                                    className='hover:bg-muted/50 cursor-pointer h-14 focus-within:bg-muted/50'
                                    onClick={() => onViewContact(contact)}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === 'Enter' ||
                                            e.key === ' '
                                        ) {
                                            e.preventDefault();
                                            onViewContact(contact);
                                        }
                                    }}
                                    tabIndex={0}
                                    role='button'
                                    aria-label={`View details for ${contact.name}`}
                                >
                                    <TableCell className='py-2'>
                                        <div className='flex flex-col min-w-0'>
                                            <span className='font-medium truncate'>
                                                {contact.name}
                                            </span>
                                            <span className='text-xs text-muted-foreground truncate'>
                                                {contact.title}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className='flex items-center space-x-2 min-w-0'>
                                            <span className='text-sm truncate'>
                                                {contact.email}
                                            </span>
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
                                        <EnhancedBadgeList
                                            items={contact.outlets}
                                            totalCount={contact.outletCount}
                                            {...BadgePresets.outlets}
                                        />
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <EnhancedBadgeList
                                            items={contact.beats}
                                            totalCount={contact.beatCount}
                                            {...BadgePresets.beats}
                                        />
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <EnhancedBadgeList
                                            items={contact.countries}
                                            totalCount={contact.countryCount}
                                            {...BadgePresets.countries}
                                        />
                                    </TableCell>
                                    <TableCell className='py-2'>
                                        <div className='text-xs text-muted-foreground'>
                                            {new Date(
                                                contact.updated_at,
                                            ).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        className='py-2 text-right'
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant='ghost'
                                                    className='h-8 w-8 p-0'
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
                                <TableCell
                                    colSpan={7}
                                    className='h-24 text-center'
                                >
                                    <p className='text-muted-foreground'>
                                        No contacts found
                                    </p>
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

            {/* Performance indicator - only show in development or when explicitly enabled */}
            {(process.env.NODE_ENV === 'development' ||
                window.location.search.includes('debug=true')) &&
                lastQueryTime > 0 && (
                    <div className='text-xs text-muted-foreground text-center space-y-1'>
                        <div>
                            Loaded {data.length} of {totalCount} contacts in{' '}
                            {lastQueryTime}ms
                        </div>
                        <div className='text-[10px] opacity-75'>
                            Page {page} of {totalPages} • {pageSize} per page
                        </div>
                    </div>
                )}
        </div>
    );
}
