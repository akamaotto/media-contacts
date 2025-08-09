'use client'; // Column definitions often involve interactions or components that need to be client-side

import {ColumnDef} from '@tanstack/react-table';
import {
    MoreHorizontal,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Pencil,
    Trash2,
    Copy,
    Eye,
} from 'lucide-react'; // Added icons for all actions
import {toast} from 'sonner'; // Import toast for notifications

// Assuming ShadCN UI components are available.
// If not, these will need to be added via `npx shadcn-ui@latest add <component_name>`
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Badge} from '@/components/ui/badge'; // For displaying outlets, beats, countries

// Import all types from the consolidated types file
import type {
    MediaContactTableItem,
    ColumnActions,
    Country,
    Beat,
    Outlet,
} from './types';

// Educational Comment:
// Column Definitions (`ColumnDef`) are the core of TanStack Table.
// - `accessorKey`: Directly maps to a key in your data objects.
// - `id`: A unique ID for the column, especially useful if not using `accessorKey` (e.g., for action columns).
// - `header`: Defines the content of the header cell. Can be a string or a render function.
//   The render function receives props like `column` for enabling sorting.
// - `cell`: Defines the content of a data cell. Receives props like `row` to access row data.
// - `enableSorting`, `enableHiding`: Control built-in table features.

