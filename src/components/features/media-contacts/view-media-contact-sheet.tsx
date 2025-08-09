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
import { Skeleton } from "@/components/ui/skeleton";
import { MediaContactTableItem } from './types';
import { DeleteConfirmationModal } from "./delete-confirmation-modal";

/**
 * Props interface for ViewMediaContactSheet component
 * Following Rust-inspired explicit typing pattern with comprehensive documentation
 */
interface ViewMediaContactSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: MediaContactTableItem | null | undefined;
  isLoading?: boolean; // Added loading state prop
  onContactDelete?: (contactId: string) => void;  // Made optional since it's handled internally
  onContactEdit?: (contact: MediaContactTableItem) => void; // Made optional since it's handled internally
}

/**
 * Component for viewing detailed information about a media contact
 * @param props Component properties
 */
export function ViewMediaContactSheet({
  isOpen,
  onOpenChange,
  contact,
  isLoading = false,
  onContactDelete = () => {},
  onContactEdit = () => {},
}: ViewMediaContactSheetProps): React.ReactElement {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // If no contact at all, don't render
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
   * Normalize URL to ensure it has a protocol
   * @param url The URL to normalize
   * @returns The normalized URL with protocol
   */
  const normalizeUrl = (url: string): string => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

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
        <SheetContent side="right" className="sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-lg">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-semibold text-slate-900 dark:text-white">{contact.name}</SheetTitle>
                    <SheetDescription className="text-base mt-1 text-slate-600 dark:text-slate-400">
                      {contact.title}
                    </SheetDescription>
                  </div>
                </div>
                {(contact.email_verified_status || contact.emailVerified) && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Verified Contact</span>
                  </div>
                )}
              </div>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8">
              {/* Contact Information */}
              <section>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Contact Information</h3>
                <div className="space-y-4">
                    {contact.email && (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span 
                            className="text-sm hover:underline cursor-pointer text-slate-700 dark:text-slate-300 truncate" 
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
                          {(contact.email_verified_status || contact.emailVerified) && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Outlets */}
                    {contact.outlets && contact.outlets.length > 0 && (
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <Briefcase className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white block mb-2">Media Outlets</span>
                            <div className="flex flex-wrap gap-2">
                              {contact.outlets.map(outlet => (
                                <Badge key={outlet.id} variant="secondary" className="text-xs">
                                  {outlet.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Beats */}
                    {contact.beats && contact.beats.length > 0 && (
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white block mb-2">Coverage Beats</span>
                            <div className="flex flex-wrap gap-2">
                              {contact.beats.map(beat => (
                                <Badge key={beat.id} variant="secondary" className="text-xs">
                                  {beat.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Countries */}
                    {contact.countries && contact.countries.length > 0 && (
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white block mb-2">Geographic Coverage</span>
                            <div className="flex flex-wrap gap-2">
                              {contact.countries.map(country => (
                                <Badge key={country.id} variant="secondary" className="text-xs">
                                  {country.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </section>
              
              {/* Bio */}
              {isLoading ? (
                <section>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Biography</h3>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </section>
              ) : contact.bio && (
                <section>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Biography</h3>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{contact.bio}</p>
                  </div>
                </section>
              )}
              
              {/* Social Media */}
              {isLoading ? (
                <section>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Social Media</h3>
                  <div className="space-y-3">
                    {[1, 2].map((index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <Skeleton className="h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : hasSocials && (
                <section>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Social Media</h3>
                  <div className="space-y-3">
                    {contact.socials?.map((url, index) => {
                      const platform = detectSocialPlatform(url);
                      return (
                        <a 
                          key={index} 
                          href={normalizeUrl(url)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                        >
                          <Link className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{platform.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{url}</div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </section>
              )}
              
              {/* Author Links */}
              {isLoading ? (
                <section>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Published Work</h3>
                  <div className="space-y-3">
                    {[1, 2].map((index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <Skeleton className="h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : hasAuthorLinks && (
                <section>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Published Work</h3>
                  <div className="space-y-3">
                    {contact.authorLinks?.map((url: string, index: number) => {
                      const linkType = detectAuthorLinkType(url);
                      return (
                        <a 
                          key={index} 
                          href={normalizeUrl(url)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                        >
                          <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{linkType.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{url}</div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
          
          <SheetFooter className="p-6 border-t">
            <div className="flex justify-between w-full gap-4">
              <Button 
                variant="destructive" 
                onClick={handleDeleteClick} 
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button 
                onClick={handleEditClick}
                className="gap-2"
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
