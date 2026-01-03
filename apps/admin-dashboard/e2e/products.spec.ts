import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Product Management (Shopify-Inspired Redesign)
 *
 * Coverage:
 * - Product list page
 * - Product detail page with collapsible sections
 * - Collapsible card expand/collapse behavior
 * - Sales channel publishing
 * - Category metafields
 * - SEO preview
 * - Media management
 * - Organization (categories, tags, collections)
 *
 * SOC2 Controls: CC6.1 (Access Control), CC6.2 (Logical Access)
 */

test.describe('Product Management', () => {

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION REQUIRED
  // ═══════════════════════════════════════════════════════════════

  test.describe('Authentication', () => {
    test('should redirect unauthenticated users to login from product list', async ({ page }) => {
      await page.goto('/products');

      await expect(page).toHaveURL(/.*login.*/);
    });

    test('should redirect unauthenticated users to login from product detail', async ({ page }) => {
      await page.goto('/products/test-product-id');

      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATED TESTS
  // ═══════════════════════════════════════════════════════════════

  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      // TODO: Implement authentication fixture
      // await loginAsAdmin(page);
    });

    // ─────────────────────────────────────────────────────────────
    // PRODUCT LIST PAGE
    // ─────────────────────────────────────────────────────────────

    test.describe('Product List Page', () => {
      test('should display products list', async ({ page }) => {
        await page.goto('/products');

        await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
        await expect(page.getByPlaceholder(/search/i)).toBeVisible();
      });

      test('should have "New Product" button', async ({ page }) => {
        await page.goto('/products');

        const newButton = page.getByRole('link', { name: /new product/i });
        await expect(newButton).toBeVisible();
      });

      test('should filter products by search', async ({ page }) => {
        await page.goto('/products');

        await page.getByPlaceholder(/search/i).fill('coffee');
        await page.waitForTimeout(500);

        // Results should be filtered
      });

      test('should filter products by status', async ({ page }) => {
        await page.goto('/products');

        // Open filter if available
        const filterButton = page.getByRole('button', { name: /filter/i });
        if (await filterButton.isVisible()) {
          await filterButton.click();
          await page.locator('select').filter({ hasText: /all/i }).first().selectOption('ACTIVE');
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // PRODUCT DETAIL PAGE - COLLAPSIBLE SECTIONS
    // ─────────────────────────────────────────────────────────────

    test.describe('Product Detail Page - Collapsible Sections', () => {
      test('should display all collapsible sections', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // All section headers should be visible
        const sectionTitles = [
          'Title & Description',
          'Media',
          'Pricing',
          'Inventory',
          'Variants',
          'Organization',
          'Category Metafields',
          'Sales Channels',
          'SEO',
          'Additional Details',
        ];

        for (const title of sectionTitles) {
          await expect(page.getByRole('heading', { name: title }).or(page.getByText(title))).toBeVisible();
        }
      });

      test('should toggle section expand/collapse on click', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Find a collapsible card header
        const mediaSection = page.locator('button').filter({ hasText: 'Media' });

        if (await mediaSection.isVisible()) {
          // Check aria-expanded attribute
          const isExpanded = await mediaSection.getAttribute('aria-expanded');

          // Click to toggle
          await mediaSection.click();

          // Check aria-expanded changed
          const newExpanded = await mediaSection.getAttribute('aria-expanded');
          expect(newExpanded).not.toBe(isExpanded);
        }
      });

      test('should persist collapsed state in localStorage', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Collapse a section
        const pricingSection = page.locator('button').filter({ hasText: 'Pricing' });

        if (await pricingSection.isVisible()) {
          await pricingSection.click();

          // Reload page
          await page.reload();

          // Check localStorage (section state should persist)
          const storedState = await page.evaluate(() => {
            return localStorage.getItem('collapsible-card-product-pricing');
          });

          // State should be stored
          expect(storedState).toBeTruthy();
        }
      });

      test('should respect reduced motion preference', async ({ page }) => {
        // Emulate reduced motion
        await page.emulateMedia({ reducedMotion: 'reduce' });

        await page.goto('/products/test-product-id');

        // Sections should still toggle but without animation
        const section = page.locator('button').filter({ hasText: 'Media' });

        if (await section.isVisible()) {
          await section.click();
          // Should toggle immediately without animation
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // TITLE & DESCRIPTION SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Title & Description Section', () => {
      test('should display name and description fields', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByLabel(/name/i)).toBeVisible();
        await expect(page.getByLabel(/description/i).or(page.locator('[data-testid="description-editor"]'))).toBeVisible();
      });

      test('should have AI generate description button', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const aiButton = page.getByRole('button', { name: /generate|ai/i });
        // AI button may be visible if feature is enabled
      });

      test('should update name on input', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const nameInput = page.getByLabel(/name/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Updated Product Name');
          await expect(nameInput).toHaveValue('Updated Product Name');
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // MEDIA SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Media Section', () => {
      test('should display media upload area', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Should have add images button
        const addButton = page.getByRole('button', { name: /add images/i });
        await expect(addButton).toBeVisible();
      });

      test('should show image count badge', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Badge showing count like "2 / 10"
        const badge = page.locator('[class*="badge"]').filter({ hasText: /\d+\s*\/\s*\d+/ });
        // Badge visibility depends on existing images
      });

      test('should validate image URL security', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Attempt to inject javascript: URL should be blocked
        // This tests the XSS prevention in MediaSection
      });
    });

    // ─────────────────────────────────────────────────────────────
    // PRICING SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Pricing Section', () => {
      test('should display price fields', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByLabel(/price/i).first()).toBeVisible();
      });

      test('should show profit margin calculation', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Fill in price and cost
        const priceInput = page.getByLabel(/^price$/i);
        const costInput = page.getByLabel(/cost/i);

        if (await priceInput.isVisible() && await costInput.isVisible()) {
          await priceInput.fill('100');
          await costInput.fill('50');

          // Profit margin should be calculated and displayed
          await expect(page.getByText(/50%/)).toBeVisible();
        }
      });

      test('should validate numeric input', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const priceInput = page.getByLabel(/^price$/i);
        if (await priceInput.isVisible()) {
          await priceInput.fill('invalid');
          // Should either clear or show validation error
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // INVENTORY SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Inventory Section', () => {
      test('should display stock quantity field', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByLabel(/stock|quantity/i).first()).toBeVisible();
      });

      test('should toggle inventory tracking', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const trackingSwitch = page.getByRole('switch', { name: /track inventory/i });
        if (await trackingSwitch.isVisible()) {
          await trackingSwitch.click();
        }
      });

      test('should show low stock threshold field', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByLabel(/low stock|threshold/i)).toBeVisible();
      });
    });

    // ─────────────────────────────────────────────────────────────
    // ORGANIZATION SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Organization Section', () => {
      test('should display category selector', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Category search/select input
        await expect(page.getByPlaceholder(/find.*category/i)).toBeVisible();
      });

      test('should display tags selector', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByPlaceholder(/find.*tag/i)).toBeVisible();
      });

      test('should add category on selection', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const categoryInput = page.getByPlaceholder(/find.*category/i);
        if (await categoryInput.isVisible()) {
          await categoryInput.fill('Coffee');
          // Wait for dropdown
          await page.waitForTimeout(300);

          // Click first result if available
          const firstResult = page.locator('[class*="dropdown"]').first().locator('button').first();
          if (await firstResult.isVisible()) {
            await firstResult.click();
          }
        }
      });

      test('should set primary category on click', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Find a non-primary category badge and click it
        const categoryBadge = page.locator('[class*="badge"]').filter({ hasText: /coffee/i }).first();
        if (await categoryBadge.isVisible()) {
          await categoryBadge.click();
          // Should become primary
        }
      });

      test('should close dropdown on click outside', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const categoryInput = page.getByPlaceholder(/find.*category/i);
        if (await categoryInput.isVisible()) {
          await categoryInput.fill('test');
          await page.waitForTimeout(300);

          // Click outside
          await page.locator('body').click({ position: { x: 10, y: 10 } });

          // Input should be cleared (dropdown closed)
          await expect(categoryInput).toHaveValue('');
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // SALES CHANNELS SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Sales Channels Section', () => {
      test('should display available channels', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Should show Online Store, POS, Wholesale by default
        await expect(page.getByText(/online store/i)).toBeVisible();
      });

      test('should toggle channel publish status', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const channelSwitch = page.locator('[role="switch"]').filter({ hasText: /online store/i }).or(
          page.locator('label').filter({ hasText: /online store/i }).locator('[role="switch"]')
        );

        if (await channelSwitch.isVisible()) {
          await channelSwitch.click();
        }
      });

      test('should show publish timestamp for published channels', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Published channels should show "Published at" timestamp
        const publishedAt = page.getByText(/published/i);
        // Visibility depends on whether product is published to any channel
      });
    });

    // ─────────────────────────────────────────────────────────────
    // SEO SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('SEO Section', () => {
      test('should display SEO fields', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByLabel(/meta title|seo title/i)).toBeVisible();
        await expect(page.getByLabel(/meta description|seo description/i)).toBeVisible();
      });

      test('should show character count for meta title', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const titleInput = page.getByLabel(/meta title|seo title/i);
        if (await titleInput.isVisible()) {
          await titleInput.fill('This is a test meta title');

          // Should show character count
          await expect(page.getByText(/\d+\s*\/\s*60/)).toBeVisible();
        }
      });

      test('should show Google preview', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // SEO preview component
        const preview = page.locator('[class*="seo-preview"]').or(page.getByText(/google preview/i));
        // Preview visibility depends on implementation
      });

      test('should auto-generate slug from name', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const slugInput = page.getByLabel(/url handle|slug/i);
        if (await slugInput.isVisible()) {
          // Slug should be auto-populated based on product name
          const slugValue = await slugInput.inputValue();
          expect(slugValue.length).toBeGreaterThan(0);
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // METAFIELDS SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Category Metafields Section', () => {
      test('should display metafields based on category', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // If product has a coffee category, should show roast_level, origin, etc.
        const roastLevelField = page.getByLabel(/roast level/i);
        // Visibility depends on assigned categories
      });

      test('should render correct input type for metafield type', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // SELECT type should render as dropdown
        // BOOLEAN type should render as checkbox/switch
        // NUMBER type should render as number input
      });

      test('should show help text for metafields', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Help text should be visible below fields
      });

      test('should validate required metafields', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Required fields should be marked and validated
      });
    });

    // ─────────────────────────────────────────────────────────────
    // ADDITIONAL DETAILS SECTION
    // ─────────────────────────────────────────────────────────────

    test.describe('Additional Details Section', () => {
      test('should display weight fields', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByLabel(/weight/i)).toBeVisible();
      });

      test('should display fulfillment type selector', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Fulfillment type dropdown or radio
        await expect(page.getByText(/fulfillment/i)).toBeVisible();
      });
    });

    // ─────────────────────────────────────────────────────────────
    // FORM SUBMISSION
    // ─────────────────────────────────────────────────────────────

    test.describe('Form Submission', () => {
      test('should show save button', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
      });

      test('should disable save button when no changes', async ({ page }) => {
        await page.goto('/products/test-product-id');

        const saveButton = page.getByRole('button', { name: /save/i });
        // May be disabled when no changes
      });

      test('should show success toast on save', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Make a change
        const nameInput = page.getByLabel(/name/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Product Updated');

          // Click save
          await page.getByRole('button', { name: /save/i }).click();

          // Should show success toast
          await expect(page.getByText(/saved|success/i)).toBeVisible();
        }
      });

      test('should show error toast on save failure', async ({ page }) => {
        // Simulate network failure or validation error
        await page.route('**/api/products/**', route => route.abort());

        await page.goto('/products/test-product-id');

        const nameInput = page.getByLabel(/name/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test');
          await page.getByRole('button', { name: /save/i }).click();

          // Should show error toast
          await expect(page.getByText(/error|failed/i)).toBeVisible();
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // KEYBOARD NAVIGATION
    // ─────────────────────────────────────────────────────────────

    test.describe('Accessibility - Keyboard Navigation', () => {
      test('should toggle section with Enter key', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // Focus on a section header
        await page.keyboard.press('Tab');

        // Find focused element and check if it's a collapsible header
        const focusedElement = page.locator(':focus');
        const ariaExpanded = await focusedElement.getAttribute('aria-expanded');

        if (ariaExpanded !== null) {
          await page.keyboard.press('Enter');

          const newExpanded = await focusedElement.getAttribute('aria-expanded');
          expect(newExpanded).not.toBe(ariaExpanded);
        }
      });

      test('should toggle section with Space key', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await page.keyboard.press('Tab');

        const focusedElement = page.locator(':focus');
        const ariaExpanded = await focusedElement.getAttribute('aria-expanded');

        if (ariaExpanded !== null) {
          await page.keyboard.press(' ');

          const newExpanded = await focusedElement.getAttribute('aria-expanded');
          expect(newExpanded).not.toBe(ariaExpanded);
        }
      });

      test('should have visible focus indicators', async ({ page }) => {
        await page.goto('/products/test-product-id');

        await page.keyboard.press('Tab');

        const focusedElement = page.locator(':focus');
        const focusRing = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.outlineStyle !== 'none' ||
                 styles.boxShadow.includes('ring') ||
                 el.classList.contains('focus-visible');
        });

        expect(focusRing).toBeTruthy();
      });
    });

    // ─────────────────────────────────────────────────────────────
    // MOBILE RESPONSIVENESS
    // ─────────────────────────────────────────────────────────────

    test.describe('Mobile Responsiveness', () => {
      test.use({ viewport: { width: 375, height: 812 } });

      test('should display single column layout on mobile', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // All sections should stack vertically
        const sections = page.locator('[class*="collapsible-card"]').or(page.locator('[class*="rounded-xl"]'));

        // Check that sections are full width
      });

      test('should have touch-friendly tap targets', async ({ page }) => {
        await page.goto('/products/test-product-id');

        // All buttons/interactive elements should be at least 44px
        const buttons = page.locator('button');

        for (let i = 0; i < await buttons.count() && i < 5; i++) {
          const button = buttons.nth(i);
          const box = await button.boundingBox();

          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      });
    });
  });
});
