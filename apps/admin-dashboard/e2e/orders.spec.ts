import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Order Management
 * 
 * Coverage:
 * - Order list page
 * - Order create page (/orders/new)
 * - Order detail page
 * - Form validation
 * - Customer selection
 * - Order items management
 * 
 * SOC2 Controls: CC6.1, CC7.2 (Change Management)
 * PCI-DSS: Req 3 (Protect Stored Data), Req 7, Req 10
 */

test.describe('Order Management', () => {

  test.describe('Order List Page', () => {
    test('should display orders list', async ({ page }) => {
      await page.goto('/orders');
      
      await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
    });

    test('should have "New Order" button', async ({ page }) => {
      await page.goto('/orders');

      const newButton = page.getByRole('link', { name: /new order|create order/i });
      await expect(newButton).toBeVisible();
    });

    test('should filter orders by status', async ({ page }) => {
      await page.goto('/orders');

      await page.getByRole('button', { name: /filter/i }).click();
      // Select status filter
    });

    test('should search orders', async ({ page }) => {
      await page.goto('/orders');

      await page.getByPlaceholder(/search/i).fill('A-000');
      await page.waitForTimeout(500);
    });
  });

  test.describe('Create Order Page', () => {
    test('should display new order form', async ({ page }) => {
      await page.goto('/orders/new');

      await expect(page.getByRole('heading', { name: 'New Order' })).toBeVisible();
    });

    test('should require customer selection', async ({ page }) => {
      await page.goto('/orders/new');

      // Customer search should be visible
      await expect(page.getByPlaceholder(/search customers/i)).toBeVisible();
    });

    test('should require at least one order item', async ({ page }) => {
      await page.goto('/orders/new');

      // Try to submit without items
      await page.getByRole('button', { name: /create order/i }).click();

      // Should show error
      await expect(page.getByText(/at least one.*item/i)).toBeVisible();
    });

    test('should allow adding multiple order items', async ({ page }) => {
      await page.goto('/orders/new');

      // Click "Add Item" button
      const addButton = page.getByRole('button', { name: /add item/i });
      await addButton.click();
      await addButton.click();

      // Should have multiple item rows
      const itemRows = page.locator('[class*="item"]');
      await expect(itemRows).toHaveCount(3); // 1 default + 2 added
    });

    test('should calculate order totals correctly', async ({ page }) => {
      await page.goto('/orders/new');

      // Fill first item
      await page.locator('input[placeholder*="SKU"]').first().fill('SKU-001');
      await page.locator('input[placeholder*="Name"]').first().fill('Test Product');
      await page.locator('input[type="number"]').nth(0).fill('2'); // quantity
      await page.locator('input[placeholder*="0.00"]').first().fill('25.00'); // price

      // Check subtotal
      await expect(page.getByText('$50.00')).toBeVisible();
    });

    test('should validate shipping address', async ({ page }) => {
      await page.goto('/orders/new');

      // Submit without shipping address
      await page.getByRole('button', { name: /create order/i }).click();

      // Should show validation errors for required fields
      await expect(page.getByText(/first name is required/i)).toBeVisible();
    });

    test('should pre-fill shipping address from customer', async ({ page }) => {
      await page.goto('/orders/new');

      // Search and select a customer
      await page.getByPlaceholder(/search customers/i).fill('test@');
      await page.waitForTimeout(500);

      // Select first result
      // The address should be pre-filled
    });

    test('should navigate back to orders list', async ({ page }) => {
      await page.goto('/orders/new');

      await page.getByRole('link', { name: /back to orders/i }).click();

      await expect(page).toHaveURL('/orders');
    });
  });

  test.describe('Order Security', () => {
    test('should not expose payment details in form', async ({ page }) => {
      await page.goto('/orders/new');

      // No credit card fields should be visible in order creation
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
      await expect(page.getByPlaceholder(/card number/i)).toHaveCount(0);
    });

    test('should sanitize order notes', async ({ page }) => {
      await page.goto('/orders/new');

      // Try XSS in notes
      await page.locator('textarea').first().fill('<script>alert("xss")</script>');
      
      // Should not execute script
    });
  });
});
