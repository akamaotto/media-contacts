/**
 * Application Constants
 * Centralized configuration for paths, API endpoints, and other constants
 */

export const PATHS = {
  // Auth paths
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  
  // Dashboard paths
  DASHBOARD: '/dashboard',
  DASHBOARD_MEDIA_CONTACTS: '/dashboard/media-contacts',
  DASHBOARD_PUBLISHERS: '/dashboard/publishers',
  DASHBOARD_OUTLETS: '/dashboard/outlets',
  DASHBOARD_BEATS: '/dashboard/beats',
  DASHBOARD_CATEGORIES: '/dashboard/categories',
  DASHBOARD_COUNTRIES: '/dashboard/countries',
  DASHBOARD_LANGUAGES: '/dashboard/languages',
  DASHBOARD_REGIONS: '/dashboard/regions',
  DASHBOARD_PROFILE: '/dashboard/profile',
  DASHBOARD_ADMIN_USERS: '/dashboard/admin/users',
  DASHBOARD_MONITORING: '/dashboard/monitoring',
  
  // API paths
  API_AUTH: '/api/auth',
  API_MEDIA_CONTACTS: '/api/media-contacts',
  API_PUBLISHERS: '/api/publishers',
  API_OUTLETS: '/api/outlets',
  API_BEATS: '/api/beats',
  API_CATEGORIES: '/api/categories',
  API_COUNTRIES: '/api/countries',
  API_LANGUAGES: '/api/languages',
  API_REGIONS: '/api/regions',
} as const;

export const API_ENDPOINTS = {
  // Auth endpoints
  NEXTAUTH: '/api/auth/[...nextauth]',
  REGISTER: '/api/register',
  
  // Media Contacts endpoints
  MEDIA_CONTACTS: '/api/media-contacts',
  MEDIA_CONTACTS_SEARCH: '/api/media-contacts/search',
  MEDIA_CONTACTS_EXPORT: '/api/media-contacts/export',
  MEDIA_CONTACTS_IMPORT: '/api/media-contacts/import',
  MEDIA_CONTACTS_TEMPLATE: '/api/media-contacts/template',
  
  // Filter endpoints
  FILTERS_COUNTRIES: '/api/filters/countries',
  FILTERS_BEATS: '/api/filters/beats',
  FILTERS_OUTLETS: '/api/filters/outlets',
  FILTERS_REGIONS: '/api/filters/regions',
  FILTERS_LANGUAGES: '/api/filters/languages',
} as const;

export const APP_CONFIG = {
  // Application metadata
  APP_NAME: 'Media Contacts DB',
  APP_DESCRIPTION: 'Manage and organize media publishers and their outlets',
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // UI constants
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  
  // Database constants
  MAX_SEARCH_RESULTS: 50,
  DEBOUNCE_DELAY: 300,
} as const;

export const VALIDATION_RULES = {
  // Field length limits
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_EMAIL_LENGTH: 320,
  MAX_URL_LENGTH: 2048,
  
  // Minimum requirements
  MIN_PASSWORD_LENGTH: 8,
  MIN_SEARCH_LENGTH: 2,
} as const;

// Type exports for better TypeScript support
export type PathKey = keyof typeof PATHS;
export type ApiEndpointKey = keyof typeof API_ENDPOINTS;
