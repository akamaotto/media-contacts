"use client";

import { useState, useRef, useEffect } from "react";
import { OutletsTable } from "./outlets-table";
import { AddOutletSheet } from "./add-outlet-sheet";
import { EditOutletSheet } from "./edit-outlet-sheet";
import { DeleteOutletDialog } from "./delete-outlet-dialog";
import { OutletDetailSheet } from "./outlet-detail-sheet";
import type { Outlet } from "@/features/outlets/lib/types";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OutletsClientViewProps {
  // Future props if needed
}

export function OutletsClientView({}: OutletsClientViewProps) {
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [deletingOutlet, setDeletingOutlet] = useState<Outlet | null>(null);
  const [viewingOutlet, setViewingOutlet] = useState<Outlet | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const refreshTableRef = useRef<{ refresh: () => void }>(null);
  // Preserve the selected outlet id at the moment of selection, in case outlet prop mutates
  const selectedIdRef = useRef<string | null>(null);

  // Global function to open Add Outlet modal (for breadcrumb button)
  if (typeof window !== 'undefined') {
    (window as any).openAddOutletModal = () => {
      setIsAddModalOpen(true);
    };
  }

  const handleEdit = (outlet: Outlet) => {
    console.debug('[OutletsClientView] handleEdit selected outlet:', {
      id: (outlet as any)?.id,
      outlet,
    });
    selectedIdRef.current = (outlet as any)?.id ?? null;
    console.debug('[OutletsClientView] captured selectedIdRef', { selectedId: selectedIdRef.current });
    // Shallow clone to decouple from any upstream mutations
    setEditingOutlet({ ...outlet });
  };

  const handleDelete = (outlet: Outlet) => {
    setDeletingOutlet(outlet);
  };

  const handleView = (outlet: Outlet) => {
    setViewingOutlet(outlet);
  };

  const handleAddSuccess = () => {
    refreshTableRef.current?.refresh();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = () => {
    refreshTableRef.current?.refresh();
    setEditingOutlet(null);
  };

  useEffect(() => {
    if (editingOutlet) {
      console.debug('[OutletsClientView] editingOutlet set:', {
        id: (editingOutlet as any)?.id,
        editingOutlet,
      });
    }
  }, [editingOutlet]);

  const handleDeleteSuccess = () => {
    refreshTableRef.current?.refresh();
    setDeletingOutlet(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Media Outlets</h2>
          <p className="text-muted-foreground">
            Manage media outlets and publications where contacts work
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Outlet
        </Button>
      </div>

      <OutletsTable
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
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
          selectedId={selectedIdRef.current}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingOutlet(null);
              selectedIdRef.current = null;
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
      
      {/* Outlet Detail Sheet */}
      {viewingOutlet && (
        <OutletDetailSheet
          isOpen={!!viewingOutlet}
          onOpenChange={(open) => !open && setViewingOutlet(null)}
          outlet={viewingOutlet}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}