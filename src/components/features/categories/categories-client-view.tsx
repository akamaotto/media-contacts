"use client";

import { useState, useRef } from "react";
import { CategoriesTable } from "./categories-table";
import { AddCategorySheet } from "./add-category-sheet";
import { EditCategorySheet } from "./edit-category-sheet";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { CategoryDetailSheet } from "./category-detail-sheet";
import { PageHeader } from "@/components/dashboard/page-header";
// Local minimal Category type for UI usage
type Category = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  beatCount?: number;
  outletCount?: number;
  // Optional detail list used by edit sheet to preselect beats
  beats?: Array<{ id: string; name: string; description?: string | null; contactCount?: number }>;
};

interface CategoriesClientViewProps {
  // Future props if needed
}

export function CategoriesClientView({}: CategoriesClientViewProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [viewingCategoryId, setViewingCategoryId] = useState<string | null>(null);
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

  const handleView = (category: Category) => {
    setViewingCategoryId(category.id);
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
      <PageHeader
        title="Categories"
        description="Manage content categories for organizing media contacts and outlets"
        addButtonLabel="Add Category"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <CategoriesTable
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        ref={refreshTableRef}
      />
      
      {/* Category Detail Sheet */}
      <CategoryDetailSheet
        categoryId={viewingCategoryId}
        isOpen={!!viewingCategoryId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingCategoryId(null);
          }
        }}
        onEdit={(category) => {
          setViewingCategoryId(null);
          setEditingCategory(category);
        }}
        onDelete={(category) => {
          setViewingCategoryId(null);
          setDeletingCategory(category);
        }}
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
