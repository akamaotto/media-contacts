/**
 * BulkActions Component
 * Toolbar for bulk selection and operations
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  IconCheck, 
  IconDownload, 
  IconX, 
  IconStar, 
  IconStarFilled,
  IconTag,
  IconFolder,
  IconArchive,
  IconTrash,
  IconEyeCheck,
  IconMerge,
  IconDotsVertical,
  IconCheckbox,
  IconSquare
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { BulkActionsProps, BulkActionType, ExportFormat } from './types';

const bulkActionConfig = {
  import: {
    icon: IconDownload,
    label: 'Import',
    description: 'Import selected contacts',
    variant: 'default' as const,
  },
  export: {
    icon: IconDownload,
    label: 'Export',
    description: 'Export selected contacts',
    variant: 'outline' as const,
  },
  tag: {
    icon: IconTag,
    label: 'Add Tags',
    description: 'Add tags to selected contacts',
    variant: 'outline' as const,
  },
  categorize: {
    icon: IconFolder,
    label: 'Categorize',
    description: 'Categorize selected contacts',
    variant: 'outline' as const,
  },
  favorite: {
    icon: IconStar,
    label: 'Favorite',
    description: 'Mark as favorite',
    variant: 'outline' as const,
  },
  archive: {
    icon: IconArchive,
    label: 'Archive',
    description: 'Archive selected contacts',
    variant: 'outline' as const,
  },
  delete: {
    icon: IconTrash,
    label: 'Delete',
    description: 'Delete selected contacts',
    variant: 'destructive' as const,
  },
  verify: {
    icon: IconEyeCheck,
    label: 'Verify',
    description: 'Mark as verified',
    variant: 'outline' as const,
  },
  merge: {
    icon: IconMerge,
    label: 'Merge',
    description: 'Merge duplicate contacts',
    variant: 'outline' as const,
  },
};

const exportFormats: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
  { value: 'vcard', label: 'vCard', description: 'Virtual contact file' },
  { value: 'xlsx', label: 'Excel', description: 'Microsoft Excel format' },
];

export function BulkActions({
  selectedCount,
  totalCount,
  onImport,
  onExport,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  disabled = false,
  loading = false,
}: BulkActionsProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasSelection = selectedCount > 0;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const selectionPercentage = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

  const handleExport = () => {
    onExport(exportFormat);
  };

  const handleBulkAction = (action: BulkActionType) => {
    onBulkAction(action);
  };

  const primaryActions = [
    { type: 'import' as BulkActionType, handler: onImport },
    { type: 'export' as BulkActionType, handler: handleExport },
  ];

  const secondaryActions = [
    { type: 'tag' as BulkActionType },
    { type: 'categorize' as BulkActionType },
    { type: 'favorite' as BulkActionType },
    { type: 'verify' as BulkActionType },
  ];

  const advancedActions = [
    { type: 'archive' as BulkActionType },
    { type: 'merge' as BulkActionType },
    { type: 'delete' as BulkActionType },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Selection Info */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {hasSelection ? (
              <>
                <IconCheckbox className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {selectedCount} of {totalCount} selected
                </span>
                <Badge variant="secondary" className="text-xs">
                  {selectionPercentage}%
                </Badge>
              </>
            ) : (
              <>
                <IconSquare className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  No contacts selected
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isAllSelected ? onClearSelection : onSelectAll}
                  disabled={disabled || totalCount === 0}
                >
                  {isAllSelected ? (
                    <>
                      <IconX className="h-4 w-4 mr-1" />
                      Clear All
                    </>
                  ) : (
                    <>
                      <IconCheck className="h-4 w-4 mr-1" />
                      Select All
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isAllSelected 
                    ? 'Clear all selections' 
                    : `Select all ${totalCount} contacts`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <IconDotsVertical className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showAdvanced ? 'Hide' : 'Show'} advanced actions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-2">
        {primaryActions.map(({ type, handler }) => {
          const config = bulkActionConfig[type];
          const Icon = config.icon;

          return (
            <TooltipProvider key={type}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={config.variant}
                    size="sm"
                    onClick={handler}
                    disabled={disabled || loading || !hasSelection}
                    loading={loading}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {config.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Export Format Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Export as:</span>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exportFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  <div className="flex flex-col items-start">
                    <span>{format.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {format.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Secondary Actions */}
      {hasSelection && (
        <div className="flex items-center gap-2">
          {secondaryActions.map(({ type }) => {
            const config = bulkActionConfig[type];
            const Icon = config.icon;

            return (
              <TooltipProvider key={type}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={config.variant}
                      size="sm"
                      onClick={() => handleBulkAction(type)}
                      disabled={disabled || loading}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {config.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* Advanced Actions */}
      {showAdvanced && hasSelection && (
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground font-medium">
            Advanced:
          </span>
          {advancedActions.map(({ type }) => {
            const config = bulkActionConfig[type];
            const Icon = config.icon;

            return (
              <TooltipProvider key={type}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={config.variant}
                      size="sm"
                      onClick={() => handleBulkAction(type)}
                      disabled={disabled || loading}
                      className={cn(
                        type === 'delete' && 'border-destructive/50 text-destructive hover:bg-destructive/10'
                      )}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {config.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* Selection Progress Bar */}
      {hasSelection && (
        <div className="w-full">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Selection Progress</span>
            <span>{selectedCount} / {totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${selectionPercentage}%` }}
              role="progressbar"
              aria-valuenow={selectionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Compact bulk actions for mobile or tight spaces
export function BulkActionsCompact({
  selectedCount,
  totalCount,
  onImport,
  onExport,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  disabled = false,
  loading = false,
}: BulkActionsProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
          disabled={disabled || totalCount === 0}
          className="h-8 px-2"
        >
          {selectedCount === totalCount ? 'Clear' : 'All'}
        </Button>
      </div>

      {hasSelection && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || loading}
              className="h-8"
            >
              Actions
              <IconDotsVertical className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onImport}>
              <IconDownload className="h-4 w-4 mr-2" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('csv')}>
              <IconDownload className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onBulkAction('tag')}>
              <IconTag className="h-4 w-4 mr-2" />
              Add Tags
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBulkAction('favorite')}>
              <IconStar className="h-4 w-4 mr-2" />
              Mark as Favorite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBulkAction('verify')}>
              <IconEyeCheck className="h-4 w-4 mr-2" />
              Mark as Verified
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onBulkAction('archive')}>
              <IconArchive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onBulkAction('delete')}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// Bulk action confirmation dialog
export function BulkActionConfirmation({
  action,
  selectedCount,
  onConfirm,
  onCancel,
  loading = false,
}: {
  action: BulkActionType;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const config = bulkActionConfig[action];
  const Icon = config.icon;

  const getActionMessage = () => {
    switch (action) {
      case 'import':
        return `Import ${selectedCount} selected contacts?`;
      case 'export':
        return `Export ${selectedCount} selected contacts?`;
      case 'tag':
        return `Add tags to ${selectedCount} selected contacts?`;
      case 'categorize':
        return `Categorize ${selectedCount} selected contacts?`;
      case 'favorite':
        return `Mark ${selectedCount} selected contacts as favorite?`;
      case 'archive':
        return `Archive ${selectedCount} selected contacts?`;
      case 'delete':
        return `Delete ${selectedCount} selected contacts? This action cannot be undone.`;
      case 'verify':
        return `Mark ${selectedCount} selected contacts as verified?`;
      case 'merge':
        return `Merge ${selectedCount} selected contacts?`;
      default:
        return `Perform action on ${selectedCount} selected contacts?`;
    }
  };

  const isDestructive = action === 'delete';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-full",
          isDestructive ? "bg-destructive/10" : "bg-primary/10"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            isDestructive ? "text-destructive" : "text-primary"
          )} />
        </div>
        <div>
          <h3 className="font-semibold">{config.label}</h3>
          <p className="text-sm text-muted-foreground">
            {getActionMessage()}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant={isDestructive ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={loading}
          loading={loading}
        >
          {config.label}
        </Button>
      </div>
    </div>
  );
}

export default BulkActions;