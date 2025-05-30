"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { UploadCloudIcon, DownloadCloudIcon, PlusCircleIcon } from "lucide-react";

interface HeaderActionButtonsProps {
  onAddContactOpen: () => void;
}

export function HeaderActionButtons({ onAddContactOpen }: HeaderActionButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      <Button variant="outline" className="w-full sm:w-auto">
        <UploadCloudIcon className="mr-2 h-4 w-4" />
        Import CSV
      </Button>
      <Button variant="outline" className="w-full sm:w-auto">
        <DownloadCloudIcon className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <Button onClick={onAddContactOpen} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
        <PlusCircleIcon className="mr-2 h-4 w-4" />
        Add Contact
      </Button>
    </div>
  );
}

export default HeaderActionButtons;
