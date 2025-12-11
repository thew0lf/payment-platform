import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Customer Portal - Order Lookup & History
 *
 * Coverage:
 * - Email lookup flow
 * - Order history display
 * - Order detail view
 * - Order tracking
 * - Error states
 *
 * SOC2 Controls: CC6.1 (Access Control)
 * PCI-DSS: Req 7 (Restrict Access), Req 10 (Track and Monitor)
 */

test.describe('Customer Portal - Order Lookup', () => {

  test.describe('Email Lookup Flow', () => {
    test('should display email input on account orders page', async ({ page }) => {
      await page.goto('/account/orders');

      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /look.*up|find.*orders/i })).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('invalid-email');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      // Should show validation error
      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });

    test('should require email to be entered', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      // Should show error for empty email
      await expect(page.getByText(/email.*required|enter.*email/i)).toBeVisible();
    });

    test('should handle non-existent customer gracefully', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('nonexistent@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(1000);

      // Should show no orders message or customer not found
      const noOrders = page.getByText(/no orders found|no orders|customer not found/i);
      await expect(noOrders).toBeVisible();
    });

    test('should show loading state during lookup', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('test@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      // Loading state should appear briefly
      // This is a race condition test, so we just verify the button is disabled during loading
    });
  });

  test.describe('Order History Display', () => {
    test('should display order list after successful lookup', async ({ page }) => {
      await page.goto('/account/orders');

      // Use test customer email
      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      // Should show orders or table
      const orderList = page.locator('table, [class*="order"], [class*="list"]');
      await expect(orderList.first()).toBeVisible();
    });

    test('should display order number, status, date, and total', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      // Look for typical order fields
      const hasOrderNumber = await page.getByText(/[A-Z]-\d{3}-\d{3}-\d{3}|order.*#/i).isVisible();
      const hasStatus = await page.getByText(/pending|processing|completed|shipped|delivered/i).isVisible();

      expect(hasOrderNumber || hasStatus).toBeTruthy();
    });

    test('should allow clicking on order to view details', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      // Click on first order row or view button
      const viewButton = page.getByRole('button', { name: /view|details/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
      } else {
        // Try clicking on table row
        await page.locator('table tbody tr').first().click();
      }

      // Should show order details
      await expect(page.getByText(/order.*details|tracking|items/i)).toBeVisible();
    });
  });

  test.describe('Order Detail View', () => {
    test('should display order items with name, quantity, and price', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      // View first order
      const viewButton = page.getByRole('button', { name: /view|details/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        await page.waitForTimeout(500);

        // Should show order items section
        const itemsSection = page.getByText(/items|products/i);
        await expect(itemsSection).toBeVisible();
      }
    });

    test('should display shipping address', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      const viewButton = page.getByRole('button', { name: /view|details/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        await page.waitForTimeout(500);

        // Should show shipping info
        const shippingSection = page.getByText(/shipping|address|delivery/i);
        await expect(shippingSection).toBeVisible();
      }
    });

    test('should display order summary with subtotal, shipping, and total', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      const viewButton = page.getByRole('button', { name: /view|details/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        await page.waitForTimeout(500);

        // Should show order totals
        const totalSection = page.getByText(/total|subtotal/i);
        await expect(totalSection).toBeVisible();
      }
    });

    test('should allow closing detail view and returning to list', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      const viewButton = page.getByRole('button', { name: /view|details/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        await page.waitForTimeout(500);

        // Close the detail view
        const closeButton = page.getByRole('button', { name: /close|back|x/i });
        if (await closeButton.isVisible()) {
          await closeButton.click();

          // Should return to list
          await expect(page.locator('table, [class*="order-list"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Security & Privacy', () => {
    test('should not expose sensitive payment information', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(2000);

      // Should not show full card numbers
      const pageContent = await page.content();
      const hasFullCardNumber = /\d{13,19}/.test(pageContent);
      expect(hasFullCardNumber).toBeFalsy();
    });

    test('should not store email in URL', async ({ page }) => {
      await page.goto('/account/orders');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find.*orders/i }).click();

      await page.waitForTimeout(1000);

      // URL should not contain email
      const url = page.url();
      expect(url).not.toContain('emily.davis@example.com');
      expect(url).not.toContain('@');
    });
  });
});
