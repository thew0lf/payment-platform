import { test as base, Page } from '@playwright/test';

// Test user credentials (using demo data from database seed)
export const TEST_USER = {
  email: 'admin@avnz.io',
  password: 'demo123',
};

/**
 * Performs login handling both Auth0 SSO and local login flows
 */
export async function performLogin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Check if we need to click through to local login (Auth0 enabled)
  const localLoginButton = page.locator('button:has-text("Sign in with email and password")');
  if (await localLoginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await localLoginButton.click();
    await page.waitForTimeout(500);
  }

  // Now fill in the login form
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();

    // Wait for navigation away from login page
    await page.waitForURL(/^(?!.*login)/, { timeout: 15000 });
  }
}

// Extend base test with authentication
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    await performLogin(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';

// Helper to mock authentication state
export async function setupAuthState(page: Page) {
  // Set auth token in localStorage
  await page.evaluate(() => {
    localStorage.setItem('avnz_token', 'mock-jwt-token-for-testing');
    localStorage.setItem('avnz_user', JSON.stringify({
      id: 'test-user-id',
      email: 'admin@avnz.io',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ORG_ADMIN',
    }));
  });
}
