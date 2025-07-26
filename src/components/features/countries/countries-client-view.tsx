"use client";

import React, { useState, useEffect, useRef } from "react";
import { CountriesTable } from './countries-table';
import { AddCountrySheet } from './add-country-sheet';

export function CountriesClientView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const componentRef = useRef<{ openAddCountryModal: () => void }>(null);

  const handleAddSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const openAddCountryModal = () => {
    setIsAddModalOpen(true);
  };

  // Expose the openAddCountryModal function to the global scope for breadcrumb button access
  useEffect(() => {
    const ref = {
      openAddCountryModal
    };
    (window as any).__countriesTableRef = { current: ref };
    
    return () => {
      delete (window as any).__countriesTableRef;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Countries Table */}
      <CountriesTable key={refreshTrigger} />
      
      {/* Add Country Sheet */}
      <AddCountrySheet
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
