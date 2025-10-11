"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Search, Wand2, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SearchForm } from "./search-form";
import {
  FindContactsModalProps,
  SearchFormData,
  QueryGenerationResponse,
  SearchProgress,
  performanceThresholds
} from "./types";
import { useAISearchWorkflow } from "@/lib/ai/integration/use-ai-search-workflow";

interface ModalState {
  step: 'form' | 'generating' | 'completed' | 'error';
  progress: number;
  message: string;
  searchId?: string;
  result?: QueryGenerationResponse;
  error?: string;
}

export function FindContactsModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  loading = false,
}: FindContactsModalProps) {
  // Use the AI search workflow hook
  const workflow = useAISearchWorkflow({
    onSearchComplete: (searchId, results) => {
      // Optional: Handle search completion
      console.log('Search completed:', { searchId, results });
    },
    onSearchError: (error) => {
      console.error('Search error:', error);
    },
    enableRealTimeUpdates: true,
    autoShowResults: false // Let the parent control results display
  });

  const [modalState, setModalState] = useState<ModalState>({
    step: 'form',
    progress: 0,
    message: 'Configure your search criteria'
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    modalOpenTime: 0,
    formSubmitTime: 0
  });

  const modalContentRef = useRef<HTMLDivElement>(null);
  const modalOpenTimeRef = useRef<number>(0);

  // Track modal open performance
  useEffect(() => {
    if (isOpen) {
      modalOpenTimeRef.current = performance.now();

      // Set focus to modal content for accessibility
      setTimeout(() => {
        modalContentRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (workflow.isSubmitting) return; // Prevent closing during submission

    // Calculate performance metrics
    if (modalOpenTimeRef.current > 0) {
      const modalOpenTime = performance.now() - modalOpenTimeRef.current;
      setPerformanceMetrics(prev => ({
        ...prev,
        modalOpenTime
      }));

      // Log performance warning if threshold exceeded
      if (modalOpenTime > performanceThresholds.modalOpenTime) {
        console.warn(`Modal open time ${modalOpenTime.toFixed(2)}ms exceeds threshold of ${performanceThresholds.modalOpenTime}ms`);
      }
    }

    // Reset state when closing
    setModalState({
      step: 'form',
      progress: 0,
      message: 'Configure your search criteria'
    });

    onClose();
  }, [workflow.isSubmitting, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Handle form submission
  const handleFormSubmit = useCallback(async (data: SearchFormData) => {
    if (workflow.isSubmitting) return;

    const submitStartTime = performance.now();

    // Update modal state to generating
    setModalState({
      step: 'generating',
      progress: 10,
      message: 'Initializing AI search...'
    });

    try {
      // Submit search using workflow
      const response = await workflow.submitSearch(data);

      // Update progress with real data from the workflow
      if (workflow.state.searchProgress) {
        setModalState({
          step: 'generating',
          progress: workflow.state.searchProgress.progress || 10,
          message: workflow.state.searchProgress.message || 'Processing search...'
        });
      }

      // Call the provided onSubmit function if provided
      if (onSubmit) {
        await onSubmit(data);
      }

      // Set final state
      setModalState({
        step: 'completed',
        progress: 100,
        message: 'Your AI-powered search has been initiated successfully!',
        searchId: response.searchId
      });

      // Calculate submit performance
      const submitTime = performance.now() - submitStartTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        formSubmitTime: submitTime
      }));

      // Log performance warning if threshold exceeded
      if (submitTime > 2000) { // 2 second threshold for form submission
        console.warn(`Form submit time ${submitTime.toFixed(2)}ms exceeds expected threshold`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

      setModalState({
        step: 'error',
        progress: 0,
        message: 'Failed to initiate search',
        error: errorMessage
      });
    }
  }, [workflow.isSubmitting, workflow.state.searchProgress, onSubmit]);

  // Reset modal to form state
  const resetToForm = useCallback(() => {
    setModalState({
      step: 'form',
      progress: 0,
      message: 'Configure your search criteria'
    });
    // Reset workflow when returning to form
    workflow.resetWorkflow();
  }, [workflow.resetWorkflow]);

  // Render modal content based on current state
  const renderModalContent = useCallback(() => {
    switch (modalState.step) {
      case 'form':
        return (
          <SearchForm
            onSubmit={handleFormSubmit}
            initialValues={initialData}
            loading={workflow.isSubmitting}
            disabled={workflow.isSubmitting}
          />
        );

      case 'generating':
        return (
          <div className="space-y-6 py-8">
            {/* Loading animation */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">AI Search in Progress</h3>
                <p className="text-muted-foreground">
                  {workflow.state.searchProgress?.message || modalState.message}
                </p>
                {workflow.state.currentSearch && (
                  <Badge variant="outline" className="mt-2">
                    Search ID: {workflow.state.currentSearch.slice(0, 8)}...
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{workflow.state.searchProgress?.progress || modalState.progress}%</span>
              </div>
              <Progress
                value={workflow.state.searchProgress?.progress || modalState.progress}
                className="h-2"
              />
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Wand2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <h4 className="font-medium text-sm">AI-Powered</h4>
                <p className="text-xs text-muted-foreground mt-1">Intelligent query generation</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Search className="h-6 w-6 mx-auto mb-2 text-primary" />
                <h4 className="font-medium text-sm">Multi-Source</h4>
                <p className="text-xs text-muted-foreground mt-1">Search across multiple platforms</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-primary" />
                <h4 className="font-medium text-sm">Verified</h4>
                <p className="text-xs text-muted-foreground mt-1">Contact verification process</p>
              </div>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="space-y-6 py-8">
            {/* Success state */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Search Initiated Successfully!</h3>
                <p className="text-muted-foreground">{modalState.message}</p>
                {modalState.searchId && (
                  <Badge variant="outline" className="mt-2">
                    Search ID: {modalState.searchId}
                  </Badge>
                )}
              </div>
            </div>

            {/* Next steps */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your AI-powered search is now running in the background. You can monitor the progress and view results as they become available.
              </AlertDescription>
            </Alert>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleClose}
                className="flex-1"
              >
                View Results
              </Button>
              <Button
                variant="outline"
                onClick={resetToForm}
                className="flex-1"
              >
                Start New Search
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-6 py-8">
            {/* Error state */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Search Failed</h3>
                <p className="text-muted-foreground">{modalState.message}</p>
              </div>
            </div>

            {/* Error details */}
            {(modalState.error || workflow.state.searchError) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {modalState.error || workflow.state.searchError}
                </AlertDescription>
              </Alert>
            )}

            {/* Recovery actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={resetToForm}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [modalState, handleFormSubmit, initialData, workflow.isSubmitting, handleClose, resetToForm]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        ref={modalContentRef}
        className={cn(
          "w-full max-w-[90vw] lg:max-w-[75vw] max-h-[90vh] overflow-hidden",
          "flex flex-col rounded-3xl",
          // Performance optimization for smooth animations
          "will-change-transform"
        )}
        onKeyDown={handleKeyDown}
        aria-label={modalState.step === 'form' ? "AI Search Configuration" : "AI Search Progress"}
      >
        {/* Modal Header */}
        <DialogHeader
          className={cn("pb-4", modalState.step !== "form" && "border-b")}
        >
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Wand2 className="h-5 w-5" />
            {modalState.step === "form" && "Find contacts with AI"}
            {modalState.step === "generating" && "Processing search"}
            {modalState.step === "completed" && "Search initiated"}
            {modalState.step === "error" && "Search failed"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {modalState.step === "form" && "Pick your audience and we’ll surface the best matching journalists."}
            {modalState.step === "generating" && "Working through the workflow and assembling results."}
            {modalState.step === "completed" && "Your AI search now runs in the background."}
            {modalState.step === "error" && "Something prevented the search from starting."}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Content */}
        <div className={cn(
          "flex-1 overflow-y-auto",
          modalState.step === 'form' && "px-0" // Form has its own padding
        )}>
          {renderModalContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
