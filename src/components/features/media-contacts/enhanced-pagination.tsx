'use client';

import React from 'react';
import {Button} from '@/components/ui/button';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import {PaginationProps} from './types';

// Use the consolidated type from types.ts
type EnhancedPaginationProps = PaginationProps;

/**
 * Enhanced pagination component for Media Contacts with 1-based indexing
 * Includes comprehensive navigation and page size controls
 */
export function EnhancedPagination({
    currentPage,
    totalPages,
    pageSize,
    totalCount,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    isLoading = false,
}: EnhancedPaginationProps): React.ReactElement {
    const handlePageSizeChange = (newPageSize: number) => {
        onPageSizeChange(newPageSize);
        // Reset to page 1 when page size changes
        if (currentPage > 1) {
            onPageChange(1);
        }
    };

    const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    return (
        <div className='flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4'>
            <div className='flex flex-1 items-center'>
                <div className='flex items-center space-x-2'>
                    <p className='text-sm font-medium text-gray-700'>
                        Rows per page
                    </p>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                            const numValue = Number(value);
                            if (!Number.isNaN(numValue)) {
                                handlePageSizeChange(numValue);
                            }
                        }}
                        disabled={isLoading}
                    >
                        <SelectTrigger className='h-8 w-[70px] border-gray-300'>
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side='top'>
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className='ml-4 text-sm text-gray-700'>
                    {totalCount === 0
                        ? 'No contacts found'
                        : `Showing ${startItem} to ${endItem} of ${totalCount} contacts`}
                </div>
            </div>

            <div className='flex items-center space-x-2'>
                <div className='text-sm text-gray-700 mr-4'>
                    Page {currentPage} of {totalPages}
                </div>

                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => onPageChange(1)}
                                disabled={currentPage === 1 || isLoading}
                                aria-label='Go to first page'
                            >
                                <ChevronsLeft className='h-4 w-4' />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1 || isLoading}
                                aria-label='Go to previous page'
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={
                                    currentPage >= totalPages ||
                                    totalCount === 0 ||
                                    isLoading
                                }
                                aria-label='Go to next page'
                            >
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => onPageChange(totalPages)}
                                disabled={
                                    currentPage >= totalPages ||
                                    totalCount === 0 ||
                                    isLoading
                                }
                                aria-label='Go to last page'
                            >
                                <ChevronsRight className='h-4 w-4' />
                            </Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
}
