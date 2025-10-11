/**
 * Enhanced microcopy constants for improved user experience
 * This file contains all user-facing text with clear, helpful, and consistent messaging
 */

export const MICROCOPY = {
  // General UI
  GENERAL: {
    LOADING: 'Loading...',
    LOADING_ITEMS: 'Loading items...',
    NO_RESULTS: 'No results found',
    NO_DATA: 'No data available',
    ERROR: 'Something went wrong',
    RETRY: 'Try again',
    CANCEL: 'Cancel',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
    CLOSE: 'Close',
    BACK: 'Back',
    NEXT: 'Next',
    PREVIOUS: 'Previous',
    DONE: 'Done',
    CLEAR: 'Clear',
    CLEAR_ALL: 'Clear all',
    SELECT: 'Select',
    SELECT_ALL: 'Select all',
    SEARCH: 'Search',
    FILTER: 'Filter',
    SORT: 'Sort',
    VIEW: 'View',
    COPY: 'Copy',
    EXPORT: 'Export',
    IMPORT: 'Import',
    REFRESH: 'Refresh',
    SETTINGS: 'Settings',
    HELP: 'Help',
    LEARN_MORE: 'Learn more',
    REQUIRED: 'Required',
    OPTIONAL: 'Optional',
    RECOMMENDED: 'Recommended',
  },

  // AI Search Feature
  AI_SEARCH: {
    // Modal titles and descriptions
    MODAL_TITLE: 'Find contacts with AI',
    MODAL_DESCRIPTION: 'Describe your ideal contacts and our AI will find the perfect matches across multiple sources.',
    MODAL_CONFIG_TITLE: 'Configure your AI search',
    MODAL_PROCESSING_TITLE: 'AI search in progress',
    MODAL_COMPLETED_TITLE: 'Search completed successfully',
    MODAL_ERROR_TITLE: 'Search failed',

    // Form labels and placeholders
    SEARCH_BRIEF_LABEL: 'Search brief',
    SEARCH_BRIEF_PLACEHOLDER: 'e.g. Technology journalists covering AI and machine learning in Europe who speak English',
    SEARCH_BRIEF_HELP: 'Be specific about topics, geography, and any special requirements. The more detail you provide, the better the results.',
    SEARCH_BRIEF_MIN_CHARS: 'Enter at least 3 characters to start',
    SEARCH_BRIEF_MAX_CHARS: 'Maximum 1000 characters',

    // Geographic focus
    GEOGRAPHIC_FOCUS_LABEL: 'Geographic focus',
    GEOGRAPHIC_FOCUS_HELP: 'Select countries where you want to find contacts. This helps us target the right regions.',
    SELECT_COUNTRIES: 'Select countries...',
    SEARCH_COUNTRIES: 'Search countries...',
    NO_COUNTRIES_FOUND: 'No countries found',
    COUNTRIES_SELECTED: (count: number, max: number) => `${count} of ${max} countries selected`,
    COUNTRIES_LIMIT: (max: number) => `Select up to ${max} countries`,

    // Categories
    CATEGORIES_LABEL: 'Categories',
    CATEGORIES_HELP: 'Choose topics and beats that best match your story. This helps us find journalists who cover these areas.',
    SELECT_CATEGORIES: 'Select categories...',
    SEARCH_CATEGORIES: 'Search categories...',
    NO_CATEGORIES_FOUND: 'No categories found',
    NO_CATEGORIES_SELECTED: 'No categories selected',
    CATEGORIES_SELECTED: (count: number) => `${count} categor${count === 1 ? 'y' : 'ies'} selected`,

    // Beats
    BEATS_LABEL: 'Beats',
    BEATS_HELP: 'Specific beats or topics within your chosen categories.',
    SELECT_BEATS: 'Select beats...',
    SEARCH_BEATS: 'Search beats...',
    NO_BEATS_FOUND: 'No beats found',
    BEATS_SELECTED: (count: number) => `${count} beat${count === 1 ? '' : 's'} selected`,

    // Advanced settings
    ADVANCED_SETTINGS_TITLE: 'Advanced settings',
    ADVANCED_SETTINGS_DESCRIPTION: 'Fine-tune your search for better results. Most users can leave these as default.',
    MAX_QUERIES_LABEL: 'Maximum AI queries',
    MAX_QUERIES_HELP: 'Higher numbers give more comprehensive results but use more credits and take longer.',
    PROCESSING_PRIORITY_LABEL: 'Processing priority',
    PROCESSING_PRIORITY_HELP: 'Higher priority processes faster but costs more credits.',
    PRIORITY_LOW: 'Low · Slower, saves credits',
    PRIORITY_MEDIUM: 'Medium · Balanced performance',
    PRIORITY_HIGH: 'High · Fastest processing',

    // Sliders
    DIVERSITY_THRESHOLD_LABEL: 'Result diversity',
    DIVERSITY_THRESHOLD_HELP: 'Higher values give more varied results, lower values focus on similar contacts.',
    MIN_RELEVANCE_LABEL: 'Minimum relevance',
    MIN_RELEVANCE_HELP: 'Only show contacts that meet this relevance score. Higher scores mean better matches.',

    // Toggle switches
    AI_ENHANCEMENT_LABEL: 'AI enhancement',
    AI_ENHANCEMENT_HELP: 'Use advanced AI to improve search quality and relevance.',
    FALLBACK_STRATEGIES_LABEL: 'Smart fallbacks',
    FALLBACK_STRATEGIES_HELP: 'Automatically try alternative approaches if initial search has limited results.',
    CACHE_RESULTS_LABEL: 'Cache recent results',
    CACHE_RESULTS_HELP: 'Save search results to speed up similar future searches.',

    // Optional fields
    PREFERRED_LANGUAGES_LABEL: 'Preferred languages',
    PREFERRED_LANGUAGES_PLACEHOLDER: 'e.g. English, French, Spanish',
    PREFERRED_LANGUAGES_HELP: 'Find contacts who create content in these languages.',

    PREFERRED_REGIONS_LABEL: 'Preferred regions',
    PREFERRED_REGIONS_PLACEHOLDER: 'e.g. EMEA, LATAM, APAC',
    PREFERRED_REGIONS_HELP: 'Target specific global regions.',

    PREFERRED_OUTLETS_LABEL: 'Preferred outlets',
    PREFERRED_OUTLETS_PLACEHOLDER: 'e.g. TechCrunch, BBC, New York Times',
    PREFERRED_OUTLETS_HELP: 'Include or exclude specific media outlets.',

    DATE_RANGE_LABEL: 'Publication date range',
    DATE_RANGE_HELP: 'Find contacts based on recent publishing activity.',
    START_DATE_LABEL: 'From date',
    END_DATE_LABEL: 'To date',

    // Form actions
    START_SEARCH: 'Start AI search',
    STARTING_SEARCH: 'Starting search...',
    RESET_FORM: 'Reset form',
    RESET_TO_DEFAULTS: 'Reset to defaults',

    // Progress messages
    INITIALIZING_SEARCH: 'Initializing AI search...',
    GENERATING_QUERIES: 'Generating intelligent search queries...',
    SEARCHING_SOURCES: 'Searching across multiple sources...',
    ANALYZING_RESULTS: 'Analyzing and verifying contacts...',
    FINALIZING_RESULTS: 'Finalizing your results...',

    // Success messages
    SEARCH_INITIATED: 'Your AI search has been started successfully!',
    SEARCH_COMPLETED: 'Search completed! Found {count} contacts.',
    RESULTS_READY: 'Your results are ready to view.',

    // Error messages
    SEARCH_FAILED: 'We couldn\'t complete your search',
    NETWORK_ERROR: 'Network connection lost. Please check your internet connection and try again.',
    INVALID_INPUT: 'Please check your search criteria and try again.',
    QUOTA_EXCEEDED: 'You\'ve reached your search limit. Upgrade your plan for more searches.',
    SERVER_ERROR: 'Our servers are experiencing issues. Please try again in a few minutes.',

    // Empty states
    NO_SEARCH_HISTORY: 'No previous searches yet. Start your first AI search above!',
    NO_SAVED_SEARCHES: 'No saved searches. Save your successful searches for easy reuse.',
    NO_FAVORITES: 'No favorite contacts yet. Star contacts to save them here.',

    // Tooltips
    AI_POWERED_TOOLTIP: 'Powered by advanced AI that understands your needs and finds the perfect contacts.',
    DIVERSE_SOURCES_TOOLTIP: 'Searches across news sites, social media, company websites, and more.',
    VERIFIED_CONTACTS_TOOLTIP: 'All contacts are verified for accuracy and relevance.',
  },

  // Results Table
  RESULTS_TABLE: {
    TITLE: 'Search results',
    SUBTITLE: 'Contacts found by our AI',
    EMPTY_TITLE: 'No contacts found',
    EMPTY_DESCRIPTION: 'Try adjusting your search criteria or browse our suggested contacts.',
    EMPTY_ACTION: 'Modify search',

    // Column headers
    NAME_HEADER: 'Name',
    EMAIL_HEADER: 'Email',
    COMPANY_HEADER: 'Company',
    OUTLET_HEADER: 'Media Outlet',
    BEAT_HEADER: 'Beat',
    LOCATION_HEADER: 'Location',
    CONFIDENCE_HEADER: 'Match Score',
    VERIFICATION_HEADER: 'Status',
    ADDED_HEADER: 'Date Added',

    // Actions
    VIEW_CONTACT: 'View details',
    IMPORT_CONTACT: 'Import contact',
    IMPORT_CONTACTS: 'Import selected',
    EXPORT_CONTACTS: 'Export contacts',
    SELECT_CONTACTS: 'Select contacts',
    CONTACT_SELECTED: 'Selected',
    CONTACTS_SELECTED: (count: number) => `${count} selected`,

    // Filtering
    SEARCH_PLACEHOLDER: 'Search contacts...',
    FILTER_BY_VERIFICATION: 'Filter by verification status',
    FILTER_BY_CONFIDENCE: 'Filter by match score',
    FILTER_BY_DATE: 'Filter by date added',

    // Sorting
    SORT_BY_RELEVANCE: 'Sort by relevance',
    SORT_BY_NAME: 'Sort by name',
    SORT_BY_COMPANY: 'Sort by company',
    SORT_BY_DATE: 'Sort by date added',

    // Bulk actions
    BULK_SELECT_ALL: 'Select all {count} contacts',
    BULK_DESELECT_ALL: 'Deselect all',
    BULK_IMPORT: 'Import {count} contacts',
    BULK_EXPORT: 'Export {count} contacts',
    BULK_DELETE: 'Delete selected',

    // Pagination
    SHOWING_RESULTS: (start: number, end: number, total: number) => 
      `Showing ${start}-${end} of ${total} contacts`,
    RESULTS_PER_PAGE: 'Results per page',
    PAGE_X_OF_Y: (current: number, total: number) => `Page ${current} of ${total}`,
    FIRST_PAGE: 'First page',
    LAST_PAGE: 'Last page',
  },

  // Contact Preview
  CONTACT_PREVIEW: {
    TITLE: 'Contact details',
    CLOSE_PREVIEW: 'Close preview',
    NEXT_CONTACT: 'Next contact',
    PREVIOUS_CONTACT: 'Previous contact',
    IMPORT_CONTACT: 'Import to contacts',
    CONTACT_IMPORTED: 'Imported',
    FAVORITE_CONTACT: 'Add to favorites',
    FAVORITED: 'Favorited',
    REMOVE_FAVORITE: 'Remove from favorites',

    // Tabs
    DETAILS_TAB: 'Details',
    SOURCES_TAB: 'Sources',
    METADATA_TAB: 'Metadata',
    ACTIVITY_TAB: 'Activity',

    // Contact information
    CONTACT_INFO_TITLE: 'Contact information',
    EMAIL_LABEL: 'Email',
    PHONE_LABEL: 'Phone',
    LOCATION_LABEL: 'Location',
    LANGUAGES_LABEL: 'Languages',
    WEBSITE_LABEL: 'Website',

    // Social media
    SOCIAL_MEDIA_TITLE: 'Social media',
    LINKEDIN_LABEL: 'LinkedIn',
    TWITTER_LABEL: 'Twitter',
    FACEBOOK_LABEL: 'Facebook',
    INSTAGRAM_LABEL: 'Instagram',

    // Professional info
    BIO_TITLE: 'Bio',
    TAGS_TITLE: 'Tags',
    NOTES_TITLE: 'Notes',
    ADD_NOTE: 'Add note',

    // Verification
    VERIFICATION_STATUS_TITLE: 'Verification status',
    CONFIDENCE_SCORE_TITLE: 'Match confidence',
    QUALITY_SCORE_TITLE: 'Data quality',
    LAST_VERIFIED: 'Last verified',
    VERIFICATION_METHOD: 'Verification method',

    // Sources
    SOURCES_TITLE: 'Sources',
    SOURCE_URL: 'Source URL',
    EXTRACTION_DATE: 'Extracted on',
    RELIABILITY_SCORE: 'Source reliability',

    // Actions
    COPY_EMAIL: 'Copy email',
    COPY_PHONE: 'Copy phone',
    COPY_URL: 'Copy URL',
    SEND_EMAIL: 'Send email',
    CALL_PHONE: 'Call phone',
    VISIT_WEBSITE: 'Visit website',
  },

  // Settings Panel
  SETTINGS: {
    TITLE: 'Settings',
    DESCRIPTION: 'Customize your experience and preferences',

    // User preferences
    PREFERENCES_TITLE: 'Preferences',
    THEME_LABEL: 'Theme',
    THEME_LIGHT: 'Light',
    THEME_DARK: 'Dark',
    THEME_SYSTEM: 'Use system setting',
    LANGUAGE_LABEL: 'Language',
    TIMEZONE_LABEL: 'Timezone',
    DATE_FORMAT_LABEL: 'Date format',
    TIME_FORMAT_LABEL: 'Time format',

    // Search preferences
    SEARCH_PREFERENCES_TITLE: 'Search preferences',
    DEFAULT_COUNTRY_LABEL: 'Default country',
    DEFAULT_CATEGORIES_LABEL: 'Default categories',
    SAVE_SEARCH_HISTORY_LABEL: 'Save search history',
    AUTO_SAVE_LABEL: 'Auto-save searches',
    NOTIFICATION_PREFERENCES_LABEL: 'Notifications',

    // Display preferences
    DISPLAY_TITLE: 'Display',
    DENSITY_LABEL: 'Display density',
    DENSITY_COMPACT: 'Compact',
    DENSITY_COMFORTABLE: 'Comfortable',
    DENSITY_SPACIOUS: 'Spacious',
    ITEMS_PER_PAGE_LABEL: 'Items per page',
    SHOW_PREVIEW_LABEL: 'Show contact previews',

    // Accessibility
    ACCESSIBILITY_TITLE: 'Accessibility',
    REDUCE_MOTION_LABEL: 'Reduce motion',
    HIGH_CONTRAST_LABEL: 'High contrast',
    LARGE_TEXT_LABEL: 'Large text',
    SCREEN_READER_LABEL: 'Screen reader optimizations',
    KEYBOARD_SHORTCUTS_LABEL: 'Keyboard shortcuts',

    // Account
    ACCOUNT_TITLE: 'Account',
    PROFILE_LABEL: 'Profile',
    NOTIFICATIONS_LABEL: 'Notifications',
    PRIVACY_LABEL: 'Privacy',
    SECURITY_LABEL: 'Security',
    SUBSCRIPTION_LABEL: 'Subscription',
    USAGE_LABEL: 'Usage statistics',

    // Actions
    SAVE_SETTINGS: 'Save settings',
    RESET_SETTINGS: 'Reset to defaults',
    EXPORT_SETTINGS: 'Export settings',
    IMPORT_SETTINGS: 'Import settings',
  },

  // Keyboard Shortcuts
  KEYBOARD_SHORTCUTS: {
    TITLE: 'Keyboard shortcuts',
    DESCRIPTION: 'Navigate faster with these keyboard shortcuts',
    CLOSE: 'Close shortcuts',

    // Global shortcuts
    OPEN_SEARCH: 'Open search',
    CLOSE_MODAL: 'Close modal',
    SAVE: 'Save',
    CANCEL: 'Cancel',
    HELP: 'Show help',
    SETTINGS: 'Open settings',

    // Navigation shortcuts
    NEXT_PAGE: 'Next page',
    PREVIOUS_PAGE: 'Previous page',
    FIRST_PAGE: 'First page',
    LAST_PAGE: 'Last page',
    SCROLL_UP: 'Scroll up',
    SCROLL_DOWN: 'Scroll down',

    // Selection shortcuts
    SELECT_ALL: 'Select all',
    DESELECT_ALL: 'Deselect all',
    TOGGLE_SELECTION: 'Toggle selection',
    NEXT_ITEM: 'Next item',
    PREVIOUS_ITEM: 'Previous item',

    // Action shortcuts
    IMPORT_CONTACTS: 'Import contacts',
    EXPORT_CONTACTS: 'Export contacts',
    DELETE_SELECTED: 'Delete selected',
    VIEW_DETAILS: 'View details',
    EDIT_ITEM: 'Edit item',

    // Form shortcuts
    NEXT_FIELD: 'Next field',
    PREVIOUS_FIELD: 'Previous field',
    SUBMIT_FORM: 'Submit form',
    RESET_FORM: 'Reset form',
  },

  // Success Celebrations
  SUCCESS: {
    SEARCH_COMPLETED_TITLE: 'Excellent! Your search is complete',
    SEARCH_COMPLETED_MESSAGE: 'We found {count} perfect contacts for your campaign.',
    CONTACTS_IMPORTED_TITLE: 'Success! Contacts imported',
    CONTACTS_IMPORTED_MESSAGE: '{count} contacts have been added to your database.',
    FIRST_SEARCH_TITLE: 'Welcome! Your first AI search',
    FIRST_SEARCH_MESSAGE: 'You\'ve discovered the power of AI-powered contact finding.',
    MILESTONE_SEARCHES: (count: number) => `Amazing! You\'ve completed ${count} AI searches`,
    MILESTONE_CONTACTS: (count: number) => `Impressive! You\'ve found ${count} contacts`,
  },

  // Error Messages
  ERRORS: {
    NETWORK_TITLE: 'Connection issue',
    NETWORK_MESSAGE: 'Please check your internet connection and try again.',
    NETWORK_ACTION: 'Retry connection',

    VALIDATION_TITLE: 'Please review your input',
    VALIDATION_MESSAGE: 'Some fields need your attention before we can proceed.',
    VALIDATION_ACTION: 'Fix issues',

    PERMISSION_TITLE: 'Permission required',
    PERMISSION_MESSAGE: 'You don\'t have permission to perform this action.',
    PERMISSION_ACTION: 'Contact support',

    QUOTA_TITLE: 'Usage limit reached',
    QUOTA_MESSAGE: 'You\'ve reached your monthly limit. Upgrade your plan for more searches.',
    QUOTA_ACTION: 'Upgrade plan',

    SERVER_TITLE: 'Temporary issue',
    SERVER_MESSAGE: 'Our servers are experiencing issues. We\'re working on it!',
    SERVER_ACTION: 'Try again later',

    GENERIC_TITLE: 'Something went wrong',
    GENERIC_MESSAGE: 'We encountered an unexpected error. Please try again.',
    GENERIC_ACTION: 'Try again',
  },

  // Loading States
  LOADING: {
    SEARCHING: 'Searching for contacts...',
    ANALYZING: 'Analyzing results...',
    VERIFYING: 'Verifying contacts...',
    IMPORTING: 'Importing contacts...',
    EXPORTING: 'Exporting contacts...',
    SAVING: 'Saving changes...',
    LOADING_DATA: 'Loading data...',
    PROCESSING: 'Processing request...',
  },

  // Empty States
  EMPTY_STATES: {
    NO_SEARCH_RESULTS: {
      TITLE: 'No contacts found',
      DESCRIPTION: 'Try adjusting your search criteria or browse our suggestions.',
      ACTION: 'Modify search',
    },
    NO_FAVORITES: {
      TITLE: 'No favorites yet',
      DESCRIPTION: 'Star contacts to save them here for easy access.',
      ACTION: 'Start searching',
    },
    NO_HISTORY: {
      TITLE: 'No search history',
      DESCRIPTION: 'Your previous searches will appear here.',
      ACTION: 'Start your first search',
    },
    NO_IMPORTS: {
      TITLE: 'No imported contacts',
      DESCRIPTION: 'Contacts you import will appear here.',
      ACTION: 'Import contacts',
    },
  },
};

