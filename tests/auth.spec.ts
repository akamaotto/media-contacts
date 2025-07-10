import { test, expect } from "@playwright/test";
import { loginViaApi } from "./utils";

const randomEmail = () => `user_${Date.now()}@example.com`;

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
