"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface MediaContactsPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  setCurrentPage?: (page: number) => void;
  setPageSize?: (size: number) => void;
}

/**
 * Reusable pagination component for Media Contacts pages.
 * Extracted from MediaContactsTable to improve modularity.
 */
export function MediaContactsPagination({
  currentPage,
  pageSize,
  totalCount,
  setCurrentPage,
  setPageSize,
}: MediaContactsPaginationProps): React.ReactElement {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize || 1));

  // Helper to safely invoke setter functions (they may be undefined in read-only contexts)
  const safeSetCurrentPage = (page: number) => {
    if (typeof setCurrentPage === "function") {
      setCurrentPage(page);
    }
  };

  const safeSetPageSize = (size: number) => {
    if (typeof setPageSize === "function") {
      setPageSize(size);
      // Whenever page size changes, reset to first page
      // Also trigger parent update to fetch data with new size
      safeSetCurrentPage(0);
    }
  };

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
      <div className="flex flex-1 items-center">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-gray-700">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              const numValue = Number(value);
              if (!Number.isNaN(numValue)) {
                safeSetPageSize(numValue);
              }
            }}
          >
            <SelectTrigger className="h-8 w-[70px] border-gray-300">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-4 text-sm text-gray-700">
          {`Showing ${Math.min(currentPage * pageSize + 1, totalCount || 0)} to ${Math.min(
            (currentPage + 1) * pageSize,
            totalCount || 0,
          )} of ${totalCount || 0} contacts`}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => safeSetCurrentPage(0)}
                disabled={currentPage === 0 || !setCurrentPage}
                aria-label="Go to first page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => safeSetCurrentPage(currentPage - 1)}
                disabled={currentPage === 0 || !setCurrentPage}
                aria-label="Go to previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => safeSetCurrentPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1 || totalCount === 0 || !setCurrentPage}
                aria-label="Go to next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => safeSetCurrentPage(pageCount - 1)}
                disabled={currentPage >= pageCount - 1 || totalCount === 0 || !setCurrentPage}
                aria-label="Go to last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
