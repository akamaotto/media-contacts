"use client";

import React, { useState } from 'react';
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Mail, Link, Briefcase, Globe, User, FileText } from "lucide-react";
import { MediaContactTableItem } from "@/components/media-contacts/columns";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";

/**
 * Props interface for ViewMediaContactSheet component
 * Following Rust-inspired explicit typing pattern with comprehensive documentation
 */
interface ViewMediaContactSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: MediaContactTableItem | null;
  onContactDelete: (contactId: string) => void;  // Updated to accept contactId parameter
  onContactEdit: (contact: MediaContactTableItem) => void;
}

/**
 * Component for viewing detailed information about a media contact
 * @param props Component properties
 */
export function ViewMediaContactSheet({
  isOpen,
  onOpenChange,
  contact,
  onContactDelete,
  onContactEdit,
}: ViewMediaContactSheetProps): React.ReactElement {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Safety check to prevent rendering with no contact
  if (!contact) {
    return <></>;
  }

  /**
   * Handle delete confirmation dialog
   * Following Rust-inspired explicit typing
   */
  const handleDeleteClick = (): void => {
    setIsDeleteModalOpen(true);
  };

  /**
   * Handle confirmed deletion
   * Closes the sheet and calls the parent callback with contactId parameter
   * Following Rust-inspired explicit typing and fail-fast principles
   */
  const handleDeleteConfirmed = (): void => {
    if (!contact?.id) {
      console.error('Cannot delete contact: No contact ID available');
      toast.error('Error deleting contact: Contact ID not found');
      return;
    }
    onOpenChange(false);
    onContactDelete(contact.id);
  };

  /**
   * Handle edit button click
   * Following Rust-inspired explicit typing and validation
   */
  const handleEditClick = (): void => {
    // Validate contact with fail-fast approach
    if (!contact || !contact.id) {
      console.error("Cannot edit: Invalid contact or missing ID");
      return;
    }
    
    onContactEdit(contact);
  };

  /**
   * Handle delete completion
   * Following Rust-inspired explicit typing and consistent state handling
   */
  const handleDeleteComplete = (): void => {
    // Safety check for contact ID with explicit error handling
    if (!contact?.id) {
      console.error('Cannot delete contact: No contact ID available');
      toast.error('Error deleting contact: Contact ID not found');
      setIsDeleteModalOpen(false);
      onOpenChange(false);
      return;
    }
    
    // Update modal state and perform callbacks in predictable order
    setIsDeleteModalOpen(false);
    onContactDelete(contact.id);
    onOpenChange(false);
  };

  // Determine if contact has social links or author links
  const hasSocials = contact.socials && contact.socials.length > 0;
  const hasAuthorLinks = contact.authorLinks && contact.authorLinks.length > 0;

  /**
   * Detect social platform type from URL
   * @param url The social media URL to analyze
   * @returns The detected platform with icon name and display name
   */
  const detectSocialPlatform = (url: string): { icon: string; name: string } => {
    const lowercaseUrl = url.toLowerCase();
    
    if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) {
      return { icon: 'Twitter', name: 'Twitter/X' };
    }
    if (lowercaseUrl.includes('linkedin.com')) {
      return { icon: 'LinkedIn', name: 'LinkedIn' };
    }
    if (lowercaseUrl.includes('facebook.com') || lowercaseUrl.includes('fb.com')) {
      return { icon: 'Facebook', name: 'Facebook' };
    }
    if (lowercaseUrl.includes('instagram.com')) {
      return { icon: 'Instagram', name: 'Instagram' };
    }
    return { icon: 'Link', name: 'Social' };
  };
  
  /**
   * Detect author link type from URL
   * @param url The author link URL to analyze
   * @returns The detected link type with icon name and display name
   */
  const detectAuthorLinkType = (url: string): { icon: string; name: string } => {
    const lowercaseUrl = url.toLowerCase();
    
    if (lowercaseUrl.includes('medium.com') || 
        lowercaseUrl.includes('blog.') || 
        lowercaseUrl.includes('/blog/')) {
      return { icon: 'FileText', name: 'Blog' };
    }
    if (lowercaseUrl.includes('/article/') || 
        lowercaseUrl.includes('/articles/') || 
        lowercaseUrl.includes('news.')) {
      return { icon: 'Newspaper', name: 'Article' };
    }
    if (lowercaseUrl.includes('publication') || 
        lowercaseUrl.includes('magazine') || 
        lowercaseUrl.includes('journal')) {
      return { icon: 'BookOpen', name: 'Publication' };
    }
    if (lowercaseUrl.includes('portfolio') || 
        lowercaseUrl.includes('about-me') ||
        lowercaseUrl.includes('about.me')) {
      return { icon: 'User', name: 'Portfolio' };
    }
    return { icon: 'FileText', name: 'Author Content' };
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <SheetTitle className="text-xl font-bold">{contact.name}</SheetTitle>
                <SheetDescription className="text-base mt-1">
                  {contact.title}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8">
              {/* Contact Information */}
              <section>
                <h3 className="text-md font-medium mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  Contact Information
                </h3>
                <Card className="rounded-sm overflow-hidden">
                  <CardContent className="px-4 py-0 divide-y divide-border">
                    {contact.email && (
                      <div className="flex items-center pb-4">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex items-center">
                          <span 
                            className="text-sm hover:underline cursor-pointer" 
                            onClick={() => {
                              navigator.clipboard.writeText(contact.email);
                              toast.success(`Email copied to clipboard`, {
                                description: `${contact.email} for ${contact.name} has been copied`
                              });
                            }}
                            title="Click to copy email"
                          >
                            {contact.email}
                          </span>
                          {contact.email_verified_status && (
                            <Badge variant="default" className="ml-2">Verified</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Outlets */}
                    {contact.outlets && contact.outlets.length > 0 && (
                      <div className="flex items-center py-4">
                        <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{contact.outlets.map(o => o.name).join(', ')}</span>
                      </div>
                    )}
                    
                    {/* Outlets */}
                    {contact.outlets && contact.outlets.length > 0 && (
                      <div className="flex items-start py-4">
                        <Globe className="h-4 w-4 mr-2 my-1 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium block mb-1">Outlets</span>
                          <div className="flex flex-wrap gap-1">
                            {contact.outlets.map(outlet => (
                              <Badge key={outlet.id} variant="outline" className="font-normal">
                                {outlet.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Beats */}
                    {contact.beats && contact.beats.length > 0 && (
                      <div className="flex items-start py-4">
                        <Briefcase className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium block mb-1">Beats</span>
                          <div className="flex flex-wrap gap-1">
                            {contact.beats.map(beat => (
                              <Badge key={beat.id} variant="secondary" className="font-normal">
                                {beat.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Countries */}
                    {contact.countries && contact.countries.length > 0 && (
                      <div className="flex items-start pt-4">
                        <Globe className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium block mb-1">Countries</span>
                          <div className="flex flex-wrap gap-1">
                            {contact.countries.map(country => (
                              <Badge key={country.id} variant="outline" className="font-normal">
                                {country.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
              
              {/* Bio */}
              {contact.bio && (
                <section>
                  <h3 className="text-md font-medium mb-3">Bio</h3>
                  <Card className="rounded-md overflow-hidden">
                    <CardContent className="px-4 py-0">
                      <p className="text-sm whitespace-pre-line">{contact.bio}</p>
                    </CardContent>
                  </Card>
                </section>
              )}
              
              {/* Social Media */}
              {hasSocials && (
                <section>
                  <h3 className="text-md font-medium mb-3 flex items-center">
                    <Link className="h-4 w-4 mr-2 text-muted-foreground" />
                    Social Media Links
                  </h3>
                  <Card className="rounded-md py-2 overflow-hidden">
                    <CardContent className="px-4 py-0">
                      <div className="grid gap-3 divide-y divide-border">
                        {contact.socials?.map((url, index) => {
                          const platform = detectSocialPlatform(url);
                          return (
                            <a 
                              key={index} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center text-sm hover:underline text-blue-600 dark:text-blue-400 py-3"
                            >
                              <Link className="h-4 w-4 mr-2" />
                              {platform.name}: {url}
                            </a>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}
              
              {/* Author Links */}
              {hasAuthorLinks && (
                <section>
                  <h3 className="text-md font-medium mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    Author Links
                  </h3>
                  <Card className="rounded-md py-2 overflow-hidden">
                    <CardContent className="px-4 py-0">
                      <div className="grid gap-3 divide-y divide-border">
                        {contact.authorLinks?.map((url: string, index: number) => {
                          const linkType = detectAuthorLinkType(url);
                          return (
                            <a 
                              key={index} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center text-sm hover:underline text-blue-600 dark:text-blue-400 py-3"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              {linkType.name}: {url}
                            </a>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}
            </div>
          </ScrollArea>
          
          <SheetFooter className="p-6 border-t">
            <div className="flex justify-between w-full">
              <Button 
                variant="destructive" 
                onClick={handleDeleteClick} 
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button 
                onClick={handleEditClick}
                className="gap-1"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        contactId={contact?.id || null}
        contactName={contact?.name || null}
        onDeleteComplete={handleDeleteComplete}
      />
    </>
  );
}
