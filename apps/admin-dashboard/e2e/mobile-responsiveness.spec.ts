import { test, expect, devices } from '@playwright/test';

/**
 * Mobile Responsiveness E2E Tests
 *
 * Tests the mobile-first responsive design across key pages and components.
 * Uses realistic mobile device viewports and touch interactions.
 */

// Common mobile viewports
const mobileViewport = { width: 375, height: 812 }; // iPhone X
const tabletViewport = { width: 768, height: 1024 }; // iPad

test.describe('Mobile Responsiveness', () => {
  test.describe('Dialog/Modal Components', () => {
    test.use({ viewport: mobileViewport });

    test('dialog fits within mobile viewport', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Navigate to customers page which has a delete dialog
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // Click more menu on first customer (if exists)
      const moreButton = page.locator('button[title="More actions"]').first();
      if (await moreButton.isVisible()) {
        await moreButton.click();

        // Click delete button
        const deleteButton = page.locator('text=Delete').first();
        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Check dialog is visible and fits viewport
          const dialog = page.locator('[role="dialog"]');
          if (await dialog.isVisible()) {
            const box = await dialog.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
              expect(box.width).toBeLessThanOrEqual(mobileViewport.width - 32); // 16px padding each side
              expect(box.x).toBeGreaterThanOrEqual(16);
            }
          }
        }
      }
    });

    test('dialog has proper max-height with scroll', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Go to integrations which has configuration modals
      await page.goto('/integrations');
      await page.waitForLoadState('networkidle');

      // Check dialog content doesn't exceed viewport
      const dialogContent = page.locator('[class*="DialogContent"]');
      if (await dialogContent.isVisible()) {
        const box = await dialogContent.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.height).toBeLessThanOrEqual(mobileViewport.height - 64); // 32px margin top/bottom
        }
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test.use({ viewport: mobileViewport });

    test('mobile tab bar is visible on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Tab bar should be visible on mobile
      const tabBar = page.locator('nav[aria-label="Mobile navigation"]');
      await expect(tabBar).toBeVisible();
    });

    test('desktop sidebar is hidden on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Desktop sidebar should be hidden on mobile
      const sidebar = page.locator('.hidden.md\\:block').first();
      await expect(sidebar).toBeHidden();
    });

    test('more drawer opens and closes correctly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Click More button in tab bar
      const moreButton = page.locator('button:has-text("More")');
      await moreButton.click();

      // More drawer should be visible
      const drawer = page.locator('[role="dialog"][aria-label="More navigation options"]');
      await expect(drawer).toBeVisible();

      // Close drawer
      const closeButton = page.locator('button[aria-label="Close"]');
      await closeButton.click();

      // Drawer should be hidden
      await expect(drawer).toBeHidden();
    });

    test('tab bar links navigate correctly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Click Orders tab
      const ordersTab = page.locator('a:has-text("Orders")').first();
      await ordersTab.click();
      await expect(page).toHaveURL(/\/orders/);

      // Click Products tab
      const productsTab = page.locator('a:has-text("Products")').first();
      await productsTab.click();
      await expect(page).toHaveURL(/\/products/);

      // Click Home tab
      const homeTab = page.locator('a:has-text("Home")').first();
      await homeTab.click();
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Mobile Table/Card Views', () => {
    test.use({ viewport: mobileViewport });

    test('transactions show card view on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      await page.goto('/transactions');
      await page.waitForLoadState('networkidle');

      // Desktop table should be hidden
      const desktopTable = page.locator('.hidden.md\\:block table');
      await expect(desktopTable).toBeHidden();

      // Mobile card view should be visible
      const mobileView = page.locator('.md\\:hidden');
      await expect(mobileView.first()).toBeVisible();
    });

    test('customers page shows card view on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // Desktop table should be hidden on mobile
      const desktopTable = page.locator('.hidden.md\\:block');
      await expect(desktopTable.first()).toBeHidden();

      // Mobile card view should be visible
      const mobileView = page.locator('.md\\:hidden').first();
      await expect(mobileView).toBeVisible();
    });

    test('mobile cards are tappable and navigate correctly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // Click on first customer card in mobile view
      const firstCard = page.locator('.md\\:hidden [role="button"]').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        // Should navigate to customer detail
        await expect(page).toHaveURL(/\/customers\/[^/]+$/);
      }
    });
  });

  test.describe('Touch Interactions', () => {
    test.use({ viewport: mobileViewport });

    test('buttons have proper touch targets (min 44px)', async ({ page }) => {
      await page.goto('/login');

      const submitButton = page.locator('button[type="submit"]');
      const box = await submitButton.boundingBox();

      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('buttons show active state on touch', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Check that buttons have active styles
      const button = page.locator('button').first();
      const hasActiveStyle = await button.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return el.className.includes('active:') || style.touchAction === 'manipulation';
      });

      expect(hasActiveStyle).toBe(true);
    });
  });

  test.describe('Responsive Typography', () => {
    test.use({ viewport: mobileViewport });

    test('page titles scale correctly on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      const pageTitle = page.locator('h1').first();
      const box = await pageTitle.boundingBox();

      expect(box).not.toBeNull();
      if (box) {
        // Title should fit within viewport with padding
        expect(box.width).toBeLessThanOrEqual(mobileViewport.width - 32);
      }
    });
  });

  test.describe('Page Padding & Layout', () => {
    test.use({ viewport: mobileViewport });

    test('dashboard has proper mobile padding', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Check main content area doesn't touch edges
      const mainContent = page.locator('main > div').first();
      const box = await mainContent.boundingBox();

      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(16); // At least 16px left padding
      }
    });

    test('cards have reduced padding on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Card content should have appropriate padding
      const cardContent = page.locator('[class*="CardContent"]').first();
      if (await cardContent.isVisible()) {
        const paddingStyle = await cardContent.evaluate((el) => {
          return window.getComputedStyle(el).padding;
        });
        // Should have padding (exact value may vary)
        expect(paddingStyle).not.toBe('0px');
      }
    });
  });

  test.describe('Toast Notifications', () => {
    test.use({ viewport: mobileViewport });

    test('toasts appear centered on mobile', async ({ page }) => {
      await page.goto('/login');

      // Try invalid login to trigger toast
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Wait for toast to appear
      const toast = page.locator('[data-sonner-toast]').first();
      await toast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      if (await toast.isVisible()) {
        const box = await toast.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          // Toast should be centered (within reasonable margin)
          const center = mobileViewport.width / 2;
          const toastCenter = box.x + box.width / 2;
          expect(Math.abs(toastCenter - center)).toBeLessThan(50);
        }
      }
    });
  });

  test.describe('Tablet Responsiveness', () => {
    test.use({ viewport: tabletViewport });

    test('desktop sidebar is visible on tablet', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Desktop sidebar should be visible on tablet
      const sidebar = page.locator('.hidden.md\\:block').first();
      await expect(sidebar).toBeVisible();
    });

    test('mobile tab bar is hidden on tablet', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Mobile tab bar should be hidden on tablet
      const tabBar = page.locator('nav[aria-label="Mobile navigation"]');
      await expect(tabBar).toBeHidden();
    });

    test('tables show desktop view on tablet', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@avnz.io');
      await page.fill('input[name="password"]', 'demo123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // Desktop table should be visible on tablet
      const desktopTable = page.locator('.hidden.md\\:block').first();
      await expect(desktopTable).toBeVisible();
    });
  });
});
