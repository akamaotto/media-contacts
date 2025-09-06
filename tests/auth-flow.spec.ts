import { test, expect } from "@playwright/test";
import { loginAsTestUser, logoutUser, isAuthenticated } from "./auth-test-utils";

test.describe("Authentication Flows", () => {
  test("admin user can login and access dashboard", async ({ page }) => {
    // Login as admin
    await loginAsTestUser(page, 'admin');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL("/");
    
    // Check that we have admin access
    const isAdminLinkVisible = await page.locator('a[href="/admin"]').isVisible();
    expect(isAdminLinkVisible).toBe(true);
    
    // Verify authentication status
    const authStatus = await isAuthenticated(page);
    expect(authStatus).toBe(true);
  });
  
  test("regular user can login but has no admin access", async ({ page }) => {
    // Login as regular user
    await loginAsTestUser(page, 'user');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL("/");
    
    // Check that we don't have admin access
    const isAdminLinkVisible = await page.locator('a[href="/admin"]').isVisible();
    expect(isAdminLinkVisible).toBe(false);
    
    // Verify authentication status
    const authStatus = await isAuthenticated(page);
    expect(authStatus).toBe(true);
  });
  
  test("user can logout and loses access", async ({ page }) => {
    // Login first
    await loginAsTestUser(page, 'user');
    await expect(page).toHaveURL("/");
    
    // Verify authenticated
    let authStatus = await isAuthenticated(page);
    expect(authStatus).toBe(true);
    
    // Logout
    await logoutUser(page);
    
    // Verify redirected to login
    await expect(page).toHaveURL(/.*login/);
    
    // Verify no longer authenticated
    authStatus = await isAuthenticated(page);
    expect(authStatus).toBe(false);
  });
  
  test("unauthenticated user cannot access protected routes", async ({ page, baseURL }) => {
    // Try to go directly to protected page
    await page.goto(`${baseURL}/media-contacts`);
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/);
  });
});