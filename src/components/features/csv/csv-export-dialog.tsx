"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
// Removed direct backend import - now using API route

interface CSVExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: Record<string, any>;
}

type ExportStep = "configure" | "processing" | "complete" | "error";

// Available fields for export
const availableFields = [
  { id: "firstName", label: "First Name" },
  { id: "lastName", label: "Last Name" },
  { id: "email", label: "Email" },
  { id: "title", label: "Title" },
  { id: "outlet", label: "Outlet" },
  { id: "beats", label: "Beats" },
  { id: "countries", label: "Countries" },
  { id: "regions", label: "Regions" },
  { id: "languages", label: "Languages" },
  { id: "twitterHandle", label: "Twitter Handle" },
  { id: "instagramHandle", label: "Instagram Handle" },
  { id: "linkedinUrl", label: "LinkedIn URL" },
  { id: "bio", label: "Bio" },
  { id: "notes", label: "Notes" },
  { id: "authorLinks", label: "Author Links" },
];

export function CSVExportDialog({ isOpen, onClose, filters }: CSVExportDialogProps) {
  const [step, setStep] = useState<ExportStep>("configure");
  const [selectedFields, setSelectedFields] = useState<string[]>(["firstName", "lastName", "email"]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<any>(null);

  // Reset state when dialog is opened
  const resetState = () => {
    setStep("configure");
    setSelectedFields(["firstName", "lastName", "email"]);
    setProgress(0);
    setError(null);
    setExportResult(null);
  };

  // Handle field selection toggle
  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  // Handle select all fields
  const selectAllFields = () => {
    setSelectedFields(availableFields.map(field => field.id));
  };

  // Handle clear all fields
  const clearAllFields = () => {
    setSelectedFields([]);
  };

  // Handle export
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      setError("Please select at least one field to export");
      return;
    }

    try {
      setStep("processing");
      setProgress(10);
      setError(null);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 300);

      // Call export API endpoint
      const response = await fetch('/api/media-contacts/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: selectedFields,
          filters: filters || {},
        }),
      });
      
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();

      // Clear interval and set final progress
      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setExportResult(result);
        setStep("complete");

        // Trigger download
        if (result.csvContent) {
          const blob = new Blob([result.csvContent], { type: "text/csv" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `media-contacts-export-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        setStep("error");
        setError(result.message || "Export failed");
      }
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setProgress(0);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Media Contacts</DialogTitle>
          <DialogDescription>
            Select the fields you want to include in your CSV export.
          </DialogDescription>
        </DialogHeader>

        {step === "configure" && (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Fields to Export</p>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={selectAllFields}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllFields}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {availableFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field.id}`}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <Label
                    htmlFor={`field-${field.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>

            {filters && Object.keys(filters).length > 0 && (
              <Alert className="mt-4">
                <FileSpreadsheet className="h-4 w-4" />
                <AlertTitle>Current filters will be applied</AlertTitle>
                <AlertDescription className="text-xs">
                  Your export will include only the contacts matching your current filters.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-medium">Preparing your export...</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              This may take a few moments depending on the number of contacts.
            </p>
          </div>
        )}

        {step === "complete" && exportResult && (
          <div className="space-y-4 py-4">
            <Alert variant="default" className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Export Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                Successfully exported {exportResult.exportedCount} contacts.
                Your download should begin automatically.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Export Failed</AlertTitle>
            <AlertDescription>{error || "An unexpected error occurred"}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={selectedFields.length === 0}
              >
                Export
              </Button>
            </>
          )}

          {step === "processing" && (
            <Button variant="outline" disabled>
              Processing...
            </Button>
          )}

          {(step === "complete" || step === "error") && (
            <Button onClick={handleClose}>
              {step === "complete" ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
