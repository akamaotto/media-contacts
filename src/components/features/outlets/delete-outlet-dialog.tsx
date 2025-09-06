'use client';

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
import { Badge } from '@/components/ui/badge';
import type { Outlet } from '@/features/outlets/lib/types';

interface DeleteOutletDialogProps {
  outlet: Outlet | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteOutletDialog({ outlet, isOpen, onOpenChange, onSuccess }: DeleteOutletDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!outlet) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/outlets/${outlet.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete outlet');
      }

      toast.success('Outlet deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting outlet:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete outlet');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      onOpenChange(open);
    }
  };

  if (!outlet) return null;

  const hasContacts = (outlet.contactCount || 0) > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Outlet
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete <strong>{outlet.name}</strong>? This action cannot be undone.
              </p>
              
              {/* Outlet details */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div>
                  <span className="font-medium">Outlet:</span> {outlet.name}
                </div>
                {outlet.publisher && (
                  <div>
                    <span className="font-medium">Publisher:</span> {outlet.publisher.name}
                  </div>
                )}
                {outlet.description && (
                  <div>
                    <span className="font-medium">Description:</span> {outlet.description}
                  </div>
                )}
                {outlet.categories && outlet.categories.length > 0 && (
                  <div>
                    <span className="font-medium">Categories:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {outlet.categories.map((category) => (
                        <Badge key={category.id} variant="outline" className="text-xs">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Media Contacts:</span>
                  <Badge variant={hasContacts ? "destructive" : "secondary"}>
                    {outlet.contactCount || 0}
                  </Badge>
                </div>
              </div>

              {hasContacts && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-medium">
                    ⚠️ Warning: This outlet has {outlet.contactCount} associated media contact{outlet.contactCount !== 1 ? 's' : ''}.
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    Deleting this outlet will remove it from all associated contacts.
                  </p>
                </div>
              )}
            </div>
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
            Delete Outlet
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
