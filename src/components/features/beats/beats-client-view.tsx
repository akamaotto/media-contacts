"use client";

import { useState, useRef } from "react";
import { BeatsTable } from "./beats-table";
import { AddBeatSheet } from "./add-beat-sheet";
import { EditBeatSheet } from "./edit-beat-sheet";
import { DeleteBeatDialog } from "./delete-beat-dialog";
import { BeatDetailSheet } from "./beat-detail-sheet";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Minimal Beat type used for local state and props
type Beat = {
  id: string;
  name: string;
  description?: string | null;
  categories?: { id: string; name: string; color?: string | null; description?: string | null }[];
  contactCount?: number;
};

interface BeatsClientViewProps {
  // Future props if needed
}

export function BeatsClientView({}: BeatsClientViewProps) {
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null);
  const [deletingBeat, setDeletingBeat] = useState<Beat | null>(null);
  const [viewingBeatId, setViewingBeatId] = useState<string | null>(null);
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

  const handleView = (beat: Beat) => {
    setViewingBeatId(beat.id);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Beats</h2>
          <p className="text-muted-foreground">
            Manage journalistic beats and topics covered by media contacts
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Beat
        </Button>
      </div>

      <BeatsTable
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
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
      
      {/* Beat Detail Sheet */}
      <BeatDetailSheet
        beatId={viewingBeatId}
        isOpen={!!viewingBeatId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingBeatId(null);
          }
        }}
        onEdit={(beat) => {
          setViewingBeatId(null);
          setEditingBeat(beat);
        }}
        onDelete={(beat) => {
          setViewingBeatId(null);
          setDeletingBeat(beat);
        }}
      />
      
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
