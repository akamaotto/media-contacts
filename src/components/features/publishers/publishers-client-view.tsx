"use client";

import { useState, useRef } from "react";
import { PublishersTable } from "./publishers-table";
import { AddPublisherSheet } from "./add-publisher-sheet";
import { EditPublisherSheet } from "./edit-publisher-sheet";
import { DeletePublisherDialog } from "./delete-publisher-dialog";
import type { Publisher } from "@/backend/publishers/actions";

interface PublishersClientViewProps {
  // Future props if needed
}

export function PublishersClientView({}: PublishersClientViewProps) {
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);
  const [deletingPublisher, setDeletingPublisher] = useState<Publisher | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const refreshTableRef = useRef<{ refresh: () => void }>(null);

  // Global function to open Add Publisher modal (for breadcrumb button)
  if (typeof window !== 'undefined') {
    (window as any).openAddPublisherModal = () => {
      setIsAddModalOpen(true);
    };
  }

  const handleEdit = (publisher: Publisher) => {
    setEditingPublisher(publisher);
  };

  const handleDelete = (publisher: Publisher) => {
    setDeletingPublisher(publisher);
  };

  const handleAddSuccess = () => {
    refreshTableRef.current?.refresh();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    refreshTableRef.current?.refresh();
    setEditingPublisher(null);
  };

  const handleDeleteSuccess = () => {
    refreshTableRef.current?.refresh();
    setDeletingPublisher(null);
  };

  return (
    <div className="space-y-6">
      <PublishersTable 
        onEdit={handleEdit}
        onDelete={handleDelete}
        ref={refreshTableRef}
      />
      
      {/* Add Publisher Sheet */}
      <AddPublisherSheet
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />
      
      {/* Edit Publisher Sheet */}
      {editingPublisher && (
        <EditPublisherSheet
          publisher={editingPublisher}
          isOpen={!!editingPublisher}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPublisher(null);
            }
          }}
          onSuccess={handleEditSuccess}
        />
      )}
      
      {/* Delete Publisher Dialog */}
      <DeletePublisherDialog
        publisher={deletingPublisher}
        isOpen={!!deletingPublisher}
        onOpenChange={(open) => !open && setDeletingPublisher(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
