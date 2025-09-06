'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

interface SortableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnKey: string;
  currentSort?: { key: string; dir: 'asc' | 'desc' } | null;
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  enableMultiSort?: boolean;
  title?: string;
}

const SortableHeader = React.forwardRef<HTMLTableCellElement, SortableHeaderProps>(
  (
    {
      columnKey,
      currentSort,
      onSort,
      enableMultiSort = false,
      title,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isSorted = currentSort?.key === columnKey;
    const sortDirection = isSorted ? currentSort.dir : null;
    
    const handleClick = (e: React.MouseEvent) => {
      if (!onSort) return;
      
      let newDir: 'asc' | 'desc' = 'asc';
      
      // If multi-sort is enabled and Shift key is pressed, toggle direction
      if (enableMultiSort && e.shiftKey) {
        if (sortDirection === 'asc') {
          newDir = 'desc';
        } else if (sortDirection === 'desc') {
          // Third click would remove sort, but we'll just toggle for simplicity
          newDir = 'asc';
        }
      } else if (isSorted) {
        // Single sort: toggle direction
        newDir = sortDirection === 'asc' ? 'desc' : 'asc';
      }
      
      onSort(columnKey, newDir);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e as any);
      }
    };
    
    return (
      <th
        ref={ref}
        className={cn(
          'cursor-pointer select-none transition-colors hover:bg-muted/50',
          className
        )}
        aria-sort={
          sortDirection === 'asc'
            ? 'ascending'
            : sortDirection === 'desc'
            ? 'descending'
            : 'none'
        }
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={title}
        {...props}
      >
        <div className="flex items-center justify-between">
          <span className="flex-1">{children}</span>
          <div className="flex items-center">
            {sortDirection === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" data-testid="chevron-up" />
            ) : sortDirection === 'desc' ? (
              <ChevronDown className="ml-2 h-4 w-4" data-testid="chevron-down" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" data-testid="arrow-up-down" />
            )}
          </div>
        </div>
      </th>
    );
  }
);

SortableHeader.displayName = 'SortableHeader';

export { SortableHeader };
export type { SortableHeaderProps };