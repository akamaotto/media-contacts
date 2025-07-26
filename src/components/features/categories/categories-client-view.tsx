"use client";

import { useState, useRef } from "react";
import { CategoriesTable } from "./categories-table";
import { AddCategorySheet } from "./add-category-sheet";
import { EditCategorySheet } from "./edit-category-sheet";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import type { Category } from "@/backend/categories/actions";

interface CategoriesClientViewProps {
  // Future props if needed
}

export function CategoriesClientView({}: CategoriesClientViewProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const refreshTableRef = useRef<{ refresh: () => void }>(null);

  // Global function to open Add Category modal (for breadcrumb button)
  if (typeof window !== 'undefined') {
    (window as any).openAddCategoryModal = () => {
      setIsAddModalOpen(true);
    };
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
  };

  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
  };

  const handleAddSuccess = () => {
    refreshTableRef.current?.refresh();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    refreshTableRef.current?.refresh();
    setEditingCategory(null);
  };

  const handleDeleteSuccess = () => {
    refreshTableRef.current?.refresh();
    setDeletingCategory(null);
  };

  return (
    <div className="space-y-6">
      <CategoriesTable 
        onEdit={handleEdit}
        onDelete={handleDelete}
        ref={refreshTableRef}
      />
      
      {/* Add Category Sheet */}
      <AddCategorySheet
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />
      
      {/* Edit Category Sheet */}
      {editingCategory && (
        <EditCategorySheet
          category={editingCategory}
          isOpen={!!editingCategory}
          onOpenChange={(open) => {
            if (!open) {
              setEditingCategory(null);
            }
          }}
          onSuccess={handleEditSuccess}
        />
      )}
      
      {/* Delete Category Dialog */}
      {deletingCategory && (
        <DeleteCategoryDialog
          category={deletingCategory}
          isOpen={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
