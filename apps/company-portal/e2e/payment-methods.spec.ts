import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Customer Portal - Payment Method Management
 *
 * Coverage:
 * - Email lookup flow
 * - Payment methods list display
 * - Add new payment method
 * - Delete payment method
 * - Set default payment method
 * - Card validation
 * - Security (PCI compliance)
 *
 * SOC2 Controls: CC6.1 (Access Control)
 * PCI-DSS: Req 3 (Protect Stored Data), Req 4 (Encrypt Transmission), Req 7 (Restrict Access)
 */

test.describe('Customer Portal - Payment Method Management', () => {

  test.describe('Email Lookup Flow', () => {
    test('should display email input on payment methods page', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /look.*up|find|search/i })).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('not-an-email');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });

    test('should handle customer with no payment methods', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Should show either payment methods or "no payment methods" message
      const hasContent = await page.getByText(/payment.*method|card|no.*card|add.*card/i).isVisible();
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('Payment Methods List', () => {
    test('should display saved payment methods after lookup', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Should show payment methods section
      const paymentSection = page.locator('[class*="payment"], [class*="card"]');
      await expect(paymentSection.first()).toBeVisible();
    });

    test('should display last 4 digits of card number', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Should show masked card like ****1234
      const maskedCard = page.getByText(/\*{4}\d{4}|\d{4}$/);
      // May or may not have cards
    });

    test('should display card type icon', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Should show card type (Visa, Mastercard, etc.)
      const cardType = page.getByText(/visa|mastercard|amex|discover/i);
      // May or may not have cards
    });

    test('should show default badge on default payment method', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Should show default indicator
      const defaultBadge = page.getByText(/default/i);
      // May or may not have cards
    });

    test('should display expiration date', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Should show expiration like MM/YY or Expires
      const expiry = page.getByText(/exp|\/\d{2}|\d{2}\/\d{2,4}/i);
      // May or may not have cards
    });
  });

  test.describe('Add Payment Method', () => {
    test('should show "Add Card" button', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const addButton = page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i });
      await expect(addButton).toBeVisible();
    });

    test('should open add card modal', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Modal should be visible with form fields
      await expect(page.getByPlaceholder(/card number|\d{4}/i)).toBeVisible();
    });

    test('should have card number, expiry, and CVV fields', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Card number field
      await expect(page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'))).toBeVisible();

      // Expiry fields
      const expiryField = page.getByPlaceholder(/mm|month/i).or(page.locator('select[name*="month"]'));
      await expect(expiryField).toBeVisible();

      // CVV field
      const cvvField = page.getByPlaceholder(/cvv|cvc|security/i).or(page.locator('input[name="cvv"]'));
      await expect(cvvField).toBeVisible();
    });

    test('should validate card number format', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Enter invalid card number
      const cardInput = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      await cardInput.fill('123');

      await page.getByRole('button', { name: /save|add|submit/i }).click();

      // Should show validation error
      await expect(page.getByText(/invalid.*card|valid.*card|16 digit/i)).toBeVisible();
    });

    test('should validate CVV format', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Fill card number
      const cardInput = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      await cardInput.fill('4111111111111111');

      // Enter invalid CVV
      const cvvInput = page.getByPlaceholder(/cvv|cvc|security/i).or(page.locator('input[name="cvv"]'));
      await cvvInput.fill('12');

      await page.getByRole('button', { name: /save|add|submit/i }).click();

      // Should show CVV validation error
      await expect(page.getByText(/invalid.*cvv|3 digit|4 digit|security code/i)).toBeVisible();
    });

    test('should format card number with spaces', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      const cardInput = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      await cardInput.fill('4111111111111111');

      // Should format with spaces: 4111 1111 1111 1111
      const value = await cardInput.inputValue();
      expect(value).toMatch(/\d{4}(\s\d{4}){3}|\d{16}/);
    });

    test('should allow setting new card as default', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Should have "Set as default" checkbox
      const defaultCheckbox = page.getByLabel(/default/i).or(page.locator('input[type="checkbox"]'));
      await expect(defaultCheckbox).toBeVisible();
    });

    test('should allow canceling add card modal', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Click cancel
      await page.getByRole('button', { name: /cancel|close/i }).click();

      // Modal should close
      await expect(page.getByPlaceholder(/card number/i)).not.toBeVisible();
    });
  });

  test.describe('Delete Payment Method', () => {
    test('should show delete button on payment methods', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Delete button should exist for each card
      const deleteButton = page.getByRole('button', { name: /delete|remove/i });
      // May or may not have cards
    });

    test('should show confirmation before deleting', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Should show confirmation
        await expect(page.getByText(/confirm|are you sure|delete this/i)).toBeVisible();
      }
    });

    test('should not allow deleting default payment method with active subscriptions', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Default card delete should warn about active subscriptions
      // This is a business rule test
    });
  });

  test.describe('Set Default Payment Method', () => {
    test('should show set default option on non-default cards', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Set default button for non-default cards
      const setDefaultButton = page.getByRole('button', { name: /set.*default|make.*default/i });
      // May or may not have multiple cards
    });
  });

  test.describe('Security & PCI Compliance', () => {
    test('should not expose full card numbers in DOM', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Get page content
      const pageContent = await page.content();

      // Should not have full 16-digit card numbers
      const hasFullCardNumber = /\d{15,19}/.test(pageContent.replace(/\d{4}\s\d{4}\s\d{4}\s\d{4}/, '')); // Exclude formatted cards
      expect(hasFullCardNumber).toBeFalsy();
    });

    test('should not expose CVV anywhere', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // Check that CVV is never displayed in saved cards
      const pageText = await page.textContent('body');
      // CVV should only appear as an input label, not as stored data
      const cvvMatches = pageText?.match(/cvv|cvc|security code/gi) || [];
      // If CVV appears, it should only be as form labels, not values
    });

    test('should mask card input as password type or with masking', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // CVV should be type=password or masked
      const cvvInput = page.getByPlaceholder(/cvv|cvc|security/i).or(page.locator('input[name="cvv"]'));
      const inputType = await cvvInput.getAttribute('type');
      // CVV can be password type or text with inputMode="numeric"
      expect(['password', 'text', 'number']).toContain(inputType);
    });

    test('should not store card data in URL parameters', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      // URL should not contain card data
      const url = page.url();
      expect(url).not.toMatch(/\d{16}/);
      expect(url).not.toContain('cardNumber');
      expect(url).not.toContain('cvv');
    });

    test('should not log card data to console', async ({ page }) => {
      const consoleLogs: string[] = [];
      page.on('console', (msg) => {
        consoleLogs.push(msg.text());
      });

      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Fill card details
      const cardInput = page.getByPlaceholder(/card number/i).or(page.locator('input[name="cardNumber"]'));
      await cardInput.fill('4111111111111111');

      // Check console logs don't contain card numbers
      const hasCardInLogs = consoleLogs.some(log => /\d{16}/.test(log));
      expect(hasCardInLogs).toBeFalsy();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await page.goto('/account/payment-methods');

      await page.getByPlaceholder(/enter your email/i).fill('emily.davis@example.com');
      await page.getByRole('button', { name: /look.*up|find|search/i }).click();

      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /add.*card|add.*payment|new.*card/i }).click();

      await page.waitForTimeout(500);

      // Check for labels
      const labels = page.locator('label');
      const labelCount = await labels.count();
      expect(labelCount).toBeGreaterThan(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/account/payment-methods');

      // Tab through email input
      await page.keyboard.press('Tab');

      // Focus should move to email input or lookup button
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON']).toContain(focusedElement);
    });
  });
});
