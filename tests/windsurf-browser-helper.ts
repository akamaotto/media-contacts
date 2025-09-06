/**
 * Windsurf Browser automation helper functions
 * These functions can be used with Cascade's browser automation capabilities
 */

export interface WindsurfBrowserTestConfig {
  baseUrl: string;
  testUser: {
    email: string;
    password: string;
  };
}

export const DEFAULT_CONFIG: WindsurfBrowserTestConfig = {
  baseUrl: 'http://localhost:3001',
  testUser: {
    email: 'test@test.com',
    password: 'test@123'
  }
};

/**
 * Instructions for Cascade to perform login via Windsurf Browser
 */
export const LOGIN_INSTRUCTIONS = {
  description: "Login to media contacts application",
  steps: [
    "Navigate to {baseUrl}/login",
    "Wait for login form to be visible",
    "Fill email field with: test@test.com",
    "Fill password field with: test@123", 
    "Click submit button",
    "Wait for redirect to dashboard or media-contacts page",
    "Verify successful login by checking for sidebar or user menu"
  ]
};

/**
 * Instructions for testing country filter search
 */
export const COUNTRY_FILTER_TEST_INSTRUCTIONS = {
  description: "Test country filter search functionality",
  prerequisites: ["User must be logged in", "Must be on /media-contacts page"],
  steps: [
    "Click on 'Select countries...' dropdown button",
    "Wait for dropdown to open and show search input",
    "Type 'Egy' in the search input field",
    "Wait 1 second for API call to complete",
    "Check if 'Egypt' appears in the dropdown options",
    "Take screenshot of results",
    "Check browser console for any error messages",
    "Verify API call was made to /api/filters/countries?s=Egy"
  ],
  expectedResults: [
    "Egypt should appear in the dropdown list",
    "No 'No countries found' message should be shown",
    "Console should show successful API response with Egypt data"
  ]
};

/**
 * Instructions for comprehensive filter testing
 */
export const COMPREHENSIVE_FILTER_TEST_INSTRUCTIONS = {
  description: "Test all filter dropdowns for search functionality",
  tests: [
    {
      name: "Countries Filter",
      selector: "button:has-text('Select countries')",
      searchInput: "input[placeholder*='Search countries']",
      searchTerm: "Egy",
      expectedResult: "Egypt"
    },
    {
      name: "Beats Filter", 
      selector: "button:has-text('Select beats')",
      searchInput: "input[placeholder*='Search beats']",
      searchTerm: "Tech",
      expectedResult: "Technology or Tech-related beat"
    },
    {
      name: "Outlets Filter",
      selector: "button:has-text('Select outlets')",
      searchInput: "input[placeholder*='Search outlets']", 
      searchTerm: "CNN",
      expectedResult: "CNN or news outlet"
    },
    {
      name: "Regions Filter",
      selector: "button:has-text('Select regions')",
      searchInput: "input[placeholder*='Search regions']",
      searchTerm: "Africa",
      expectedResult: "Africa or African region"
    },
    {
      name: "Languages Filter",
      selector: "button:has-text('Select languages')",
      searchInput: "input[placeholder*='Search languages']",
      searchTerm: "Eng",
      expectedResult: "English"
    }
  ]
};

/**
 * Debug steps for investigating filter issues
 */
export const DEBUG_FILTER_INSTRUCTIONS = {
  description: "Debug filter search issues",
  steps: [
    "Open browser developer tools (F12)",
    "Go to Console tab",
    "Navigate to /media-contacts page",
    "Open country filter dropdown",
    "Type 'Egy' in search field",
    "Monitor console for debug logs with emojis (🔍, 📡, 📊, 🏛️)",
    "Check Network tab for API calls to /api/filters/countries",
    "Verify API response contains Egypt data",
    "Check if data is being set in component state",
    "Take screenshot of console logs and network requests"
  ]
};
