/**
 * Vendor System E2E Tests
 * Phase 3: Vendor System Frontend
 *
 * Tests vendor management functionality:
 * - Vendor Companies page
 * - Vendor Products page
 * - CRUD operations
 * - Filtering and search
 */

import { test, expect, type Page } from '@playwright/test';

// Test users
const TEST_USER = {
  email: 'admin@avnz.io',
  password: 'demo123',
};

/**
 * Login helper function
 */
async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(TEST_USER.email);
  await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 15000 });
}

test.describe('Vendor Companies Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/vendors/companies');
  });

  test('should display vendor companies page with header', async ({ page }) => {
    // Check page title
    await expect(page.getByText('Vendor Companies')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/manage business units/i)).toBeVisible();

    // Check add button exists
    await expect(page.getByRole('button', { name: /add company/i })).toBeVisible();
  });

  test('should display search and filter controls', async ({ page }) => {
    // Check search input
    await expect(page.getByPlaceholder(/search companies/i)).toBeVisible();

    // Check filter dropdowns
    await expect(page.getByRole('combobox')).toHaveCount(2); // Vendor filter and Status filter
  });

  test('should filter by vendor', async ({ page }) => {
    // Click vendor filter
    const vendorFilter = page.getByRole('combobox').first();
    await vendorFilter.click();

    // Should show "All Vendors" option
    await expect(page.getByText('All Vendors')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    // Find status filter (second dropdown)
    const statusFilter = page.getByRole('combobox').nth(1);
    await statusFilter.click();

    // Should show status options
    await expect(page.getByText('All Status')).toBeVisible();
    await expect(page.getByRole('option', { name: 'Active' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Inactive' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Suspended' })).toBeVisible();
  });

  test('should open create modal when clicking Add Company', async ({ page }) => {
    await page.getByRole('button', { name: /add company/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add Vendor Company')).toBeVisible();

    // Form fields should be present
    await expect(page.getByText('Vendor *')).toBeVisible();
    await expect(page.getByText('Company Name *')).toBeVisible();
    await expect(page.getByText('Domain')).toBeVisible();
    await expect(page.getByText('Timezone')).toBeVisible();
    await expect(page.getByText('Currency')).toBeVisible();
  });

  test('should validate required fields in create modal', async ({ page }) => {
    await page.getByRole('button', { name: /add company/i }).click();

    // Try to create without filling required fields
    await page.getByRole('button', { name: /create company/i }).click();

    // Should show validation error (toast)
    await expect(page.getByText(/please fill in required fields/i)).toBeVisible({ timeout: 5000 });
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /add company/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should show empty state when no companies match filter', async ({ page }) => {
    // Search for something unlikely to exist
    await page.getByPlaceholder(/search companies/i).fill('zzzznonexistent123');

    // Wait for search debounce
    await page.waitForTimeout(500);

    // Should show empty state or "no companies found"
    await expect(page.getByText(/no vendor companies found/i).or(page.getByText(/try adjusting/i))).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Vendor Products Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/vendors/products');
  });

  test('should display vendor products page with header', async ({ page }) => {
    // Check page title
    await expect(page.getByText('Vendor Products')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/manage products from vendor/i)).toBeVisible();

    // Check add button exists
    await expect(page.getByRole('button', { name: /add product/i })).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    // Should show stats cards
    await expect(page.getByText('Total Products')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Low Stock')).toBeVisible();
    await expect(page.getByText('Out of Stock')).toBeVisible();
  });

  test('should display search and filter controls', async ({ page }) => {
    // Check search input
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible();

    // Check filter dropdowns (Company and Stock status)
    await expect(page.getByRole('combobox')).toHaveCount(2);
  });

  test('should filter by stock status', async ({ page }) => {
    // Find stock filter (second dropdown)
    const stockFilter = page.getByRole('combobox').nth(1);
    await stockFilter.click();

    // Should show stock options
    await expect(page.getByText('All Stock')).toBeVisible();
    await expect(page.getByRole('option', { name: 'Low Stock' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Out of Stock' })).toBeVisible();
  });

  test('should open create modal when clicking Add Product', async ({ page }) => {
    await page.getByRole('button', { name: /add product/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add Vendor Product')).toBeVisible();

    // Form fields should be present
    await expect(page.getByText('Vendor Company *')).toBeVisible();
    await expect(page.getByText('SKU *')).toBeVisible();
    await expect(page.getByText('Product Name *')).toBeVisible();
    await expect(page.getByText('Wholesale Price *')).toBeVisible();
    await expect(page.getByText('Retail Price *')).toBeVisible();
  });

  test('should validate required fields in create product modal', async ({ page }) => {
    await page.getByRole('button', { name: /add product/i }).click();

    // Try to create without filling required fields
    await page.getByRole('button', { name: /create product/i }).click();

    // Should show validation error (toast)
    await expect(page.getByText(/please fill in required fields/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display product table with columns', async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(1000);

    // Check if table exists (may show empty state instead)
    const table = page.locator('table');
    const emptyState = page.getByText(/no products found/i);

    const hasTable = await table.isVisible();
    const hasEmptyState = await emptyState.isVisible();

    expect(hasTable || hasEmptyState).toBeTruthy();

    if (hasTable) {
      // Check table headers
      await expect(page.getByRole('columnheader', { name: 'Product' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'SKU' })).toBeVisible();
    }
  });
});

test.describe('Vendor Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to vendors section from sidebar', async ({ page }) => {
    // Find and click Vendors in navigation
    await page.getByRole('link', { name: /vendors/i }).first().click();

    // Should be on vendors page
    await expect(page).toHaveURL(/\/vendors/);
  });

  test('should have vendor sub-navigation items', async ({ page }) => {
    await page.goto('/vendors');

    // Check for navigation links to sub-pages
    const companiesLink = page.getByRole('link', { name: /companies/i });
    const productsLink = page.getByRole('link', { name: /products/i });

    // At least one of these should be visible (in sidebar or page)
    await expect(companiesLink.or(productsLink)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Vendor Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/vendors');
  });

  test('should display vendors list', async ({ page }) => {
    await expect(page.getByText(/vendors/i).first()).toBeVisible({ timeout: 10000 });
  });
});
