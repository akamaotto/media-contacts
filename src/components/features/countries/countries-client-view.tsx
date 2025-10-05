"use client";

import React, { useState, useEffect, useRef } from "react";
import { CountriesTable } from './countries-table';
import { AddCountrySheet } from './add-country-sheet';
import { CountryDetailSheet } from './country-detail-sheet';
import type { Country } from '@/app/api/countries/types';
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CountriesClientView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingCountry, setViewingCountry] = useState<Country | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const componentRef = useRef<{ openAddCountryModal: () => void }>(null);

  const handleAddSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewCountry = (country: Country) => {
    setViewingCountry(country);
  };

  const handleEditCountry = (country: Country) => {
    setViewingCountry(null);
    // We would typically open an edit sheet here, but for now we'll just trigger a refresh
    setTimeout(() => setRefreshTrigger(prev => prev + 1), 100);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Countries</h2>
          <p className="text-muted-foreground">
            Manage countries and geographic regions for media contacts
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Country
        </Button>
      </div>

      {/* Countries Table */}
      <CountriesTable
        key={refreshTrigger}
        onView={handleViewCountry}
      />
      
      {/* Add Country Sheet */}
      <AddCountrySheet
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddSuccess}
      />
      
      {/* Country Detail Sheet */}
      <CountryDetailSheet
        isOpen={!!viewingCountry}
        onOpenChange={(open) => !open && setViewingCountry(null)}
        country={viewingCountry}
        onEdit={handleEditCountry}
      />
    </div>
  );
}