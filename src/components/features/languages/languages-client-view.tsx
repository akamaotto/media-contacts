"use client";

import React, { useState, useEffect } from "react";
import { LanguagesTable } from './languages-table';
import { AddLanguageSheet } from './add-language-sheet';
import { EditLanguageSheet } from './edit-language-sheet';
import { DeleteLanguageDialog } from './delete-language-dialog';
import { Language } from '@/lib/language-data';

export function LanguagesClientView() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null);

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
      {/* Languages Table */}
      <LanguagesTable 
        key={refreshTrigger} 
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
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
    </div>
  );
}
