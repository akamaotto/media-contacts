"use client";

import { useState, useRef } from "react";
import { OutletsTable } from "./outlets-table";
import { AddOutletSheet } from "./add-outlet-sheet";
import { EditOutletSheet } from "./edit-outlet-sheet";
import { DeleteOutletDialog } from "./delete-outlet-dialog";
import type { Outlet } from "@/backend/outlets/actions";

interface OutletsClientViewProps {
  // Future props if needed
}

export function OutletsClientView({}: OutletsClientViewProps) {
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [deletingOutlet, setDeletingOutlet] = useState<Outlet | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const refreshTableRef = useRef<{ refresh: () => void }>(null);

  // Global function to open Add Outlet modal (for breadcrumb button)
  if (typeof window !== 'undefined') {
    (window as any).openAddOutletModal = () => {
      setIsAddModalOpen(true);
    };
  }

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
  };

  const handleDelete = (outlet: Outlet) => {
    setDeletingOutlet(outlet);
  };

  const handleAddSuccess = () => {
    refreshTableRef.current?.refresh();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    refreshTableRef.current?.refresh();
    setEditingOutlet(null);
  };

  const handleDeleteSuccess = () => {
    refreshTableRef.current?.refresh();
    setDeletingOutlet(null);
  };

  return (
    <div className="space-y-6">
      <OutletsTable 
        onEdit={handleEdit}
        onDelete={handleDelete}
        ref={refreshTableRef}
      />
      
      {/* Add Outlet Sheet */}
      <AddOutletSheet
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />
      
      {/* Edit Outlet Sheet */}
      {editingOutlet && (
        <EditOutletSheet
          outlet={editingOutlet}
          isOpen={!!editingOutlet}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingOutlet(null);
            }
          }}
          onSuccess={handleEditSuccess}
        />
      )}
      
      {/* Delete Outlet Dialog */}
      <DeleteOutletDialog
        outlet={deletingOutlet}
        isOpen={!!deletingOutlet}
        onOpenChange={(open: boolean) => !open && setDeletingOutlet(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