export const getColumns = (
    actions: ColumnActions,
): ColumnDef<MediaContactTableItem>[] => [
    // Optional: Row selection column
    // {
    //   id: "select",
    //   header: ({ table }) => (
    //     <Checkbox
    //       checked={
    //         table.getIsAllPageRowsSelected() ||
    //         (table.getIsSomePageRowsSelected() && "indeterminate")
    //       }
    //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //       aria-label="Select all"
    //       className="translate-y-[2px]"
    //     />
    //   ),
    //   cell: ({ row }) => (
    //     <Checkbox
    //       checked={row.getIsSelected()}
    //       onCheckedChange={(value) => row.toggleSelected(!!value)}
    //       aria-label="Select row"
    //       className="translate-y-[2px]"
    //     />
    //   ),
    //   enableSorting: false,
    //   enableHiding: false,
    // },
    {
        accessorKey: 'name',
        header: ({column}) => (
            <Button
                variant='ghost'
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            >
                Name
                <ArrowUpDown className='ml-2 h-4 w-4' />
            </Button>
        ),
        cell: ({row}) => {
            const name = row.original.name;
            const title = row.original.title;
            return (
                <div className='flex flex-col'>
                    <span className='font-medium'>{name}</span>
                    <span className='text-xs text-muted-foreground'>
                        {title}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: 'email',
        header: ({column}) => (
            <Button
                variant='ghost'
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            >
                Email
                <ArrowUpDown className='ml-2 h-4 w-4' />
            </Button>
        ),
        cell: ({row}) => {
            // Following Rust-inspired explicit validation approach
            const email = row.original.email || '';
            const isVerified = Boolean(row.original.email_verified_status);

            return (
                <div className='flex items-center space-x-2'>
                    <span className='text-sm'>{email}</span>
                    {isVerified ? (
                        <div className='relative group'>
                            <CheckCircle2 className='h-4 w-4 text-green-600' />
                            <span className='absolute z-50 hidden group-hover:inline-block bg-black text-white text-xs rounded py-1 px-2 left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap'>
                                Email verified
                            </span>
                        </div>
                    ) : (
                        <div className='relative group'>
                            <XCircle className='h-4 w-4 text-amber-500' />
                            <span className='absolute z-50 hidden group-hover:inline-block bg-black text-white text-xs rounded py-1 px-2 left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap'>
                                Email unverified
                            </span>
                        </div>
                    )}
                </div>
            );
        },
    },
    // Example for a more complex field like 'outlets' if you pass them:
    // {
    //   accessorKey: "outlets",
    //   header: "Outlets",
    //   cell: ({ row }) => {
    //     const outlets = row.original.outlets || []; // Access via row.original for complex types
    //     return (
    //       <div className="truncate max-w-xs">
    //         {outlets.map(outlet => outlet.name).join(", ")}
    //       </div>
    //     );
    //   },
    //   enableSorting: false, // Sorting on array/object fields needs custom logic
    // },
    {
        accessorKey: 'outlets',
        header: 'Outlets',
        cell: ({row}) => {
            const outlets = row.original.outlets || [];
            if (!outlets.length)
                return <span className='text-muted-foreground'>-</span>;
            return (
                <div className='flex flex-wrap gap-1 max-w-xs'>
                    {outlets.slice(0, 2).map((outlet) => (
                        <Badge
                            key={outlet.id}
                            variant='outline'
                            className='text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200'
                        >
                            {outlet.name}
                        </Badge>
                    ))}
                    {outlets.length > 2 && (
                        <Badge variant='outline' className='font-normal'>
                            +{outlets.length - 2} more
                        </Badge>
                    )}
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: 'beats',
        header: 'Beats',
        cell: ({row}) => {
            const beats = row.original.beats || [];
            if (!beats.length)
                return <span className='text-muted-foreground'>-</span>;
            return (
                <div className='flex flex-wrap gap-1 max-w-xs'>
                    {beats.slice(0, 2).map((beat) => (
                        <Badge
                            key={beat.id}
                            variant='outline'
                            className='text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                        >
                            {beat.name}
                        </Badge>
                    ))}
                    {beats.length > 2 && (
                        <Badge
                            variant='outline'
                            className='text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                        >
                            +{beats.length - 2} more
                        </Badge>
                    )}
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: 'countries',
        header: 'Countries',
        cell: ({row}) => {
            const countries = row.original.countries || [];
            if (!countries.length)
                return <span className='text-muted-foreground'>-</span>;
            return (
                <div className='flex flex-wrap gap-1 max-w-xs'>
                    {countries.slice(0, 2).map((country) => (
                        <Badge
                            key={country.id}
                            variant='outline'
                            className='text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                        >
                            {country.name}
                        </Badge>
                    ))}
                    {countries.length > 2 && (
                        <Badge
                            variant='outline'
                            className='text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                        >
                            +{countries.length - 2} more
                        </Badge>
                    )}
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: 'updated_at',
        header: ({column}) => (
            <Button
                variant='ghost'
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            >
                Updated
                <ArrowUpDown className='ml-2 h-4 w-4' />
            </Button>
        ),
        cell: ({row}) => {
            const date = row.getValue('updated_at');
            // Following Rust-inspired explicit validation for date handling
            if (!date)
                return <div className='text-sm text-muted-foreground'>-</div>;

            try {
                // Format date with more detailed information
                const formattedDate = new Date(
                    date as string,
                ).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });
                return (
                    <div className='text-sm text-muted-foreground'>
                        {formattedDate}
                    </div>
                );
            } catch (error) {
                console.error('Error formatting date:', error);
                return (
                    <div className='text-sm text-muted-foreground'>
                        Invalid date
                    </div>
                );
            }
        },
    },
    {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({row}) => {
            const contact = row.original; // Full data for the row

            return (
                <div className='text-right'>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant='ghost' className='h-8 w-8 p-0'>
                                <span className='sr-only'>Open menu</span>
                                <MoreHorizontal className='h-4 w-4' />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => {
                                    navigator.clipboard.writeText(
                                        contact.email,
                                    );
                                    toast.success(`Email copied to clipboard`, {
                                        description: `${contact.email} for ${contact.name} has been copied`,
                                    });
                                }}
                            >
                                <Copy className='mr-2 h-4 w-4' />
                                <span>Copy Email</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() =>
                                    actions.onViewContact(row.original)
                                }
                            >
                                <Eye className='mr-2 h-4 w-4' />
                                <span>View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => actions.onEditContact(contact)}
                            >
                                <Pencil className='mr-2 h-4 w-4' />
                                <span>Edit Contact</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className='text-red-600 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50'
                                onClick={() => actions.onDeleteContact(contact)}
                            >
                                <Trash2 className='mr-2 h-4 w-4' />
                                <span>Delete Contact</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
        enableSorting: false,
        enableHiding: false,
    },
];
