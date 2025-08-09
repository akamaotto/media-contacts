'use client';

import React from 'react';
import {Badge} from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {EnhancedBadgeListProps} from './types';

/**
 * Enhanced badge list component with responsive design and tooltips
 * Fixes text truncation issues and provides better UX
 */
export function EnhancedBadgeList({
    items,
    totalCount,
    colorClass = '',
    maxVisible = 2,
    showTooltips = true,
    responsive = true,
    emptyText = '-',
}: EnhancedBadgeListProps): React.ReactElement {
    if (!items.length) {
        return (
            <span className='text-muted-foreground text-xs'>{emptyText}</span>
        );
    }

    const visibleItems = items.slice(0, maxVisible);
    const remainingCount = Math.max(0, totalCount - maxVisible);

    // Determine container classes based on responsive setting
    const containerClasses = responsive
        ? 'flex flex-wrap gap-1 min-w-0'
        : 'flex flex-wrap gap-1 max-w-[140px]';

    // Determine badge classes based on responsive setting
    const getBadgeClasses = (itemName: string) => {
        const baseClasses = colorClass ? `text-xs ${colorClass}` : 'text-xs';

        if (!responsive) {
            return `${baseClasses} truncate max-w-[60px]`;
        }

        // Responsive: prioritize showing full text without truncation
        const textLength = itemName.length;
        if (textLength <= 25) {
            // For most names, show full text without truncation
            return `${baseClasses} whitespace-nowrap`;
        } else {
            // Only truncate very long names, but with generous space
            return `${baseClasses} truncate max-w-[160px]`;
        }
    };

    const renderBadge = (item: {id: string; name: string}) => {
        const badgeClasses = getBadgeClasses(item.name);
        const badge = (
            <Badge
                key={item.id}
                variant='outline'
                className={badgeClasses}
                title={showTooltips ? item.name : undefined}
            >
                {item.name}
            </Badge>
        );

        // Only wrap in tooltip if tooltips are enabled and text might be truncated
        if (showTooltips && item.name.length > 25) {
            return (
                <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{badge}</TooltipTrigger>
                    <TooltipContent>
                        <p className='text-sm'>{item.name}</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        return badge;
    };

    return (
        <TooltipProvider>
            <div className={containerClasses}>
                {visibleItems.map(renderBadge)}
                {remainingCount > 0 && (
                    <Badge
                        variant='outline'
                        className='text-xs whitespace-nowrap'
                    >
                        +{remainingCount}
                    </Badge>
                )}
            </div>
        </TooltipProvider>
    );
}

/**
 * Preset configurations for different badge types
 */
export const BadgePresets = {
    outlets: {
        colorClass: '', // Use default outline variant
        maxVisible: 2,
        emptyText: 'No outlets',
    },
    beats: {
        colorClass: '', // Use default outline variant
        maxVisible: 2,
        emptyText: 'No beats',
    },
    countries: {
        colorClass: '', // Use default outline variant
        maxVisible: 2,
        emptyText: 'No countries',
    },
    regions: {
        colorClass: '', // Use default outline variant
        maxVisible: 2,
        emptyText: 'No regions',
    },
    languages: {
        colorClass: '', // Use default outline variant
        maxVisible: 2,
        emptyText: 'No languages',
    },
} as const;
