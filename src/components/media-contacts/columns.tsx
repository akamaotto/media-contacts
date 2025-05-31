"use client"; // Column definitions often involve interactions or components that need to be client-side

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, CheckCircle2, XCircle } from "lucide-react"; // Added CheckCircle2 and XCircle for email status

// Assuming ShadCN UI components are available.
// If not, these will need to be added via `npx shadcn-ui@latest add <component_name>`
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge"; // For displaying outlets, beats, countries

// This type should match the data structure passed to the table.
// It should align with the `MediaContactDisplay` type in `page.tsx`.

// Interface for actions passed to the getColumns function
export interface ColumnActions {
  onEditContact: (contact: MediaContactTableItem) => void;
  onDeleteContact: (contact: MediaContactTableItem) => void;
}
export interface MediaContactTableItem {
  id: string;
  name: string;
  email: string;
  title: string;
  email_verified_status: boolean;
  updated_at: Date | string; // Prisma returns Date, can be string if serialized
  outlets: { id: string; name: string }[];
  countries: { id: string; name: string }[];
  beats: { id: string; name: string }[];
  bio?: string | null; // Optional and can be null
  socials?: string[] | null; // Optional and can be null
}

// Educational Comment:
// Column Definitions (`ColumnDef`) are the core of TanStack Table.
// - `accessorKey`: Directly maps to a key in your data objects.
// - `id`: A unique ID for the column, especially useful if not using `accessorKey` (e.g., for action columns).
// - `header`: Defines the content of the header cell. Can be a string or a render function.
//   The render function receives props like `column` for enabling sorting.
// - `cell`: Defines the content of a data cell. Receives props like `row` to access row data.
// - `enableSorting`, `enableHiding`: Control built-in table features.

export const getColumns = (actions: ColumnActions): ColumnDef<MediaContactTableItem>[] => [
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
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const name = row.original.name;
      const title = row.original.title;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const email = row.original.email;
      const isVerified = row.original.email_verified_status;
      return (
        <div className="flex items-center">
          <span className="lowercase">{email}</span>
          {isVerified ? (
            <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="ml-2 h-4 w-4 text-red-500" />
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
    accessorKey: "outlets",
    header: "Outlets",
    cell: ({ row }) => {
      const outlets = row.original.outlets || [];
      if (!outlets.length) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {outlets.slice(0, 2).map(outlet => (
            <Badge key={outlet.id} variant="outline" className="font-normal">
              {outlet.name}
            </Badge>
          ))}
          {outlets.length > 2 && (
            <Badge variant="outline" className="font-normal">
              +{outlets.length - 2} more
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "beats",
    header: "Beats",
    cell: ({ row }) => {
      const beats = row.original.beats || [];
      if (!beats.length) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {beats.slice(0, 2).map(beat => (
            <Badge key={beat.id} variant="secondary" className="font-normal">
              {beat.name}
            </Badge>
          ))}
          {beats.length > 2 && (
            <Badge variant="secondary" className="font-normal">
              +{beats.length - 2} more
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "countries",
    header: "Countries",
    cell: ({ row }) => {
      const countries = row.original.countries || [];
      if (!countries.length) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {countries.slice(0, 2).map(country => (
            <Badge key={country.id} variant="outline" className="font-normal bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
              {country.name}
            </Badge>
          ))}
          {countries.length > 2 && (
            <Badge variant="outline" className="font-normal bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
              +{countries.length - 2} more
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Updated
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("updated_at");
      return (
        <div className="text-sm text-muted-foreground">
          {date ? new Date(date as string).toLocaleDateString() : '-'}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const contact = row.original; // Full data for the row

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(contact.email)}
              >
                Copy Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                // Placeholder for future "View Details" functionality
                onClick={() => alert(`View details for: ${contact.name}`)}
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onEditContact(contact)}
              >
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 hover:!text-red-600 focus:!text-red-600 focus:!bg-red-50"
                onClick={() => actions.onDeleteContact(contact)}
              >
                Delete Contact
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
