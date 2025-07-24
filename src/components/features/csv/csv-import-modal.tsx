"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
// Removed direct backend import - now using API route

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (result: any) => void;
}

type ImportStep = "upload" | "processing" | "complete" | "error";

export function CSVImportModal({ isOpen, onClose, onComplete }: CSVImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal is opened
  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        setError("Only CSV files are supported");
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit");
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  // Handle import submission
  const handleImport = async () => {
    if (!file) return;
    
    try {
      setStep("processing");
      setProgress(10);
      
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 300);
      
      // Submit import to API endpoint
      const response = await fetch('/api/media-contacts/import', {
        method: 'POST',
        body: formData, // FormData handles multipart/form-data automatically
      });
      
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`Import failed: ${response.status} ${response.statusText}`);
      }
      
      const importResult = await response.json();
      
      // Clear interval and set final progress
      clearInterval(progressInterval);
      setProgress(100);
      
      // Handle result
      setResult(importResult);
      
      if (importResult.success) {
        setStep("complete");
        if (onComplete) onComplete(importResult);
      } else {
        setStep("error");
        setError(importResult.message || "Import failed");
      }
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setProgress(0);
    }
  };

  // Handle modal close
  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Media Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import media contacts into the system.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                {isDragActive
                  ? "Drop the CSV file here"
                  : "Drag and drop a CSV file here, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Only CSV files up to 10MB are supported
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
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
              <Upload className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-medium">Processing your file...</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              This may take a few moments depending on the file size.
            </p>
          </div>
        )}

        {step === "complete" && result && (
          <div className="space-y-4 py-4">
            <Alert variant="default" className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Import Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                Successfully imported {result.importedCount} contacts.
              </AlertDescription>
            </Alert>

            {result.errorRows > 0 && (
              <div className="text-sm">
                <p className="font-medium">Import Summary:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Total rows: {result.totalRows}</li>
                  <li>Successfully imported: {result.importedCount}</li>
                  <li>Rows with errors: {result.errorRows}</li>
                </ul>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Errors:</p>
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  <ul className="divide-y">
                    {result.errors.slice(0, 10).map((err: any, i: number) => (
                      <li key={i} className="px-3 py-2 text-xs">
                        {err.row ? `Row ${err.row}: ` : ""}{err.message}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="px-3 py-2 text-xs text-muted-foreground">
                        And {result.errors.length - 10} more errors...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Failed</AlertTitle>
            <AlertDescription>{error || "An unexpected error occurred"}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!file || !!error}
              >
                Import
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
