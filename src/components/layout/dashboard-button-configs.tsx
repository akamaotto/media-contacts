import { Upload, Download, Plus, UserPlus, FileSpreadsheet } from "lucide-react";
import { type DashboardActionButton } from "./dashboard-action-buttons";
import { type UserTableRef } from "@/app/(dashboard)/admin/users/user-table";
import { toast } from "sonner";
import { CSVImportModal, CSVExportDialog, useCsvModals } from "@/components/features/csv";

// Integrated CSV functionality with real implementation
export function getHomePageButtons(
  onAddContact: () => void,
  onImportCsv: () => void,
  onExportCsv: (filters?: Record<string, any>) => void,
  onDownloadTemplate: () => void,
  currentFilters?: Record<string, any>
): DashboardActionButton[] {
  return [
    {
      label: "Download Template",
      onClick: () => {
        onDownloadTemplate();
      },
      variant: "outline",
      icon: <FileSpreadsheet className="h-4 w-4" />
    },
    {
      label: "Upload CSV",
      onClick: () => {
        onImportCsv();
      },
      variant: "outline",
      icon: <Upload className="h-4 w-4" />
    },
    {
      label: "Export CSV",
      onClick: () => {
        onExportCsv(currentFilters);
      },
      variant: "outline",
      icon: <Download className="h-4 w-4" />
    },
    {
      label: "Add Media Contact",
      onClick: onAddContact,
      variant: "default",
      icon: <Plus className="h-4 w-4" />
    }
  ];
}

// Real CSV integration functionality moved from CSVIntegration component
export function createCSVIntegration({
  onAddContact,
  currentFilters = {},
  onImportComplete,
  onRefresh
}: {
  onAddContact: () => void;
  currentFilters?: Record<string, any>;
  onImportComplete?: () => void;
  onRefresh?: () => void;
}) {
  const { 
    isImportModalOpen, 
    isExportDialogOpen, 
    openImportModal, 
    closeImportModal, 
    openExportDialog, 
    closeExportDialog,
    handleImportComplete
  } = useCsvModals();
  
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

  // Handle template download
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/media-contacts/template');
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `media-contacts-template-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Template downloaded successfully!', {
        description: 'Fill out the Excel template and save as CSV to upload.',
        duration: 5000,
      });
    } catch (error) {
      toast.error('Download failed', {
        description: error instanceof Error ? error.message : 'Failed to download template',
        duration: 5000,
      });
    }
  };

  // Get dashboard buttons with CSV handlers
  const actionButtons = getHomePageButtons(
    onAddContact,
    openImportModal,
    openExportDialog,
    handleDownloadTemplate,
    currentFilters
  );

  return {
    actionButtons,
    csvComponents: (
      <>
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
    )
  };
}

export function getUsersPageButtons(userTableRef: React.RefObject<UserTableRef>): DashboardActionButton[] {
  return [
    {
      label: "Add User",
      onClick: () => {
        userTableRef.current?.openAddUserDialog();
      },
      variant: "default",
      icon: <UserPlus className="h-4 w-4" />
    }
  ];
}

export function getDefaultButtons(): DashboardActionButton[] {
  return [];
}
