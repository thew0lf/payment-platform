import { test, expect } from '@playwright/test';
import { performLogin } from './fixtures/auth.fixture';

/**
 * Navigation and Page Load Tests
 * Tests that all main navigation pages load without errors
 */

// All dashboard routes to test
const DASHBOARD_ROUTES = [
  { path: '/', name: 'Dashboard Home' },
  { path: '/customers', name: 'Customers List' },
  { path: '/orders', name: 'Orders List' },
  { path: '/transactions', name: 'Transactions' },
  { path: '/products', name: 'Products' },
  { path: '/products/categories', name: 'Product Categories' },
  { path: '/products/tags', name: 'Product Tags' },
  { path: '/products/collections', name: 'Product Collections' },
  { path: '/shipments', name: 'Shipments' },
  { path: '/refunds', name: 'Refunds' },
  { path: '/funnels', name: 'Funnels' },
  { path: '/funnels/templates', name: 'Funnel Templates' },
  { path: '/leads', name: 'Leads' },
  { path: '/subscriptions', name: 'Subscriptions' },
  { path: '/subscription-plans', name: 'Subscription Plans' },
  { path: '/landing-pages', name: 'Landing Pages' },
  { path: '/routing', name: 'Routing Rules' },
  { path: '/routing/pools', name: 'Account Pools' },
  { path: '/rmas', name: 'RMAs' },
  { path: '/vendors', name: 'Vendors' },
  { path: '/reviews', name: 'Reviews' },
  { path: '/deleted', name: 'Deleted Items' },
  { path: '/features', name: 'Features' },
  { path: '/integrations', name: 'Platform Integrations' },
  { path: '/insights/subscriptions', name: 'Subscription Insights' },
  { path: '/admin/clients', name: 'Admin Clients' },
];

// Settings routes
const SETTINGS_ROUTES = [
  { path: '/settings', name: 'Settings Home' },
  { path: '/settings/general', name: 'General Settings' },
  { path: '/settings/team', name: 'Team Management' },
  { path: '/settings/roles', name: 'Role Management' },
  { path: '/settings/security', name: 'Security Settings' },
  { path: '/settings/integrations', name: 'Client Integrations' },
  { path: '/settings/merchant-accounts', name: 'Merchant Accounts' },
  { path: '/settings/api-keys', name: 'API Keys' },
  { path: '/settings/billing', name: 'Billing' },
  { path: '/settings/billing/plans', name: 'Billing Plans' },
  { path: '/settings/usage', name: 'Usage' },
  { path: '/settings/shipping', name: 'Shipping' },
  { path: '/settings/refunds', name: 'Refund Settings' },
  { path: '/settings/audit-logs', name: 'Audit Logs' },
];

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  for (const route of DASHBOARD_ROUTES) {
    test(`loads ${route.name} page (${route.path})`, async ({ page }) => {
      const response = await page.goto(route.path);

      // Check response status
      expect(response?.status()).toBeLessThan(400);

      // Wait for page to be interactive
      await page.waitForLoadState('domcontentloaded');

      // Check no JavaScript errors in console
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));

      // Check page renders something
      const body = await page.locator('body');
      await expect(body).toBeVisible();

      // Check for error boundaries (React error messages)
      const errorBoundary = await page.locator('text=Something went wrong').count();
      expect(errorBoundary).toBe(0);

      // No console errors should have occurred
      expect(errors).toHaveLength(0);
    });
  }
});

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  for (const route of SETTINGS_ROUTES) {
    test(`loads ${route.name} page (${route.path})`, async ({ page }) => {
      const response = await page.goto(route.path);

      expect(response?.status()).toBeLessThan(400);
      await page.waitForLoadState('domcontentloaded');

      const body = await page.locator('body');
      await expect(body).toBeVisible();

      const errorBoundary = await page.locator('text=Something went wrong').count();
      expect(errorBoundary).toBe(0);
    });
  }
});

test.describe('Public Pages', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Should have email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Should have password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Should have submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });
});
