"use client";

import { useState } from "react";
import { toast } from "sonner";

export function useCsvModals() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});
  // Using sonner toast directly

  const openImportModal = () => {
    setIsImportModalOpen(true);
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
  };

  const openExportDialog = (filters?: Record<string, any>) => {
    setCurrentFilters(filters || {});
    setIsExportDialogOpen(true);
  };

  const closeExportDialog = () => {
    setIsExportDialogOpen(false);
  };

  const handleImportComplete = (result: any) => {
    if (result.success) {
      toast.success(`Successfully imported ${result.importedCount} contacts.`, {
        description: "Your contacts have been added to the database.",
        duration: 5000,
      });
    } else {
      toast.error("Import Failed", {
        description: result.message || "Failed to import contacts.",
        duration: 5000,
      });
    }
  };

  return {
    isImportModalOpen,
    isExportDialogOpen,
    currentFilters,
    openImportModal,
    closeImportModal,
    openExportDialog,
    closeExportDialog,
    handleImportComplete,
  };
}
