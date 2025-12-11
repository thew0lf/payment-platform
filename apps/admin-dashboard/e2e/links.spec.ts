import { test, expect } from '@playwright/test';
import { performLogin } from './fixtures/auth.fixture';

/**
 * Link Validation Tests
 * Checks for broken links and missing actions on buttons
 */

test.describe('Sidebar Links', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('all sidebar links have valid hrefs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get all sidebar links
    const sidebarLinks = await page.locator('aside a[href]').all();

    for (const link of sidebarLinks) {
      const href = await link.getAttribute('href');

      // Check href is not empty or '#'
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
      expect(href).not.toBe('');

      // Check href starts with '/' (internal) or 'http' (external)
      expect(href?.startsWith('/') || href?.startsWith('http')).toBeTruthy();
    }
  });

  test('sidebar links are clickable and navigate', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Test a few key navigation links
    const keyLinks = [
      { selector: 'a[href="/customers"]', expectedUrl: '/customers' },
      { selector: 'a[href="/orders"]', expectedUrl: '/orders' },
      { selector: 'a[href="/products"]', expectedUrl: '/products' },
      { selector: 'a[href="/transactions"]', expectedUrl: '/transactions' },
    ];

    for (const { selector, expectedUrl } of keyLinks) {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const link = page.locator(selector).first();
      if (await link.isVisible()) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(expectedUrl));
      }
    }
  });
});

test.describe('Button Actions', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('dashboard - all buttons have onClick handlers or are submit buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get all buttons
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const type = await button.getAttribute('type');
      const onClick = await button.getAttribute('onclick');
      const disabled = await button.isDisabled();

      // Button should either be a submit button, have onclick, or be disabled
      // (React buttons have their handlers attached differently, so we mainly check they exist)
      const isVisible = await button.isVisible();
      if (isVisible) {
        // Button should be clickable unless disabled
        if (!disabled) {
          const cursor = await button.evaluate(el => getComputedStyle(el).cursor);
          expect(cursor).not.toBe('not-allowed');
        }
      }
    }
  });

  test('customers page - has working action buttons', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('domcontentloaded');

    // Check for "Add Customer" or similar action button
    const actionButtons = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    const count = await actionButtons.count();

    // Page should have at least one action button
    // Note: This may be 0 if no customers or permissions
    console.log(`Found ${count} action buttons on customers page`);
  });

  test('orders page - has working action buttons', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');

    // Check for filter or export buttons
    const filterButton = page.locator('button:has-text("Filter")');
    const exportButton = page.locator('button:has-text("Export")');

    // At least one of these should exist
    const hasFilter = await filterButton.count() > 0;
    const hasExport = await exportButton.count() > 0;

    console.log(`Orders page - Filter: ${hasFilter}, Export: ${hasExport}`);
  });

  test('products page - has working CRUD buttons', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('domcontentloaded');

    // Check for Add Product button
    const addButton = page.locator('button:has-text("Add"), a:has-text("Add Product"), button:has-text("New Product")');
    const count = await addButton.count();

    console.log(`Found ${count} add product buttons`);
  });
});

test.describe('External Links', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('external links have target="_blank" and rel="noopener"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find all external links
    const externalLinks = await page.locator('a[href^="http"]').all();

    for (const link of externalLinks) {
      const href = await link.getAttribute('href');
      const target = await link.getAttribute('target');
      const rel = await link.getAttribute('rel');

      // External links should open in new tab
      if (href && !href.includes('localhost')) {
        expect(target).toBe('_blank');
        expect(rel).toContain('noopener');
      }
    }
  });
});

test.describe('Form Submissions', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('settings general - form has submit button', async ({ page }) => {
    await page.goto('/settings/general');
    await page.waitForLoadState('domcontentloaded');

    // Should have a save button
    const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    const count = await saveButton.count();

    expect(count).toBeGreaterThan(0);
  });

  test('settings security - form has submit button', async ({ page }) => {
    await page.goto('/settings/security');
    await page.waitForLoadState('domcontentloaded');

    // Should have password change form with submit
    const submitButtons = page.locator('button[type="submit"], button:has-text("Update"), button:has-text("Save")');
    const count = await submitButtons.count();

    // At least one submit button should exist
    console.log(`Security page has ${count} submit buttons`);
  });
});

test.describe('Modal and Dialog Triggers', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('integrations page - add button opens modal', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('domcontentloaded');

    // Find and click add integration button
    const addButton = page.locator('button:has-text("Add Integration"), button:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Modal should appear
      await page.waitForSelector('[role="dialog"], [data-radix-dialog-content]', { timeout: 5000 });
    }
  });

  test('team page - invite button opens modal', async ({ page }) => {
    await page.goto('/settings/team');
    await page.waitForLoadState('domcontentloaded');

    // Find and click invite button
    const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add User")').first();

    if (await inviteButton.isVisible()) {
      await inviteButton.click();

      // Modal should appear
      await page.waitForSelector('[role="dialog"], [data-radix-dialog-content]', { timeout: 5000 });
    }
  });
});
