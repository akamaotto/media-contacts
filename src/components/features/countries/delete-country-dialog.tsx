"use client";

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Country } from './types';

interface DeleteCountryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  country: Country;
}

export function DeleteCountryDialog({ isOpen, onClose, onSuccess, country }: DeleteCountryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/countries/${country.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete country');
      }

      toast.success('Country deleted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete country:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete country');
    } finally {
      setIsDeleting(false);
    }
  };

  const mediaContactsCount = country._count?.media_contacts || 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Country</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{country.name}</strong>?
            {mediaContactsCount > 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This country has {mediaContactsCount} associated media contact{mediaContactsCount !== 1 ? 's' : ''}. 
                  You'll need to reassign or delete the media contacts first before you can delete this country.
                </p>
              </div>
            )}
            {mediaContactsCount === 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                This action cannot be undone. The country will be permanently removed from the database.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || mediaContactsCount > 0}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Country'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
