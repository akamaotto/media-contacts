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

import type { Category } from '@/backend/categories/actions';

interface DeleteCategoryDialogProps {
  category: Category | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteCategoryDialog({ category, isOpen, onOpenChange, onSuccess }: DeleteCategoryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!category) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete category');
      }

      toast.success('Category deleted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!category) return null;

  const hasRelationships = (category.beatCount && category.beatCount > 0) || (category.outletCount && category.outletCount > 0);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the category "{category.name}"?
            {hasRelationships && (
              <span className="block mt-2 text-amber-600 font-medium">
                Warning: This category is currently assigned to{' '}
                {category.beatCount && category.beatCount > 0 && (
                  <>
                    {category.beatCount} beat{category.beatCount !== 1 ? 's' : ''}
                    {category.outletCount && category.outletCount > 0 && ' and '}
                  </>
                )}
                {category.outletCount && category.outletCount > 0 && (
                  <>
                    {category.outletCount} outlet{category.outletCount !== 1 ? 's' : ''}
                  </>
                )}
                . Deleting it will remove this category from all associated beats and outlets.
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
            {isDeleting ? 'Deleting...' : 'Delete Category'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
