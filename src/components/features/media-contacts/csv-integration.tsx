"use client";

import { useState } from "react";
import { CSVImportModal, CSVExportDialog, useCsvModals } from "@/components/features/csv";
import { getHomePageButtons } from "@/components/layout/dashboard-button-configs";
import { DashboardActionButtons } from "@/components/layout/dashboard-action-buttons";
import { toast } from "sonner";

interface CSVIntegrationProps {
  onAddContact: () => void;
  currentFilters?: Record<string, any>;
  onImportComplete?: () => void;
  onRefresh?: () => void;
}

export function CSVIntegration({ 
  onAddContact, 
  currentFilters = {},
  onImportComplete,
  onRefresh
}: CSVIntegrationProps) {
  const { 
    isImportModalOpen, 
    isExportDialogOpen, 
    openImportModal, 
    closeImportModal, 
    openExportDialog, 
    closeExportDialog,
    handleImportComplete
  } = useCsvModals();
  
  // Using sonner toast directly

  // Handle import completion
  const handleImportSuccess = (result: any) => {
    // Show success toast using sonner
    toast.success(`Successfully imported ${result.importedCount || 0} contacts.`, {
      description: "Your contacts have been added to the database.",
      duration: 5000,
    });
    
    // Refresh data after import
    if (onRefresh) {
      onRefresh();
    }
    
    // Call onImportComplete if provided
    if (onImportComplete) {
      onImportComplete();
    }
    
    // Close the modal
    handleImportComplete(result);
  };

  // Handle CSV import errors from the modal
  const handleImportError = (error: any) => {
    // Show error toast using sonner
    toast.error("Import Failed", {
      description: error?.message || "An error occurred during import.",
      duration: 5000,
    });
    
    // Close the modal with error
    handleImportComplete({ error });
  };
  
  // Enhance the handleImportSuccess to also handle errors
  const enhancedHandleImportSuccess = (result: any) => {
    // Check if the result contains an error
    if (result.error || !result.success) {
      handleImportError(result.error || { message: "Import failed" });
      return;
    }
    
    // Otherwise, proceed with success handling
    handleImportSuccess(result);
  };

  // Get dashboard buttons with CSV handlers
  const actionButtons = getHomePageButtons(
    onAddContact,
    openImportModal,
    openExportDialog,
    currentFilters
  );

  return (
    <>
      <DashboardActionButtons buttons={actionButtons} />
      
      {/* CSV Import Modal */}
      <CSVImportModal 
        isOpen={isImportModalOpen} 
        onClose={closeImportModal} 
        onComplete={enhancedHandleImportSuccess}
      />
      
      {/* CSV Export Dialog */}
      <CSVExportDialog 
        isOpen={isExportDialogOpen} 
        onClose={closeExportDialog}
        filters={currentFilters}
      />
    </>
  );
}
