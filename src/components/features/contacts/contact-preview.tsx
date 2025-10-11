/**
 * ContactPreview Component
 * Detailed modal with full contact information and actions
 */

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  IconChevronLeft, 
  IconChevronRight, 
  IconDownload, 
  IconStar, 
  IconStarFilled,
  IconMail, 
  IconPhone, 
  IconBuilding, 
  IconWorld,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandFacebook,
  IconBrandInstagram,
  IconMapPin,
  IconLanguage,
  IconCalendar,
  IconClock,
  IconCheck,
  IconX,
  IconEye,
  IconCopy,
  IconExternalLink,
  IconTag,
  IconNotes,
  IconActivity
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ContactPreviewProps } from './types';
import { ConfidenceBadge } from './confidence-badge';
import { SourceList } from './source-list';
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
    label: 'Pending Verification',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  },
  REJECTED: {
    icon: IconX,
    label: 'Rejected',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  MANUAL_REVIEW: {
    icon: IconEye,
    label: 'Manual Review Required',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
};

const socialMediaConfig = {
  linkedin: {
    icon: IconBrandLinkedin,
    label: 'LinkedIn',
    color: 'text-blue-600',
  },
  twitter: {
    icon: IconBrandTwitter,
    label: 'Twitter',
    color: 'text-sky-600',
  },
  facebook: {
    icon: IconBrandFacebook,
    label: 'Facebook',
    color: 'text-blue-700',
  },
  instagram: {
    icon: IconBrandInstagram,
    label: 'Instagram',
    color: 'text-pink-600',
  },
};

export function ContactPreview({
  contact,
  isOpen,
  onClose,
  onImport,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: ContactPreviewProps) {
  const [isFavorite, setIsFavorite] = useState(contact.favorite || false);
  const [activeTab, setActiveTab] = useState('details');
  const [imageError, setImageError] = useState(false);

  const name = formatContactName(contact);
  const title = formatContactTitle(contact);
  const company = formatContactCompany(contact);
  const initials = getContactInitials(contact);
  const verificationConfig = verificationStatusConfig[contact.verificationStatus] || 
                           verificationStatusConfig.PENDING;
  const VerificationIcon = verificationConfig.icon;

  const handleImport = () => {
    onImport?.();
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification here
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
    return <AvatarFallback className="text-lg">{initials}</AvatarFallback>;
  };

  const renderSocialMediaLinks = () => {
    const links = [];
    
    if (contact.contactInfo?.linkedin) {
      links.push({
        platform: 'linkedin',
        url: contact.contactInfo.linkedin,
        handle: contact.contactInfo.linkedin.split('/').pop() || '',
      });
    }
    
    if (contact.contactInfo?.twitter) {
      links.push({
        platform: 'twitter',
        url: contact.contactInfo.twitter,
        handle: contact.contactInfo.twitter.split('/').pop() || '',
      });
    }
    
    if (contact.socialProfiles) {
      contact.socialProfiles.forEach(profile => {
        if (['linkedin', 'twitter', 'facebook', 'instagram'].includes(profile.platform)) {
          links.push({
            platform: profile.platform,
            url: profile.url,
            handle: profile.handle,
          });
        }
      });
    }
    
    return links;
  };

  const socialMediaLinks = renderSocialMediaLinks();

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Contact Details
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!hasPrevious}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!hasNext}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                {getContactAvatar()}
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{name}</h2>
                  
                  <Badge
                    variant="outline"
                    className={cn('text-sm', verificationConfig.color)}
                  >
                    <VerificationIcon className="h-3 w-3 mr-1" />
                    {verificationConfig.label}
                  </Badge>
                </div>
                
                {title && (
                  <p className="text-lg text-muted-foreground">{title}</p>
                )}
                
                {company && (
                  <div className="flex items-center gap-2">
                    <IconBuilding className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{company}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <ConfidenceBadge confidence={contact.confidenceScore} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Quality:</span>
                    <ConfidenceBadge confidence={contact.qualityScore} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <IconCalendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Found {contact.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFavorite}
                >
                  {isFavorite ? (
                    <>
                      <IconStarFilled className="h-4 w-4 text-yellow-500 mr-1" />
                      Favorited
                    </>
                  ) : (
                    <>
                      <IconStar className="h-4 w-4 mr-1" />
                      Favorite
                    </>
                  )}
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleImport}
                  disabled={contact.imported}
                >
                  <IconDownload className="h-4 w-4 mr-1" />
                  {contact.imported ? 'Imported' : 'Import'}
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Contact Information */}
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  
                  <div className="grid gap-3">
                    {contact.email && (
                      <div className="flex items-center gap-3">
                        <IconMail className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Email</p>
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(contact.email!)}
                        >
                          <IconCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {contact.contactInfo?.phone && (
                      <div className="flex items-center gap-3">
                        <IconPhone className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Phone</p>
                          <a 
                            href={`tel:${contact.contactInfo.phone}`}
                            className="text-primary hover:underline"
                          >
                            {contact.contactInfo.phone}
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(contact.contactInfo.phone!)}
                        >
                          <IconCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {contact.contactInfo?.location && (
                      <div className="flex items-center gap-3">
                        <IconMapPin className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Location</p>
                          <p>{contact.contactInfo.location}</p>
                        </div>
                      </div>
                    )}
                    
                    {contact.contactInfo?.languages && (
                      <div className="flex items-center gap-3">
                        <IconLanguage className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Languages</p>
                          <div className="flex flex-wrap gap-1">
                            {contact.contactInfo.languages.map((language, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {language}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Social Media */}
                {socialMediaLinks.length > 0 && (
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Social Media</h3>
                    
                    <div className="grid gap-3">
                      {socialMediaLinks.map((link, index) => {
                        const config = socialMediaConfig[link.platform as keyof typeof socialMediaConfig];
                        if (!config) return null;
                        
                        const Icon = config.icon;
                        
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <Icon className={cn("h-5 w-5", config.color)} />
                            <div className="flex-1">
                              <p className="font-medium">{config.label}</p>
                              <a 
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {link.handle}
                                <IconExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(link.url)}
                            >
                              <IconCopy className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Bio */}
                {contact.bio && (
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Bio</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {contact.bio}
                    </p>
                  </div>
                )}
                
                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <IconTag className="h-5 w-5" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {contact.notes && (
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <IconNotes className="h-5 w-5" />
                      Notes
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {contact.notes}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sources" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">Sources</h3>
                  
                  <SourceList
                    sources={[contact.sourceUrl]}
                    verified={contact.verificationStatus === 'CONFIRMED'}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">Extraction Metadata</h3>
                  
                  <div className="grid gap-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Extraction ID:</span>
                      <span className="text-muted-foreground font-mono text-sm">
                        {contact.extractionId}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Search ID:</span>
                      <span className="text-muted-foreground font-mono text-sm">
                        {contact.searchId}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Extraction Method:</span>
                      <span className="text-muted-foreground">
                        {contact.extractionMethod}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Relevance Score:</span>
                      <div className="flex items-center gap-2">
                        <ConfidenceBadge confidence={contact.relevanceScore} size="sm" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Is Duplicate:</span>
                      <span className="text-muted-foreground">
                        {contact.isDuplicate ? 'Yes' : 'No'}
                      </span>
                    </div>
                    
                    {contact.processingTimeMs && (
                      <div className="flex justify-between">
                        <span className="font-medium">Processing Time:</span>
                        <span className="text-muted-foreground">
                          {contact.processingTimeMs}ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <IconActivity className="h-5 w-5" />
                    Activity Log
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">Contact extracted</p>
                        <p className="text-sm text-muted-foreground">
                          {contact.createdAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {contact.imported && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <p className="font-medium">Contact imported</p>
                          <p className="text-sm text-muted-foreground">
                            Recently
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {contact.verificationStatus === 'CONFIRMED' && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <p className="font-medium">Contact verified</p>
                          <p className="text-sm text-muted-foreground">
                            Recently
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              Contact ID: {contact.id}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              
              <Button onClick={handleImport} disabled={contact.imported}>
                <IconDownload className="h-4 w-4 mr-1" />
                {contact.imported ? 'Imported' : 'Import Contact'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ContactPreview;