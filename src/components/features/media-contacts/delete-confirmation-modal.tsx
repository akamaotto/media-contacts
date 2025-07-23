"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { deleteMediaContact } from "@/lib/actions/media-contacts";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  contactName: string | null;
  onDeleteComplete: () => void;
}

/**
 * A modal dialog component for confirming contact deletion
 * Implements Rust-inspired explicit type handling and robust error handling
 */
export function DeleteConfirmationModal({
  isOpen,
  onOpenChange,
  contactId,
  contactName,
  onDeleteComplete,
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  /**
   * Handles the deletion process with proper error handling and type safety
   */
  const handleDelete = async () => {
    // Fail fast if no contact ID is provided
    if (!contactId) {
      toast.error("Cannot delete contact: Missing contact ID");
      onOpenChange(false);
      return;
    }

    setIsDeleting(true);

    try {
      // Use the server action with explicit type handling
      const result = await deleteMediaContact(contactId);

      if (result.success) {
        toast.success(result.message || "Contact deleted successfully");
        onDeleteComplete();
      } else {
        // Provide detailed error feedback
        toast.error(result.error || "Failed to delete contact");
      }
    } catch (error) {
      // Catch any unexpected errors
      console.error("Error during contact deletion:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{contactName || "this contact"}</strong>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
