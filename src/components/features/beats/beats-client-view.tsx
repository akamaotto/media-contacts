"use client";

import { useState, useRef } from "react";
import { BeatsTable } from "./beats-table";
import { AddBeatSheet } from "./add-beat-sheet";
import { EditBeatSheet } from "./edit-beat-sheet";
import { DeleteBeatDialog } from "./delete-beat-dialog";
import type { Beat } from "@/backend/beats/actions";

interface BeatsClientViewProps {
  // Future props if needed
}

export function BeatsClientView({}: BeatsClientViewProps) {
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null);
  const [deletingBeat, setDeletingBeat] = useState<Beat | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const refreshTableRef = useRef<{ refresh: () => void }>(null);

  // Global function to open Add Beat modal (for breadcrumb button)
  if (typeof window !== 'undefined') {
    (window as any).openAddBeatModal = () => {
      setIsAddModalOpen(true);
    };
  }

  const handleEdit = (beat: Beat) => {
    setEditingBeat(beat);
  };

  const handleDelete = (beat: Beat) => {
    setDeletingBeat(beat);
  };

  const handleAddSuccess = () => {
    refreshTableRef.current?.refresh();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    refreshTableRef.current?.refresh();
    setEditingBeat(null);
  };

  const handleDeleteSuccess = () => {
    refreshTableRef.current?.refresh();
    setDeletingBeat(null);
  };

  return (
    <div className="space-y-6">
      <BeatsTable 
        onEdit={handleEdit}
        onDelete={handleDelete}
        ref={refreshTableRef}
      />
      
      {/* Add Beat Sheet */}
      <AddBeatSheet
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />
      
      {/* Edit Beat Sheet */}
      {editingBeat && (
        <EditBeatSheet
          beat={editingBeat}
          isOpen={!!editingBeat}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBeat(null);
            }
          }}
          onSuccess={handleEditSuccess}
        />
      )}
      
      {/* Delete Beat Dialog */}
      {deletingBeat && (
        <DeleteBeatDialog
          beat={deletingBeat}
          isOpen={!!deletingBeat}
          onOpenChange={(open) => !open && setDeletingBeat(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
