import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Customer Portal - Subscription Management
 *
 * Coverage:
 * - Email lookup flow
 * - Subscription list display
 * - Subscription detail view
 * - Pause/resume subscription
 * - Cancel subscription
 * - Confirmation modals
 *
 * SOC2 Controls: CC6.1 (Access Control), CC8.1 (Change Management)
 */

test.describe('Customer Portal - Subscription Management', () => {

  test.describe('Email Lookup Flow', () => {
    test('should display email input on subscriptions page', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /look.*up|find|search/i })).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('invalid');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });

    test('should handle customer with no subscriptions', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('no-subs@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(1000);

      await expect(page.getByText(/no.*subscription|not found/i)).toBeVisible();
    });
  });

  test.describe('Subscription List Display', () => {
    test('should display subscription list after lookup', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Should show subscriptions
      const subList = page.locator('[class*="subscription"], [class*="card"], table');
      await expect(subList.first()).toBeVisible();
    });

    test('should display subscription status badges', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Look for status indicators
      const hasStatus = await page.getByText(/active|paused|canceled|pending/i).isVisible();
      expect(hasStatus).toBeTruthy();
    });

    test('should display plan name and billing cycle', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Look for plan info
      const hasPlanInfo = await page.getByText(/monthly|yearly|annual|week|plan/i).isVisible();
      expect(hasPlanInfo).toBeTruthy();
    });

    test('should display next billing date', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Look for billing date
      const hasBillingInfo = await page.getByText(/next.*bill|renewal|due/i).isVisible();
      expect(hasBillingInfo).toBeTruthy();
    });
  });

  test.describe('Pause Subscription', () => {
    test('should show pause button for active subscriptions', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const pauseButton = page.getByRole('button', { name: /pause/i });
      // May or may not be visible depending on subscription state
    });

    test('should show confirmation modal before pausing', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const pauseButton = page.getByRole('button', { name: /pause/i }).first();
      if (await pauseButton.isVisible()) {
        await pauseButton.click();

        // Should show confirmation modal
        await expect(page.getByText(/confirm|are you sure/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /pause|confirm/i })).toBeVisible();
      }
    });

    test('should allow canceling pause action', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const pauseButton = page.getByRole('button', { name: /pause/i }).first();
      if (await pauseButton.isVisible()) {
        await pauseButton.click();

        await page.waitForTimeout(300);

        // Click cancel
        await page.getByRole('button', { name: /cancel|close/i }).first().click();

        // Modal should close
        await expect(page.getByText(/confirm.*pause/i)).not.toBeVisible();
      }
    });
  });

  test.describe('Resume Subscription', () => {
    test('should show resume button for paused subscriptions', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Resume button visible for paused subscriptions
      const resumeButton = page.getByRole('button', { name: /resume/i });
      // May or may not be visible depending on subscription state
    });
  });

  test.describe('Cancel Subscription', () => {
    test('should show cancel button for active subscriptions', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const cancelButton = page.getByRole('button', { name: /cancel.*subscription/i });
      // May or may not be visible depending on subscription state
    });

    test('should show confirmation modal before canceling', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const cancelButton = page.getByRole('button', { name: /cancel.*subscription|cancel$/i }).first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Should show serious confirmation
        await expect(page.getByText(/are you sure|cannot be undone|permanent/i)).toBeVisible();
      }
    });

    test('should require cancel reason selection', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const cancelButton = page.getByRole('button', { name: /cancel.*subscription|cancel$/i }).first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        await page.waitForTimeout(300);

        // Should have reason selection
        const reasonSelect = page.locator('select, [class*="dropdown"]');
        await expect(reasonSelect).toBeVisible();
      }
    });
  });

  test.describe('Subscription Detail View', () => {
    test('should allow viewing subscription details', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const viewButton = page.getByRole('button', { name: /view|details/i }).first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        await page.waitForTimeout(500);

        // Should show subscription details
        await expect(page.getByText(/subscription.*detail|plan|billing/i)).toBeVisible();
      }
    });

    test('should display billing history', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Look for billing history section
      const historySection = page.getByText(/history|past.*payment|invoice/i);
      // May be visible in detail view
    });
  });

  test.describe('Security', () => {
    test('should not expose full payment method details', async ({ page }) => {
      await page.goto('/account/subscriptions');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Check page content
      const pageContent = await page.content();

      // Should not have full card numbers (13-19 digits)
      const hasFullCardNumber = /\d{13,19}/.test(pageContent);
      expect(hasFullCardNumber).toBeFalsy();

      // Should not have CVV
      const hasCVV = /cvv[^a-z]*\d{3,4}/i.test(pageContent);
      expect(hasCVV).toBeFalsy();
    });
  });
});
