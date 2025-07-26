"use client";

import { useState, useRef } from "react";
import { RegionsTable } from "./regions-table";
import { AddRegionSheet } from "./add-region-sheet";
import { EditRegionSheet } from "./edit-region-sheet";
import { DeleteRegionDialog } from "./delete-region-dialog";
import { RegionDetailSheet } from "./region-detail-sheet";
import { getAllRegions } from "@/backend/regions/actions";
import type { Region } from "@/lib/country-data";

interface RegionsClientViewProps {
  // Future props if needed
}

export function RegionsClientView({}: RegionsClientViewProps) {
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [deletingRegion, setDeletingRegion] = useState<Region | null>(null);
  const [viewingRegion, setViewingRegion] = useState<Region | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [availableParentRegions, setAvailableParentRegions] = useState<{ code: string; name: string }[]>([]);
  const refreshTableRef = useRef<{ refresh: () => void }>(null);

  // Load available parent regions for dropdowns
  const loadParentRegions = async () => {
    try {
      const regions = await getAllRegions();
      const parentOptions = regions
        .filter(region => region.category === 'continent' || region.category === 'subregion')
        .map(region => ({ code: region.code, name: region.name }));
      setAvailableParentRegions(parentOptions);
    } catch (error) {
      console.error('Error loading parent regions:', error);
    }
  };

  // Global function to open Add Region sheet (for breadcrumb button)
  if (typeof window !== 'undefined') {
    (window as any).openAddRegionSheet = () => {
      loadParentRegions();
      setIsAddSheetOpen(true);
    };
  }

  const handleEdit = (region: Region) => {
    loadParentRegions();
    setEditingRegion(region);
  };

  const handleDelete = (region: Region) => {
    setDeletingRegion(region);
  };

  const handleView = (region: Region) => {
    setViewingRegion(region);
  };

  const handleAddSuccess = () => {
    refreshTableRef.current?.refresh();
  };

  const handleEditSuccess = () => {
    refreshTableRef.current?.refresh();
    setEditingRegion(null);
  };

  const handleCountryAssignmentChange = () => {
    // Refresh table when countries are assigned/removed from regions
    refreshTableRef.current?.refresh();
  };

  const handleDeleteSuccess = () => {
    refreshTableRef.current?.refresh();
    setDeletingRegion(null);
  };

  return (
    <div className="space-y-6">
      <RegionsTable 
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        ref={refreshTableRef}
      />
      
      {/* Add Region Sheet */}
      <AddRegionSheet
        isOpen={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        onSuccess={handleAddSuccess}
        availableParentRegions={availableParentRegions}
      />
      
      {/* Edit Region Sheet */}
      {editingRegion && (
        <EditRegionSheet
          isOpen={!!editingRegion}
          onOpenChange={(open) => !open && setEditingRegion(null)}
          onSuccess={handleEditSuccess}
          onCountryChange={handleCountryAssignmentChange}
          region={editingRegion}
          availableParentRegions={availableParentRegions}
        />
      )}
      
      {/* Delete Region Dialog */}
      {deletingRegion && (
        <DeleteRegionDialog
          isOpen={!!deletingRegion}
          onClose={() => setDeletingRegion(null)}
          onSuccess={handleDeleteSuccess}
          region={deletingRegion}
        />
      )}
      
      {/* Region Detail Sheet */}
      {viewingRegion && (
        <RegionDetailSheet
          isOpen={!!viewingRegion}
          onOpenChange={(open) => !open && setViewingRegion(null)}
          region={viewingRegion}
          onEdit={(region) => {
            setViewingRegion(null);
            handleEdit(region);
          }}
        />
      )}
    </div>
  );
}
