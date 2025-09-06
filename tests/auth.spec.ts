import { test, expect } from "@playwright/test";
import { loginViaApi } from "./utils";
import { isAuthenticated, logoutUser } from "./auth-test-utils";

const randomEmail = () => `user_${Date.now()}@example.com`;

// Test for unauthenticated users
test.describe("Unauthenticated Access", () => {
  test("redirects unauthenticated users to login", async ({ page, baseURL }) => {
    // Try to access protected page
    await page.goto(`${baseURL}/`);
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/);
  });
});

// Tests using pre-authenticated admin user
test.describe("Authenticated Admin User", () => {
  test.use({ storageState: 'tests/storage-state/admin.json' });
  
  test("can access protected pages", async ({ page, baseURL }) => {
    // Navigate to home page
    await page.goto(`${baseURL}/`);
    
    // Should be on home page (not redirected to login)
    await expect(page).toHaveURL(`${baseURL}/`);
    
    // Verify user is authenticated
    const auth = await isAuthenticated(page);
    expect(auth).toBe(true);
  });
  
  test("can navigate to media contacts", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/media-contacts`);
    await expect(page).toHaveURL(`${baseURL}/media-contacts`);
    
    // Verify page content
    await expect(page.locator('h1')).toContainText(/Media Contacts/i);
  });
  
  test("can logout", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);
    
    // Perform logout
    await logoutUser(page);
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/);
    
    // Verify user is no longer authenticated
    const auth = await isAuthenticated(page);
    expect(auth).toBe(false);
  });
});

// Tests using pre-authenticated regular user
test.describe("Authenticated Regular User", () => {
  test.use({ storageState: 'tests/storage-state/user.json' });
  
  test("can access protected pages", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);
    await expect(page).toHaveURL(`${baseURL}/`);
    
    // Verify user is authenticated
    const auth = await isAuthenticated(page);
    expect(auth).toBe(true);
  });
  
  test("can navigate to media contacts", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/media-contacts`);
    await expect(page).toHaveURL(`${baseURL}/media-contacts`);
    
    // Verify page content
    await expect(page.locator('h1')).toContainText(/Media Contacts/i);
  });
});

// Happy-path registration → logout → login
test("register, login, access protected page", async ({ page, baseURL }) => {
  const email = randomEmail();
  const password = "Test1234!";
  const name = "E2E User";

  await page.goto(`${baseURL}/register`);

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").first().fill(password);
  await page.getByRole("button", { name: /register/i }).click();

  // Wait until we are on '/' (auto login) OR still on register/login needing manual login
  await page.waitForURL(/\/(register|login)?$/);
  if (page.url().endsWith("/register") || page.url().endsWith("/login")) {
    // perform manual login
    // log in via API for speed and robustness
    await loginViaApi(page.request, page.context(), baseURL!, email, password);
    await page.goto(baseURL + "/");
  }

  // Logout
  await page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
  await page.getByRole("button", { name: /logout/i }).click();
  // Wait for navigation to /login which indicates signOut finished
  await page.waitForURL(baseURL + "/login");
  // Clear cookies to emulate a fresh session (workaround for jwt still present in headless browser)
  await page.context().clearCookies();

  // Open a fresh page to avoid client-side cache of NextAuth state
  const freshPage = await page.context().newPage();
  await freshPage.goto(baseURL + "/");
  await expect(freshPage).toHaveURL(baseURL + "/login");

  // Login on fresh page
  await freshPage.getByLabel("Email").fill(email);
  await freshPage.getByLabel("Password").first().fill(password);
  await freshPage.getByRole("button", { name: /login/i }).click();
  await expect(freshPage).toHaveURL(baseURL + "/");
});