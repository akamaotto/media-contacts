"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import type { Region } from "@/lib/country-data";

interface DeleteRegionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  region: Region;
}

export function DeleteRegionDialog({
  isOpen,
  onClose,
  onSuccess,
  region,
}: DeleteRegionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/regions/${region.code}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete region");
      }

      toast.success("Region deleted successfully!");
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error deleting region:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete region");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'continent':
        return 'bg-blue-100 text-blue-800';
      case 'subregion':
        return 'bg-green-100 text-green-800';
      case 'organization':
        return 'bg-purple-100 text-purple-800';
      case 'economic':
        return 'bg-orange-100 text-orange-800';
      case 'political':
        return 'bg-red-100 text-red-800';
      case 'trade_agreement':
        return 'bg-yellow-100 text-yellow-800';
      case 'geographical':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            Delete Region
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this region? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Region Details */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{region.name}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {region.code}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            <Badge 
              variant="secondary" 
              className={`text-xs capitalize ${getCategoryColor(region.category)}`}
            >
              {region.category.replace('_', ' ')}
            </Badge>
          </div>

          {region.parentCode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Parent:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {region.parentCode}
              </Badge>
            </div>
          )}

          {region.description && (
            <div>
              <span className="text-sm text-muted-foreground">Description:</span>
              <p className="text-sm mt-1">{region.description}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Warning</p>
              <p className="text-yellow-700 mt-1">
                Deleting this region may affect countries and other regions that reference it. 
                Make sure no countries are currently assigned to this region.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Region
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
