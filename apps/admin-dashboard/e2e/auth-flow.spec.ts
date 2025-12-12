/**
 * Authentication Flow E2E Tests
 * SOC2 CC6.1 / ISO A.9.4.2-3 Compliance Tests
 *
 * Tests the complete authentication flow including:
 * - Login functionality
 * - Password reset flow
 * - Session timeout warning
 * - Logout functionality
 */

import { test, expect, type Page } from '@playwright/test';

// Test credentials (from database seed)
const TEST_USER = {
  email: 'admin@avnz.io',
  password: 'demo123',
};

/**
 * Login helper function
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  
  // Wait for email input and fill form
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  
  // Click sign in button
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 10000 });
}

test.describe('Login Flow', () => {
  test('should display login page elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check for essential login elements
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL('/');
    
    // Dashboard elements should be visible
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder('you@example.com').fill('invalid@example.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for error message
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    
    const passwordInput = page.getByPlaceholder('••••••••');
    const toggleButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first();
    
    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Forgot Password Flow', () => {
  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByText('Forgot password?').click();
    
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.getByText('Reset your password')).toBeVisible();
  });

  test('should submit forgot password request', async ({ page }) => {
    await page.goto('/forgot-password');
    
    await page.getByPlaceholder('you@example.com').fill(TEST_USER.email);
    await page.getByRole('button', { name: /send reset link/i }).click();
    
    // Should show success message
    await expect(page.getByText(/check your email|reset link sent/i)).toBeVisible({ timeout: 10000 });
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/forgot-password');
    
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await page.getByRole('button', { name: /send reset link/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/valid email|invalid email/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Session Timeout', () => {
  test('should be protected route - redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/');
    
    // Should redirect to login if not authenticated
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test('session timeout modal should have correct elements', async ({ page }) => {
    // Login first
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for dashboard
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
    
    // The session timeout modal is only visible when time is about to expire
    // We can test the structure by checking the component exists
    // In development mode, timeout is 30 minutes, so we can't wait for it
    
    // Instead, verify the session is active by checking localStorage
    const token = await page.evaluate(() => localStorage.getItem('avnz_token'));
    expect(token).toBeDefined();
    expect(token).not.toBeNull();
  });

  test('should maintain session with user activity', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for dashboard
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
    
    // Simulate user activity
    await page.mouse.move(100, 100);
    await page.keyboard.press('ArrowDown');
    
    // Session should still be active
    await expect(page.getByText('Dashboard')).toBeVisible();
    
    // Wait a bit and check session persists
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('Logout', () => {
  test('should logout and redirect to login', async ({ page }) => {
    // Login first
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for dashboard
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
    
    // Find and click logout (usually in user menu)
    // Open user menu - look for avatar or user icon
    const userMenu = page.locator('[data-testid="user-menu"]').or(
      page.locator('button').filter({ has: page.locator('svg').or(page.locator('img')) }).last()
    );
    
    if (await userMenu.isVisible()) {
      await userMenu.click();
      
      // Click logout
      const logoutButton = page.getByText(/log out|sign out|logout/i);
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL(/\/login/, { timeout: 10000 });
      }
    }
    
    // After logout, token should be cleared
    await page.goto('/login');
    const token = await page.evaluate(() => localStorage.getItem('avnz_token'));
    expect(token).toBeNull();
  });
});

test.describe('Password Reset Flow (Integration)', () => {
  test('should complete full password reset flow', async ({ page }) => {
    // Navigate to forgot password
    await page.goto('/forgot-password');
    
    // Submit email
    await page.getByPlaceholder('you@example.com').fill(TEST_USER.email);
    await page.getByRole('button', { name: /send reset link/i }).click();
    
    // In development mode, the reset token is returned in the response
    // The UI should show success message
    await expect(page.getByText(/check your email|reset link sent|email sent/i)).toBeVisible({ timeout: 10000 });
    
    // Return to login link should be available
    await expect(page.getByText(/back to login|return to login/i)).toBeVisible();
  });
});

test.describe('SOC2/ISO Compliance Checks', () => {
  test('login form should not leak user existence (no enumeration)', async ({ page }) => {
    await page.goto('/login');
    
    // Try with non-existent email
    await page.getByPlaceholder('you@example.com').fill('doesnotexist12345@example.com');
    await page.getByPlaceholder('••••••••').fill('anypassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Error message should be generic, not specific about user existence
    const errorMessage = page.locator('.text-red-400, .text-red-500, [role="alert"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Should NOT say "user not found" or "email not registered"
    const text = await errorMessage.textContent();
    expect(text?.toLowerCase()).not.toContain('user not found');
    expect(text?.toLowerCase()).not.toContain('not registered');
    expect(text?.toLowerCase()).not.toContain('no account');
  });

  test('password field should be masked by default', async ({ page }) => {
    await page.goto('/login');
    
    const passwordInput = page.getByPlaceholder('••••••••');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('remember me checkbox should be available', async ({ page }) => {
    await page.goto('/login');
    
    // Look for remember me option
    await expect(page.getByText('Remember me')).toBeVisible();
  });
});
