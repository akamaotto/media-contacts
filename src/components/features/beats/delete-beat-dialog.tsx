'use client';

import { useState } from 'react';
import { toast } from 'sonner';

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

import type { Beat } from '@/backend/beats/actions';

interface DeleteBeatDialogProps {
  beat: Beat | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteBeatDialog({ beat, isOpen, onOpenChange, onSuccess }: DeleteBeatDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!beat) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/beats/${beat.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete beat');
      }

      toast.success('Beat deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete beat:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete beat');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!beat) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Beat</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the beat "{beat.name}"?
            {beat.contactCount && beat.contactCount > 0 && (
              <span className="block mt-2 text-amber-600 font-medium">
                Warning: This beat is currently assigned to {beat.contactCount} media contact{beat.contactCount !== 1 ? 's' : ''}. 
                Deleting it will remove this beat from all associated contacts.
              </span>
            )}
            <span className="block mt-2">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Beat'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
