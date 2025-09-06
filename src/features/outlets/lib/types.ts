// Types for the Outlets feature used by UI components

export interface OutletPublisherRef {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
}

export interface OutletCategoryRef {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface OutletCountryRef {
  id: string;
  name: string;
  code?: string | null;
  flag_emoji?: string | null;
}

export interface Outlet {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  publishers?: OutletPublisherRef | null;
  categories?: OutletCategoryRef[];
  countries?: OutletCountryRef[];
  // Derived/aggregated counts that may come from API (_count)
  contactCount?: number;
}