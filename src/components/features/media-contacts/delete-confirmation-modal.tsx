'use client';

// Component for confirming media contact deletion
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  contactName: string | null;
  onDeleteComplete: () => void;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onOpenChange, 
  contactId, 
  contactName,
  onDeleteComplete 
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!contactId) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/media-contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete media contact');
      }

      toast.success('Media contact deleted successfully');
      onDeleteComplete();
    } catch (error) {
      console.error('Error deleting media contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete media contact');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      onOpenChange(open);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Media Contact
          </AlertDialogTitle>
          <AlertDialogDescription>
            {contactName ? (
              <p>
                Are you sure you want to delete <strong>{contactName}</strong>? This action cannot be undone.
              </p>
            ) : (
              <p>
                Are you sure you want to delete this media contact? This action cannot be undone.
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently remove all information associated with this contact.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Contact
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}