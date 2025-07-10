import { test, expect } from "@playwright/test";

const randomEmail = () => `user_${Date.now()}@example.com`;

async function registerAndLogin(page, baseURL: string) {
  const email = randomEmail();
  const password = "Test1234!";
  const name = "E2E User";
  await page.goto(`${baseURL}/register`);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").first().fill(password);
  await page.getByRole("button", { name: /register/i }).click();
  // After registration the app may auto-login -> '/'
  // or stay on '/register' and show a success toast then redirect
  await page.waitForURL(/(\/|\/login)$/);
  if ((await page.url()).includes("/login")) {
    // Fill login form
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").first().fill(password);
    await page.getByRole("button", { name: /login/i }).click();
    await page.waitForURL(baseURL + "/");
  }
  return { email, password };
}

test("root is protected after logout", async ({ page, baseURL }) => {
  await registerAndLogin(page, baseURL);

  await page.getByRole("button", { name: /logout/i }).click();
  await page.waitForURL(baseURL + "/login");

  await page.goto(baseURL + "/");
  await expect(page).toHaveURL(baseURL + "/login");
});
