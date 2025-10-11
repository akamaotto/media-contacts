import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * AI Search Page Object Model
 * Provides specialized methods for AI Search functionality testing
 */
export class AISearchPage extends BasePage {
  // Page locators
  readonly mediaContactsLink: Locator;
  readonly aiSearchButton: Locator;
  readonly aiSearchModal: Locator;
  readonly searchQueryInput: Locator;
  readonly countrySelector: Locator;
  readonly categorySelector: Locator;
  readonly searchButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;
  readonly searchProgress: Locator;
  readonly progressBar: Locator;
  readonly searchResults: Locator;
  readonly resultsList: Locator;
  readonly contactCheckbox: Locator;
  readonly importSelectedButton: Locator;
  readonly importAllButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page, screenshotsDir?: string) {
    super(page, screenshotsDir);
    
    // Initialize locators with multiple fallback selectors for robustness
    this.mediaContactsLink = page.locator('a:has-text("Media Contacts"), nav a:has-text("Media Contacts"), [data-testid="media-contacts-link"]');
    this.aiSearchButton = page.locator('button:has-text("Find Contacts with AI"), button:has-text("AI Search"), button:has-text("AI"), [data-testid="ai-search-button"]');
    this.aiSearchModal = page.locator('[role="dialog"], .dialog, .modal, [data-testid="ai-search-modal"]');
    this.searchQueryInput = page.locator('input[name*="query"], textarea[name*="query"], label:has-text("Search Query") + input, label:has-text("Search Query") + textarea, [data-testid="search-query-input"]');
    this.countrySelector = page.locator('label:has-text("Countries") + button, div:has(label:text("Countries")) button, [data-testid="country-selector"]');
    this.categorySelector = page.locator('label:has-text("Categories") + button, div:has(label:text("Categories")) button, [data-testid="category-selector"]');
    this.searchButton = page.locator('button:has-text("Search"), button:has-text("Submit"), button:has-text("Find"), button[type="submit"], [data-testid="search-button"]');
    this.cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), [data-testid="cancel-button"]');
    this.closeButton = page.locator('button:has([data-lucide="X"]), button[aria-label*="Close"], button:has-text("Close"), [data-testid="close-button"]');
    this.searchProgress = page.locator('.search-progress, [data-testid="search-progress"], .loading-indicator');
    this.progressBar = page.locator('[role="progressbar"], .progress-bar, [data-testid="progress-bar"]');
    this.searchResults = page.locator('.search-results, [data-testid="search-results"]');
    this.resultsList = page.locator('.results-list, .contact-list, [data-testid="results-list"]');
    this.contactCheckbox = page.locator('.contact-checkbox, input[type="checkbox"], [data-testid="contact-checkbox"]');
    this.importSelectedButton = page.locator('button:has-text("Import Selected"), button:has-text("Import"), [data-testid="import-selected-button"]');
    this.importAllButton = page.locator('button:has-text("Import All"), button:has-text("Import All"), [data-testid="import-all-button"]');
    this.successMessage = page.locator('.success-message, .text-green-600, [data-testid="success-message"]');
    this.errorMessage = page.locator('.error-message, .text-destructive, [role="alert"], [data-testid="error-message"]');
  }

  /**
   * Navigate to Media Contacts page
   */
  async navigateToMediaContacts() {
    await this.measurePerformance('navigate-to-media-contacts', async () => {
      await this.clickWithRetry(this.mediaContactsLink, { waitForNavigation: true });
      await this.waitForPageLoad();
      await this.takeScreenshot('media-contacts-page', 'Media contacts page loaded');
    });

    // Verify we're on the correct page
    await expect(this.page).toHaveURL(/.*\/dashboard\/media-contacts.*/);
    await expect(this.aiSearchButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Open AI Search modal
   */
  async openAISearchModal() {
    await this.measurePerformance('open-ai-search-modal', async () => {
      await this.clickWithRetry(this.aiSearchButton);
      await this.aiSearchModal.isVisible({ timeout: 5000 });
      await this.waitForPageLoad();
    });

    await this.takeScreenshot('ai-search-modal-opened', 'AI Search modal opened');
    
    // Verify modal is properly opened
    await expect(this.searchQueryInput).toBeVisible({ timeout: 3000 });
    await expect(this.countrySelector).toBeVisible({ timeout: 3000 });
    await expect(this.categorySelector).toBeVisible({ timeout: 3000 });
  }

  /**
   * Fill in the search form
   */
  async fillSearchForm(data: {
    query: string;
    countries?: string[];
    categories?: string[];
    description?: string;
  }) {
    await this.measurePerformance('fill-search-form', async () => {
      // Fill search query
      await this.fillFormField(this.searchQueryInput, data.query);
      console.log(`✅ Search query filled: "${data.query}"`);

      // Select countries if provided
      if (data.countries && data.countries.length > 0) {
        await this.selectCountries(data.countries);
      }

      // Select categories if provided
      if (data.categories && data.categories.length > 0) {
        await this.selectCategories(data.categories);
      }

      // Fill description if provided
      if (data.description) {
        const descriptionInput = this.page.locator('textarea[name*="description"], input[name*="description"], [data-testid="description-input"]');
        if (await descriptionInput.isVisible()) {
          await this.fillFormField(descriptionInput, data.description);
          console.log(`✅ Description filled: "${data.description}"`);
        }
      }
    });

    await this.takeScreenshot('search-form-filled', 'AI Search form filled with data');
  }

  /**
   * Select countries from the country selector
   */
  async selectCountries(countries: string[]) {
    await this.clickWithRetry(this.countrySelector);
    
    // Wait for dropdown to open
    await this.page.waitForTimeout(500);
    
    for (const country of countries) {
      const searchInput = this.page.locator('input[placeholder*="Search countries"], input[placeholder*="Search"], [data-testid="country-search-input"]');
      
      if (await searchInput.isVisible()) {
        await searchInput.fill(country);
        await this.page.waitForTimeout(300);
      }
      
      const countryOption = this.page.locator(`div:has-text("${country}"), [data-testid="country-${country.toLowerCase().replace(/\s+/g, '-')}"]`);
      
      if (await countryOption.isVisible()) {
        await countryOption.click();
        console.log(`✅ Country selected: ${country}`);
      } else {
        console.warn(`⚠️  Country not found: ${country}`);
      }
      
      // Clear search for next country
      if (await searchInput.isVisible()) {
        await searchInput.fill('');
        await this.page.waitForTimeout(200);
      }
    }
    
    // Close dropdown by clicking outside
    await this.page.click('body');
    await this.page.waitForTimeout(200);
  }

  /**
   * Select categories from the category selector
   */
  async selectCategories(categories: string[]) {
    await this.clickWithRetry(this.categorySelector);
    
    // Wait for dropdown to open
    await this.page.waitForTimeout(500);
    
    for (const category of categories) {
      const categoryOption = this.page.locator(`div:has-text("${category}"), [data-testid="category-${category.toLowerCase().replace(/\s+/g, '-')}"]`);
      
      if (await categoryOption.isVisible()) {
        await categoryOption.click();
        console.log(`✅ Category selected: ${category}`);
      } else {
        console.warn(`⚠️  Category not found: ${category}`);
      }
    }
    
    // Close dropdown by clicking outside
    await this.page.click('body');
    await this.page.waitForTimeout(200);
  }

  /**
   * Submit the search form
   */
  async submitSearch() {
    await this.measurePerformance('submit-search', async () => {
      await this.takeScreenshot('before-search-submission', 'Form ready for submission');
      
      await this.clickWithRetry(this.searchButton);
      
      // Wait for search to start (loading state)
      await this.waitForLoading('.loading, .animate-spin, [aria-busy="true"]', { state: 'visible', timeout: 3000 });
    });
  }

  /**
   * Wait for search results to appear
   */
  async waitForSearchResults(timeout = 30000) {
    await this.measurePerformance('wait-for-search-results', async () => {
      // Wait for progress to complete
      if (await this.searchProgress.isVisible()) {
        await expect(this.progressBar).toHaveAttribute('aria-valuenow', '100', { timeout });
      }
      
      // Wait for results to appear
      await expect(this.searchResults).toBeVisible({ timeout });
      await this.waitForPageLoad();
    });

    await this.takeScreenshot('search-results-loaded', 'Search results loaded');
  }

  /**
   * Get search results count
   */
  async getSearchResultsCount(): Promise<number> {
    const resultsLocator = this.page.locator('.contact-item, .result-item, [data-testid="contact-item"]');
    return await resultsLocator.count();
  }

  /**
   * Select specific contacts from results
   */
  async selectContacts(indices: number[]) {
    for (const index of indices) {
      const checkbox = this.contactCheckbox.nth(index);
      if (await checkbox.isVisible()) {
        await this.scrollIntoView(checkbox);
        await checkbox.check();
        console.log(`✅ Contact ${index + 1} selected`);
      } else {
        console.warn(`⚠️  Contact ${index + 1} not found or not visible`);
      }
    }
    
    await this.takeScreenshot('contacts-selected', 'Selected contacts in results');
  }

  /**
   * Select all contacts
   */
  async selectAllContacts() {
    const selectAllCheckbox = this.page.locator('input[type="checkbox"][data-testid="select-all"], thead input[type="checkbox"]');
    
    if (await selectAllCheckbox.isVisible()) {
      await this.clickWithRetry(selectAllCheckbox);
      console.log('✅ All contacts selected');
    } else {
      // Fallback: select all visible checkboxes
      const checkboxes = await this.contactCheckbox.count();
      for (let i = 0; i < checkboxes; i++) {
        await this.contactCheckbox.nth(i).check();
      }
      console.log(`✅ Selected ${checkboxes} contacts`);
    }
    
    await this.takeScreenshot('all-contacts-selected', 'All contacts selected');
  }

  /**
   * Import selected contacts
   */
  async importSelectedContacts() {
    await this.measurePerformance('import-selected-contacts', async () => {
      await this.clickWithRetry(this.importSelectedButton);
      
      // Wait for import progress
      await this.waitForLoading('.import-progress, .loading, [aria-busy="true"]', { state: 'visible', timeout: 3000 });
      await this.waitForLoading('.import-progress, .loading, [aria-busy="true"]', { state: 'hidden', timeout: 30000 });
    });

    await this.takeScreenshot('import-completed', 'Import completed');
  }

  /**
   * Import all contacts
   */
  async importAllContacts() {
    await this.measurePerformance('import-all-contacts', async () => {
      await this.clickWithRetry(this.importAllButton);
      
      // Wait for import progress
      await this.waitForLoading('.import-progress, .loading, [aria-busy="true"]', { state: 'visible', timeout: 3000 });
      await this.waitForLoading('.import-progress, .loading, [aria-busy="true"]', { state: 'hidden', timeout: 60000 });
    });

    await this.takeScreenshot('import-all-completed', 'Import all completed');
  }

  /**
   * Verify import success
   */
  async verifyImportSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
    const successText = await this.successMessage.textContent();
    console.log(`✅ Import successful: ${successText}`);
    
    await this.takeScreenshot('import-success', 'Import success message');
    
    // Verify modal might close or show success state
    const isModalOpen = await this.aiSearchModal.isVisible();
    if (!isModalOpen) {
      console.log('✅ Modal closed after successful import');
    }
  }

  /**
   * Close the AI Search modal
   */
  async closeAISearchModal() {
    if (await this.closeButton.isVisible()) {
      await this.clickWithRetry(this.closeButton);
    } else if (await this.cancelButton.isVisible()) {
      await this.clickWithRetry(this.cancelButton);
    } else {
      // Try escape key
      await this.page.keyboard.press('Escape');
    }
    
    // Wait for modal to close
    await this.aiSearchModal.isHidden({ timeout: 3000 }).catch(() => {});
    
    await this.takeScreenshot('modal-closed', 'AI Search modal closed');
  }

  /**
   * Perform complete AI Search workflow
   */
  async performCompleteSearch(data: {
    query: string;
    countries?: string[];
    categories?: string[];
    description?: string;
    selectAll?: boolean;
    contactIndices?: number[];
  }) {
    await this.navigateToMediaContacts();
    await this.openAISearchModal();
    await this.fillSearchForm(data);
    await this.submitSearch();
    await this.waitForSearchResults();
    
    const resultsCount = await this.getSearchResultsCount();
    console.log(`📊 Found ${resultsCount} contacts`);
    
    if (resultsCount > 0) {
      if (data.selectAll) {
        await this.selectAllContacts();
        await this.importAllContacts();
      } else if (data.contactIndices && data.contactIndices.length > 0) {
        await this.selectContacts(data.contactIndices);
        await this.importSelectedContacts();
      } else {
        // Select first few contacts by default
        const contactsToSelect = Math.min(3, resultsCount);
        await this.selectContacts(Array.from({ length: contactsToSelect }, (_, i) => i));
        await this.importSelectedContacts();
      }
      
      await this.verifyImportSuccess();
    } else {
      console.log('⚠️  No results found');
    }
    
    await this.closeAISearchModal();
    
    return {
      resultsCount,
      performanceMetrics: this.getPerformanceMetrics(),
    };
  }

  /**
   * Validate form validation
   */
  async validateFormValidation(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    // Try to submit empty form
    await this.clickWithRetry(this.searchButton);
    await this.page.waitForTimeout(1000);
    
    const errors = await this.captureErrors();
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test search with invalid data
   */
  async testInvalidSearch(invalidData: {
    query?: string;
    countries?: string[];
    categories?: string[];
  }) {
    await this.fillSearchForm(invalidData);
    await this.submitSearch();
    
    // Wait for error state
    await this.page.waitForTimeout(2000);
    
    const errors = await this.captureErrors();
    await this.takeScreenshot('invalid-search-error', 'Error state for invalid search');
    
    return {
      errors,
      hasErrorModal: await this.errorMessage.isVisible(),
    };
  }
}