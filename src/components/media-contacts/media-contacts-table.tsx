import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card"; // CardHeader and CardTitle removed by user
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


import { MediaContactTableItem, getColumns } from "./columns";
import { UpdateMediaContactSheet } from "./update-media-contact-sheet";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";
import { getCountries, Country } from "@/app/actions/country-actions"; // Will be used by MediaContactsFilters, but props come from here
import { getBeats, Beat } from "@/app/actions/beat-actions"; // Will be used by MediaContactsFilters, but props come from here
import { MediaContactsFilters, MediaContactsFiltersProps } from "./media-contacts-filters";
import { cn } from "@/lib/utils";

import {
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckIcon,
  ChevronsUpDownIcon,
  PlusCircle,
  X as XIcon, // For Clear All button
} from "lucide-react";

interface MediaContactsTableProps {
  data: MediaContactTableItem[];
  onDataRefresh: () => void;
  onEditContact: (contact: MediaContactTableItem) => void;
}

export function MediaContactsTable({ data, onDataRefresh, onEditContact }: MediaContactsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [contactToDelete, setContactToDelete] = useState<MediaContactTableItem | null>(null);

  // Main search term
  const [mainSearchTerm, setMainSearchTerm] = useState('');

  // Filter states
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [allBeats, setAllBeats] = useState<Beat[]>([]);
  const [selectedCountryIds, setSelectedCountryIds] = useState<string[]>([]);
  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>([]);
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  // State for individual filter popovers/dropdowns
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isBeatDropdownOpen, setIsBeatDropdownOpen] = useState(false);
  const [searchFilterCountryTerm, setSearchFilterCountryTerm] = useState('');
  const [searchFilterBeatTerm, setSearchFilterBeatTerm] = useState('');

  useEffect(() => {
    async function fetchFiltersData() {
      try {
        const [fetchedCountries, fetchedBeats] = await Promise.all([
          getCountries(),
          getBeats(),
        ]);
        setAllCountries(fetchedCountries || []);
        setAllBeats(fetchedBeats || []);
      } catch (error) {
        console.error("Failed to fetch data for filters:", error);
        setAllCountries([]);
        setAllBeats([]);
      }
    }
    fetchFiltersData();
  }, []);

  const calculateActiveFiltersCount = () => {
    let count = 0;
    if (selectedCountryIds.length > 0) count++;
    if (selectedBeatIds.length > 0) count++;
    if (emailVerifiedFilter !== 'all') count++;
    if (mainSearchTerm) count++; // Optionally count main search as a filter
    return count;
  };
  const activeFiltersCount = calculateActiveFiltersCount();

  const handleClearAllFilters = () => {
    setMainSearchTerm('');
    setSelectedCountryIds([]);
    setSelectedBeatIds([]);
    setEmailVerifiedFilter('all');
    setSearchFilterCountryTerm('');
    setSearchFilterBeatTerm('');
    setIsCountryDropdownOpen(false);
    setIsBeatDropdownOpen(false);
  };
  
  /**
   * Handle initiating contact deletion process
   * Sets up the contact to delete and opens the confirmation modal
   */
  const handleDeleteContact = (contact: MediaContactTableItem) => {
    setContactToDelete(contact);
    setIsDeleteModalOpen(true);
  };

  /**
   * Handle successful deletion
   * Triggers data refresh and resets delete state
   */
  const handleDeleteComplete = () => {
    onDataRefresh();
    setContactToDelete(null);
  };

  const columns = useMemo(() => {
    return getColumns({
      onEditContact,
      onDeleteContact: handleDeleteContact,
    });
  }, [onEditContact]);

  const filteredData = useMemo(() => {
    let currentData = data;
    if (mainSearchTerm) {
      currentData = currentData.filter(contact => {
        const term = mainSearchTerm.toLowerCase();
        return (
          contact.name?.toLowerCase().includes(term) ||
          contact.email?.toLowerCase().includes(term) ||
          contact.title?.toLowerCase().includes(term) ||
          contact.outlets?.some(outlet => outlet.name.toLowerCase().includes(term)) ||
          contact.beats?.some(beat => beat.name.toLowerCase().includes(term))
        );
      });
    }
    if (selectedCountryIds.length > 0) {
      currentData = currentData.filter(contact =>
        contact.countries?.some(country => selectedCountryIds.includes(country.id))
      );
    }
    if (selectedBeatIds.length > 0) {
      currentData = currentData.filter(contact =>
        contact.beats?.some(beat => selectedBeatIds.includes(beat.id))
      );
    }
    if (emailVerifiedFilter !== 'all') {
      const mustBeVerified = emailVerifiedFilter === 'verified';
      currentData = currentData.filter(contact => contact.email_verified_status === mustBeVerified);
    }
    return currentData;
  }, [data, mainSearchTerm, selectedCountryIds, selectedBeatIds, emailVerifiedFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full space-y-4">
      <MediaContactsFilters
        mainSearchTerm={mainSearchTerm}
        setMainSearchTerm={setMainSearchTerm}
        allCountries={allCountries}
        selectedCountryIds={selectedCountryIds}
        setSelectedCountryIds={setSelectedCountryIds}
        isCountryDropdownOpen={isCountryDropdownOpen}
        setIsCountryDropdownOpen={setIsCountryDropdownOpen}
        searchFilterCountryTerm={searchFilterCountryTerm}
        setSearchFilterCountryTerm={setSearchFilterCountryTerm}
        allBeats={allBeats}
        selectedBeatIds={selectedBeatIds}
        setSelectedBeatIds={setSelectedBeatIds}
        isBeatDropdownOpen={isBeatDropdownOpen}
        setIsBeatDropdownOpen={setIsBeatDropdownOpen}
        searchFilterBeatTerm={searchFilterBeatTerm}
        setSearchFilterBeatTerm={setSearchFilterBeatTerm}
        emailVerifiedFilter={emailVerifiedFilter}
        setEmailVerifiedFilter={setEmailVerifiedFilter}
        activeFiltersCount={activeFiltersCount}
        handleClearAllFilters={handleClearAllFilters}
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
            <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                table.setPageSize(Number(value));
                }}
            >
                <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        contactId={contactToDelete?.id || null}
        contactName={contactToDelete?.name || null}
        onDeleteComplete={handleDeleteComplete}
      />
    </div>
  );
}