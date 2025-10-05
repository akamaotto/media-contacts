"use client";

import React, { useState, useEffect } from "react";
import { LanguagesTable } from './languages-table';
import { AddLanguageSheet } from './add-language-sheet';
import { EditLanguageSheet } from './edit-language-sheet';
import { DeleteLanguageDialog } from './delete-language-dialog';
import { LanguageDetailSheet } from './language-detail-sheet';
import { Language } from '@/lib/types/geography';
import { LanguagesTableErrorBoundary } from './error-boundary';
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguagesClientView() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null);
  const [viewingLanguage, setViewingLanguage] = useState<Language | null>(null);

  const handleAddSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setDeletingLanguage(null);
  };

  const openAddLanguageModal = () => {
    setIsAddModalOpen(true);
  };

  const handleEdit = (language: Language) => {
    setEditingLanguage(language);
  };

  const handleDelete = (language: Language) => {
    setDeletingLanguage(language);
  };

  const handleView = (language: Language) => {
    setViewingLanguage(language);
  };

  // Expose the openAddLanguageModal function to the global scope for breadcrumb button access
  useEffect(() => {
    const ref = {
      openAddLanguageModal
    };
    (window as any).__languagesTableRef = { current: ref };
    
    return () => {
      delete (window as any).__languagesTableRef;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Languages</h2>
          <p className="text-muted-foreground">
            Manage languages and their associated media contacts
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Language
        </Button>
      </div>

      {/* Languages Table with Error Boundary */}
      <LanguagesTableErrorBoundary>
        <LanguagesTable
          key={refreshTrigger}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      </LanguagesTableErrorBoundary>
      
      {/* Add Language Sheet */}
      <AddLanguageSheet
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />
      
      {/* Edit Language Sheet */}
      {editingLanguage && (
        <EditLanguageSheet
          isOpen={!!editingLanguage}
          onOpenChange={(open) => !open && setEditingLanguage(null)}
          onSuccess={handleEditSuccess}
          language={editingLanguage}
        />
      )}
      
      {/* Delete Language Dialog */}
      {deletingLanguage && (
        <DeleteLanguageDialog
          isOpen={!!deletingLanguage}
          onClose={() => setDeletingLanguage(null)}
          onSuccess={handleDeleteSuccess}
          language={deletingLanguage}
        />
      )}
      
      {/* Language Detail Sheet */}
      {viewingLanguage && (
        <LanguageDetailSheet
          isOpen={!!viewingLanguage}
          onOpenChange={(open) => !open && setViewingLanguage(null)}
          language={viewingLanguage}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}