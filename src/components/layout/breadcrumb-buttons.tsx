"use client";

import React from 'react';
import { DashboardActionButtons } from './dashboard-action-buttons';
import { createCSVIntegration } from './dashboard-button-configs';

interface BreadcrumbButtonsProps {
  onAddContact: () => void;
  currentFilters?: Record<string, any>;
  onImportComplete?: () => void;
  onRefresh?: () => void;
}

/**
 * BreadcrumbButtons component - Extracted from CSVIntegrationWrapper
 * Provides functional CSV import/export buttons with proper integration
 * This replaces the non-functional button group 1 with the working functionality from group 2
 */
export function BreadcrumbButtons({
  onAddContact,
  currentFilters = {},
  onImportComplete,
  onRefresh
}: BreadcrumbButtonsProps) {
  const csvIntegration = createCSVIntegration({
    onAddContact,
    currentFilters,
    onImportComplete,
    onRefresh
  });
  
  return (
    <>
      {/* Render the functional action buttons */}
      <DashboardActionButtons buttons={csvIntegration.actionButtons} />
      
      {/* Render the CSV modals and dialogs */}
      {csvIntegration.csvComponents}
    </>
  );
}
