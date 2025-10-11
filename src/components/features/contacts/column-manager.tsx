/**
 * ColumnManager Component
 * Interface for managing table column visibility and configuration
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  IconGripVertical, 
  IconEye, 
  IconEyeOff, 
  IconRotateClockwise,
  IconLayoutColumns,
  IconSettings
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ColumnManagerProps, TableColumn } from './types';

interface ColumnItemProps {
  column: TableColumn;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onReorder: (direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
}

function ColumnItem({
  column,
  isVisible,
  onToggleVisibility,
  onReorder,
  isFirst,
  isLast,
}: ColumnItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onReorder('up')}
          disabled={isFirst}
        >
          <IconGripVertical className="h-3 w-3 rotate-180" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onReorder('down')}
          disabled={isLast}
        >
          <IconGripVertical className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex-1 flex items-center gap-3">
        <Checkbox
          id={`column-${column.id}`}
          checked={isVisible}
          onCheckedChange={onToggleVisibility}
        />
        
        <div className="flex-1">
          <Label 
            htmlFor={`column-${column.id}`}
            className="cursor-pointer font-medium"
          >
            {column.label}
          </Label>
          
          <div className="flex items-center gap-2 mt-1">
            {column.sortable && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                Sortable
              </span>
            )}
            
            {column.filterable && (
              <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                Filterable
              </span>
            )}
            
            {column.resizable && (
              <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                Resizable
              </span>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          className="h-8 w-8 p-0"
        >
          {isVisible ? (
            <IconEye className="h-4 w-4" />
          ) : (
            <IconEyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function ColumnManager({
  columns,
  onColumnsChange,
  isOpen,
  onClose,
}: ColumnManagerProps) {
  const [localColumns, setLocalColumns] = useState<TableColumn[]>(columns);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local columns when props change
  React.useEffect(() => {
    setLocalColumns(columns);
    setHasChanges(false);
  }, [columns]);

  const handleToggleVisibility = (columnId: string) => {
    setLocalColumns(prev => 
      prev.map(column => 
        column.id === columnId 
          ? { ...column, visible: !column.visible }
          : column
      )
    );
    setHasChanges(true);
  };

  const handleReorder = (columnId: string, direction: 'up' | 'down') => {
    setLocalColumns(prev => {
      const newColumns = [...prev];
      const index = newColumns.findIndex(column => column.id === columnId);
      
      if (direction === 'up' && index > 0) {
        [newColumns[index], newColumns[index - 1]] = [newColumns[index - 1], newColumns[index]];
      } else if (direction === 'down' && index < newColumns.length - 1) {
        [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
      }
      
      return newColumns;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    onColumnsChange(localColumns);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    // Reset to default configuration
    const defaultColumns = [
      { id: 'name', label: 'Name', sortable: true, filterable: true, visible: true },
      { id: 'title', label: 'Title', sortable: true, filterable: true, visible: true },
      { id: 'company', label: 'Company', sortable: true, filterable: true, visible: true },
      { id: 'email', label: 'Email', sortable: true, filterable: true, visible: true },
      { id: 'confidenceScore', label: 'Confidence', sortable: true, filterable: true, visible: true },
      { id: 'verificationStatus', label: 'Status', sortable: true, filterable: true, visible: true },
      { id: 'sourceUrl', label: 'Source', sortable: true, filterable: true, visible: false },
      { id: 'createdAt', label: 'Found Date', sortable: true, filterable: true, visible: false },
    ];
    
    setLocalColumns(defaultColumns);
    setHasChanges(true);
  };

  const handleSelectAll = (visible: boolean) => {
    setLocalColumns(prev => 
      prev.map(column => ({ ...column, visible }))
    );
    setHasChanges(true);
  };

  const visibleCount = localColumns.filter(column => column.visible).length;
  const totalCount = localColumns.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconLayoutColumns className="h-5 w-5" />
            Manage Columns
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <IconSettings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {visibleCount} of {totalCount} columns visible
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(true)}
                disabled={visibleCount === totalCount}
              >
                Select All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(false)}
                disabled={visibleCount === 0}
              >
                Deselect All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <IconRotateClockwise className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Column List */}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {localColumns.map((column, index) => (
                <ColumnItem
                  key={column.id}
                  column={column}
                  isVisible={column.visible}
                  onToggleVisibility={() => handleToggleVisibility(column.id)}
                  onReorder={(direction) => handleReorder(column.id, direction)}
                  isFirst={index === 0}
                  isLast={index === localColumns.length - 1}
                />
              ))}
            </div>
          </ScrollArea>
          
          <Separator />
          
          {/* Tips */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <IconSettings className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Drag columns to reorder them</li>
                  <li>• Toggle visibility by clicking the eye icon</li>
                  <li>• Use checkboxes to quickly show/hide columns</li>
                  <li>• Column settings are saved automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? 'You have unsaved changes' : 'No changes'}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact column manager for inline use
export function ColumnManagerCompact({
  columns,
  onColumnsChange,
  isOpen,
  onClose,
}: ColumnManagerProps) {
  const [localColumns, setLocalColumns] = useState<TableColumn[]>(columns);

  React.useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  const handleToggleVisibility = (columnId: string) => {
    const newColumns = localColumns.map(column => 
      column.id === columnId 
        ? { ...column, visible: !column.visible }
        : column
    );
    setLocalColumns(newColumns);
    onColumnsChange(newColumns);
  };

  const visibleCount = localColumns.filter(column => column.visible).length;

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          Columns ({visibleCount} visible)
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <IconSettings className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {localColumns.slice(0, 5).map((column) => (
          <div key={column.id} className="flex items-center gap-2">
            <Checkbox
              id={`compact-column-${column.id}`}
              checked={column.visible}
              onCheckedChange={() => handleToggleVisibility(column.id)}
            />
            <Label 
              htmlFor={`compact-column-${column.id}`}
              className="text-sm cursor-pointer"
            >
              {column.label}
            </Label>
          </div>
        ))}
        
        {localColumns.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full justify-start text-sm"
          >
            Show {localColumns.length - 5} more columns...
          </Button>
        )}
      </div>
    </div>
  );
}

export default ColumnManager;