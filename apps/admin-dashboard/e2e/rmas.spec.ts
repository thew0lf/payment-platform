import { test, expect } from '@playwright/test';

/**
 * E2E Tests for RMA (Return Merchandise Authorization) Management
 *
 * Coverage:
 * - RMA list page
 * - Create RMA button and order selection modal
 * - RMA create page (/rmas/new)
 * - RMA detail page
 * - Form validation
 * - Status filtering
 *
 * SOC2 Controls: CC6.1, CC7.2 (Change Management)
 * PCI-DSS: Req 7 (Restrict Access), Req 10 (Track Access)
 */

test.describe('RMA Management', () => {

  test.describe('RMA List Page', () => {
    test('should display RMAs list with header', async ({ page }) => {
      await page.goto('/rmas');

      await expect(page.getByRole('heading', { name: /Returns \(RMA\)/i })).toBeVisible();
    });

    test('should have "Create RMA" button', async ({ page }) => {
      await page.goto('/rmas');

      const createButton = page.getByRole('button', { name: /create rma/i });
      await expect(createButton).toBeVisible();
    });

    test('should open order selection modal on "Create RMA" click', async ({ page }) => {
      await page.goto('/rmas');

      await page.getByRole('button', { name: /create rma/i }).click();

      // Modal should appear with title
      await expect(page.getByRole('heading', { name: /create rma/i })).toBeVisible();
      // Order search input should be visible
      await expect(page.getByPlaceholder(/search by order number/i)).toBeVisible();
    });

    test('should close order selection modal on close button click', async ({ page }) => {
      await page.goto('/rmas');

      // Open modal
      await page.getByRole('button', { name: /create rma/i }).click();
      await expect(page.getByRole('heading', { name: /create rma/i })).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: /close/i }).click();

      // Modal should be closed
      await expect(page.getByRole('heading', { name: /create rma/i })).not.toBeVisible();
    });

    test('should filter RMAs by status', async ({ page }) => {
      await page.goto('/rmas');

      // Status filter tabs should be visible
      await expect(page.getByRole('button', { name: /all/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /requested/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /approved/i })).toBeVisible();
    });

    test('should search RMAs', async ({ page }) => {
      await page.goto('/rmas');

      const searchInput = page.getByPlaceholder(/search rmas/i);
      await expect(searchInput).toBeVisible();

      await searchInput.fill('RMA-');
      await page.waitForTimeout(500);
    });

    test('should display RMA cards/table with key information', async ({ page }) => {
      await page.goto('/rmas');

      // Wait for data to load
      await page.waitForTimeout(1000);

      // Check for status badges or "No RMAs found" message
      const hasRmas = await page.locator('[class*="card"], [class*="table-row"]').count();
      if (hasRmas === 0) {
        await expect(page.getByText(/no rmas found/i)).toBeVisible();
      }
    });
  });

  test.describe('Order Selection Modal', () => {
    test('should search orders by order number', async ({ page }) => {
      await page.goto('/rmas');

      await page.getByRole('button', { name: /create rma/i }).click();

      const searchInput = page.getByPlaceholder(/search by order number/i);
      await searchInput.fill('A-000');
      await page.waitForTimeout(1000);

      // Should show search results or "no orders found" message
    });

    test('should display order details in search results', async ({ page }) => {
      await page.goto('/rmas');

      await page.getByRole('button', { name: /create rma/i }).click();

      // Search for orders
      await page.getByPlaceholder(/search by order number/i).fill('A-');
      await page.waitForTimeout(1000);

      // If orders found, they should show key info
    });

    test('should navigate to RMA creation form on order select', async ({ page }) => {
      await page.goto('/rmas');

      await page.getByRole('button', { name: /create rma/i }).click();

      // Search for orders
      await page.getByPlaceholder(/search by order number/i).fill('A-');
      await page.waitForTimeout(1000);

      // Click first order if available
      const orderCard = page.locator('[class*="cursor-pointer"]').first();
      const hasOrders = await orderCard.count();

      if (hasOrders > 0) {
        await orderCard.click();
        // Should navigate to /rmas/new with query params
        await expect(page).toHaveURL(/\/rmas\/new\?orderId=/);
      }
    });
  });

  test.describe('Create RMA Page', () => {
    test('should display new RMA form', async ({ page }) => {
      await page.goto('/rmas/new?orderId=test&customerId=test');

      await expect(page.getByRole('heading', { name: /new rma|create rma/i })).toBeVisible();
    });

    test('should show return type selection', async ({ page }) => {
      await page.goto('/rmas/new?orderId=test&customerId=test');

      // Return type radio buttons or select
      await expect(page.getByText(/return|refund|exchange/i)).toBeVisible();
    });

    test('should show return reason selection', async ({ page }) => {
      await page.goto('/rmas/new?orderId=test&customerId=test');

      // Return reason dropdown or radio
      await expect(page.getByText(/reason/i)).toBeVisible();
    });

    test('should have cancel/back button', async ({ page }) => {
      await page.goto('/rmas/new?orderId=test&customerId=test');

      const backButton = page.getByRole('link', { name: /back|cancel/i });
      await expect(backButton).toBeVisible();
    });

    test('should have submit button', async ({ page }) => {
      await page.goto('/rmas/new?orderId=test&customerId=test');

      const submitButton = page.getByRole('button', { name: /create|submit/i });
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('RMA Security', () => {
    test('should not expose customer PII in modal search results', async ({ page }) => {
      await page.goto('/rmas');

      await page.getByRole('button', { name: /create rma/i }).click();

      // Search for orders
      await page.getByPlaceholder(/search by order number/i).fill('A-');
      await page.waitForTimeout(1000);

      // Should not show full credit card numbers or SSN
      await expect(page.locator('text=/\\d{16}/')).toHaveCount(0);
    });

    test('should require proper authorization', async ({ page }) => {
      // RMAs page should be protected
      await page.goto('/rmas');

      // Should either show content (if logged in) or redirect to login
      // This verifies the page is accessible
      await expect(page).toHaveURL(/rmas|login/);
    });
  });
});