// Helper functions for dynamic microcopy
export const getMicrocopy = (key: string, params?: Record<string, any>): string => {
  const keys = key.split('.');
  let value: any = MICROCOPY;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (typeof value === 'function') {
    return value(params);
  }
  
  return value || key;
};

// Accessibility labels
export const ARIA_LABELS = {
  CLOSE_MODAL: 'Close modal dialog',
  OPEN_MENU: 'Open menu',
  CLOSE_MENU: 'Close menu',
  TOGGLE_SELECTION: 'Toggle selection',
  SELECT_ITEM: 'Select item',
  REMOVE_ITEM: 'Remove item',
  EDIT_ITEM: 'Edit item',
  DELETE_ITEM: 'Delete item',
  COPY_TO_CLIPBOARD: 'Copy to clipboard',
  SHOW_DETAILS: 'Show details',
  HIDE_DETAILS: 'Hide details',
  LOADING: 'Loading content',
  ERROR: 'Error occurred',
  SUCCESS: 'Success',
  WARNING: 'Warning',
  INFO: 'Information',
  REQUIRED_FIELD: 'Required field',
  OPTIONAL_FIELD: 'Optional field',
  HELP_TEXT: 'Help information',
  TOOLTIP: 'Tooltip',
  NOTIFICATION: 'Notification',
  PROGRESS_BAR: 'Progress bar',
  SEARCH_INPUT: 'Search input',
  FILTER_OPTIONS: 'Filter options',
  SORT_OPTIONS: 'Sort options',
  PAGINATION: 'Pagination controls',
  BULK_ACTIONS: 'Bulk actions',
  KEYBOARD_SHORTCUT: 'Keyboard shortcut',
};

export default MICROCOPY;