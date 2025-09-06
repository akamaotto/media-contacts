"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle } from "lucide-react";

interface ApiEmailVerificationFilterProps {
  emailVerified: 'all' | 'verified' | 'unverified';
  onEmailVerifiedChange: (value: 'all' | 'verified' | 'unverified') => void;
}

export function ApiEmailVerificationFilter({
  emailVerified,
  onEmailVerifiedChange
}: ApiEmailVerificationFilterProps) {
  return (
    <div className="min-w-[180px]">
      <Select value={emailVerified} onValueChange={onEmailVerifiedChange}>
        <SelectTrigger>
          <SelectValue placeholder="Email verification" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" /> {/* Spacer */}
              <span>All Contacts</span>
            </div>
          </SelectItem>
          <SelectItem value="verified">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Verified Only</span>
            </div>
          </SelectItem>
          <SelectItem value="unverified">
            <div className="flex items-center gap-2">
              <XCircle className="h-3 w-3 text-amber-500" />
              <span>Unverified Only</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}