'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Download, 
  Tag, 
  MoreHorizontal,
  X,
  CheckCircle2,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedIds: string[];
  totalSelected: number;
  onClearSelection: () => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkExport: (ids: string[]) => Promise<void>;
  onBulkTag: (ids: string[], tags: string[]) => Promise<void>;
  className?: string;
}

/**
 * Enhanced Bulk Actions Bar
 * Provides intuitive bulk operations with smooth animations
 */
export function BulkActionsBar({
  selectedIds,
  totalSelected,
  onClearSelection,
  onBulkDelete,
  onBulkExport,
  onBulkTag,
  className
}: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = useCallback(async (
    action: () => Promise<void>,
    successMessage: string
  ) => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      await action();
      toast.success(successMessage);
      onClearSelection();
    } catch (error) {
      toast.error('Operation failed. Please try again.');
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, onClearSelection]);

  if (selectedIds.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
      "bg-background border border-border rounded-lg shadow-lg px-4 py-3",
      "animate-in slide-in-from-bottom-2 duration-300",
      "min-w-[320px] max-w-md",
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {totalSelected} selected
          </Badge>
          
          <div className="flex items-center gap-1">
            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleBulkAction(
                () => onBulkExport(selectedIds),
                `Exported ${totalSelected} contacts`
              )}
              className="h-8 gap-1"
            >
              <Download className="h-3 w-3" />
              Export
            </Button>

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => handleBulkAction(
                    () => onBulkTag(selectedIds, ['verified']),
                    `Marked ${totalSelected} contacts as verified`
                  )}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Mark as Verified
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => handleBulkAction(
                    () => onBulkTag(selectedIds, ['priority']),
                    `Tagged ${totalSelected} contacts as priority`
                  )}
                  className="gap-2"
                >
                  <Tag className="h-4 w-4" />
                  Add Priority Tag
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${totalSelected} contacts? This action cannot be undone.`)) {
                      handleBulkAction(
                        () => onBulkDelete(selectedIds),
                        `Deleted ${totalSelected} contacts`
                      );
                    }
                  }}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 w-8 p-0 hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface SelectableTableRowProps {
  children: React.ReactNode;
  id: string;
  isSelected: boolean;
  onSelectionChange: (id: string, selected: boolean) => void;
  className?: string;
  [key: string]: any; // Allow other table row props
}

/**
 * Enhanced Selectable Table Row
 * Provides smooth selection interactions with visual feedback
 */
export function SelectableTableRow({
  children,
  id,
  isSelected,
  onSelectionChange,
  className,
  ...props
}: SelectableTableRowProps) {
  return (
    <tr
      className={cn(
        "transition-all duration-200",
        isSelected && "bg-muted/50 border-l-4 border-l-primary",
        className
      )}
      {...props}
    >
      <td className="w-12 pl-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(id, !!checked)}
          aria-label={`Select row ${id}`}
          className="transition-all duration-200"
        />
      </td>
      {children}
    </tr>
  );
}

interface BulkSelectionHeaderProps {
  totalItems: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
  className?: string;
}

/**
 * Enhanced Bulk Selection Header
 * Provides intuitive select-all functionality
 */
export function BulkSelectionHeader({
  totalItems,
  selectedCount,
  onSelectAll,
  onClearAll,
  className
}: BulkSelectionHeaderProps) {
  const isAllSelected = selectedCount === totalItems && totalItems > 0;
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalItems;

  return (
    <th className={cn("w-12 pl-4", className)}>
      <Checkbox
        checked={isAllSelected}
        ref={(el) => {
          if (el && 'indeterminate' in el) {
            (el as any).indeterminate = isPartiallySelected;
          }
        }}
        onCheckedChange={(checked) => {
          if (checked) {
            onSelectAll();
          } else {
            onClearAll();
          }
        }}
        aria-label={
          isAllSelected
            ? "Deselect all"
            : isPartiallySelected
            ? "Select all"
            : "Select all"
        }
        className="transition-all duration-200"
      />
    </th>
  );
}

/**
 * Hook for managing bulk selection state
 */
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectionChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const selectedItems = items.filter(item => selectedIds.has(item.id));

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    selectedItems,
    isSelected,
    handleSelectionChange,
    selectAll,
    clearSelection
  };
}