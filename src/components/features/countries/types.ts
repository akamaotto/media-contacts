// Shared Country types for Countries feature and related UI components

export interface CountryRegionRef {
  id: string;
  name: string;
  code: string;
  category: string;  // Made category required to match API type
}

export interface CountryLanguageRef {
  id: string;
  name: string;
  code: string;
}

export interface Country {
  id: string;
  name: string;
  code?: string | null;
  phone_code?: string | null;
  capital?: string | null;
  flag_emoji?: string | null;
  regions?: CountryRegionRef[];
  languages?: CountryLanguageRef[];
  _count?: {
    media_contacts?: number;
  };
  created_at?: Date | string;
  updated_at?: Date | string;
}