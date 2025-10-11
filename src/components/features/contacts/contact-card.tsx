/**
 * ContactCard Component
 * Grid view card component for visual contact browsing
 */

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  IconEye, 
  IconDownload, 
  IconStar, 
  IconStarFilled,
  IconMail, 
  IconPhone, 
  IconBuilding, 
  IconWorld,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconDotsVertical,
  IconExternalLink,
  IconCheck,
  IconX,
  IconClock
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ContactCardProps } from './types';
import { ConfidenceBadge } from './confidence-badge';
import { SourceListCompact } from './source-list';
import { 
  formatContactName, 
  formatContactTitle, 
  formatContactCompany, 
  getContactInitials,
  getVerificationStatusColor 
} from './types';

const verificationStatusConfig = {
  CONFIRMED: {
    icon: IconCheck,
    label: 'Verified',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  PENDING: {
    icon: IconClock,
    label: 'Pending',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  },
  REJECTED: {
    icon: IconX,
    label: 'Rejected',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  MANUAL_REVIEW: {
    icon: IconClock,
    label: 'Review',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
};

export function ContactCard({
  contact,
  selected = false,
  onSelect,
  onPreview,
  compact = false,
  showActions = true,
  className,
}: ContactCardProps) {
  const [isFavorite, setIsFavorite] = useState(contact.favorite || false);
  const [imageError, setImageError] = useState(false);

  const name = formatContactName(contact);
  const title = formatContactTitle(contact);
  const company = formatContactCompany(contact);
  const initials = getContactInitials(contact);
  const hasEmail = !!contact.email;
  const hasPhone = !!contact.contactInfo?.phone;
  const hasLinkedIn = !!contact.contactInfo?.linkedin;
  const hasTwitter = !!contact.contactInfo?.twitter;
  const hasWebsite = !!contact.contactInfo?.website;

  const verificationConfig = verificationStatusConfig[contact.verificationStatus] || 
                           verificationStatusConfig.PENDING;
  const VerificationIcon = verificationConfig.icon;

  const handleSelect = (checked: boolean) => {
    onSelect?.(checked);
  };

  const handlePreview = () => {
    onPreview?.();
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getContactAvatar = () => {
    // If there's an avatar URL and it hasn't failed to load
    if (contact.contactInfo?.avatar && !imageError) {
      return (
        <AvatarImage 
          src={contact.contactInfo.avatar} 
          alt={name}
          onError={handleImageError}
        />
      );
    }
    
    // Use initials as fallback
    return <AvatarFallback>{initials}</AvatarFallback>;
  };

  if (compact) {
    return (
      <Card className={cn(
        'hover:shadow-md transition-shadow cursor-pointer',
        selected && 'ring-2 ring-primary',
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selected}
              onCheckedChange={handleSelect}
              onClick={(e) => e.stopPropagation()}
            />
            
            <Avatar className="h-10 w-10">
              {getContactAvatar()}
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{name}</h3>
              {title && (
                <p className="text-xs text-muted-foreground truncate">{title}</p>
              )}
              {company && (
                <p className="text-xs text-muted-foreground truncate">{company}</p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <ConfidenceBadge confidence={contact.confidenceScore} size="sm" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handlePreview}
              >
                <IconEye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'hover:shadow-lg transition-all duration-200 cursor-pointer group',
      selected && 'ring-2 ring-primary ring-offset-2',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selected}
              onCheckedChange={handleSelect}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
            
            <Avatar className="h-12 w-12">
              {getContactAvatar()}
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                {name}
              </h3>
              {title && (
                <p className="text-sm text-muted-foreground truncate">{title}</p>
              )}
              {company && (
                <p className="text-sm text-muted-foreground truncate">{company}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs', verificationConfig.color)}
            >
              <VerificationIcon className="h-3 w-3 mr-1" />
              {verificationConfig.label}
            </Badge>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={toggleFavorite}
                  >
                    {isFavorite ? (
                      <IconStarFilled className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <IconStar className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 space-y-3">
        {/* Contact Information */}
        <div className="space-y-2">
          {hasEmail && (
            <div className="flex items-center gap-2 text-sm">
              <IconMail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${contact.email}`}
                className="text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.email}
              </a>
            </div>
          )}
          
          {hasPhone && (
            <div className="flex items-center gap-2 text-sm">
              <IconPhone className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`tel:${contact.contactInfo?.phone}`}
                className="text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.contactInfo?.phone}
              </a>
            </div>
          )}
          
          {hasLinkedIn && (
            <div className="flex items-center gap-2 text-sm">
              <IconBrandLinkedin className="h-4 w-4 text-muted-foreground" />
              <a 
                href={contact.contactInfo?.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                LinkedIn Profile
              </a>
            </div>
          )}
          
          {hasTwitter && (
            <div className="flex items-center gap-2 text-sm">
              <IconBrandTwitter className="h-4 w-4 text-muted-foreground" />
              <a 
                href={contact.contactInfo?.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                Twitter Profile
              </a>
            </div>
          )}
          
          {hasWebsite && (
            <div className="flex items-center gap-2 text-sm">
              <IconWorld className="h-4 w-4 text-muted-foreground" />
              <a 
                href={contact.contactInfo?.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                Website
              </a>
            </div>
          )}
        </div>
        
        {/* Bio */}
        {contact.bio && (
          <div className="text-sm text-muted-foreground line-clamp-2">
            {contact.bio}
          </div>
        )}
        
        {/* Confidence Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <ConfidenceBadge confidence={contact.confidenceScore} size="sm" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Quality:</span>
            <ConfidenceBadge confidence={contact.qualityScore} size="sm" />
          </div>
        </div>
        
        {/* Sources */}
        {contact.metadata?.processingSteps && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Sources:</span>
            <SourceListCompact 
              sources={contact.metadata.processingSteps
                .filter(step => step.details?.source)
                .map(step => step.details.source)
                .slice(0, 2)
              }
              maxItems={2}
            />
          </div>
        )}
        
        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {contact.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{contact.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      
      {showActions && (
        <CardFooter className="pt-0">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handlePreview}
            >
              <IconEye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle import action
                    }}
                  >
                    <IconDownload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Import contact</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-3"
                  >
                    <IconDotsVertical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>More actions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// Contact card skeleton for loading states
export function ContactCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-6 w-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-muted rounded mt-1" />
            <div className="h-12 w-12 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-6 w-16 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
        
        <div className="h-16 bg-muted rounded" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-5 w-12 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 bg-muted rounded w-12" />
            <div className="h-5 w-12 bg-muted rounded" />
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="h-3 bg-muted rounded w-12" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="flex items-center gap-2 w-full">
          <div className="h-8 bg-muted rounded flex-1" />
          <div className="h-8 w-8 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded" />
        </div>
      </CardFooter>
    </Card>
  );
}

export default ContactCard;