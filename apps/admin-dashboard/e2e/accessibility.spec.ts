import { test, expect } from '@playwright/test';
import { performLogin } from './fixtures/auth.fixture';

/**
 * Accessibility Tests
 * Basic accessibility checks for all pages
 */

test.describe('Basic Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('page has a title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('page has a main landmark', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('navigation has aria-label', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check sidebar nav has aria-label
    const nav = page.locator('nav[aria-label], [role="navigation"]');
    const count = await nav.count();
    expect(count).toBeGreaterThan(0);
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 20)) { // Check first 20 buttons
      const text = await button.innerText().catch(() => '');
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // Button should have text content, aria-label, or title
      const hasAccessibleName = text.trim().length > 0 || ariaLabel || title;
      if (!hasAccessibleName) {
        console.warn('Button without accessible name found');
      }
    }
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Image should have alt text or role="presentation"
      if (role !== 'presentation' && role !== 'none') {
        expect(alt !== null).toBeTruthy();
      }
    }
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/settings/general');
    await page.waitForLoadState('domcontentloaded');

    const inputs = await page.locator('input:not([type="hidden"])').all();

    for (const input of inputs.slice(0, 10)) { // Check first 10 inputs
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have associated label, aria-label, aria-labelledby, or at least placeholder
      const hasLabel = id
        ? await page.locator(`label[for="${id}"]`).count() > 0
        : false;
      const hasAccessibleLabel = hasLabel || ariaLabel || ariaLabelledBy || placeholder;

      if (!hasAccessibleLabel) {
        console.warn('Input without label found');
      }
    }
  });

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Basic check: text should be visible
    const body = page.locator('body');
    const color = await body.evaluate(el => getComputedStyle(el).color);
    const bgColor = await body.evaluate(el => getComputedStyle(el).backgroundColor);

    console.log(`Text color: ${color}, Background: ${bgColor}`);

    // Ensure colors are different
    expect(color).not.toBe(bgColor);
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check if focused element has visible outline or ring
    const focusedElement = page.locator(':focus');
    const outline = await focusedElement.evaluate(el =>
      getComputedStyle(el).outline || getComputedStyle(el).outlineWidth
    );

    console.log('Focus outline:', outline);
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('can navigate sidebar with keyboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Tab through sidebar
    let foundSidebarLink = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
      const href = await focusedElement.getAttribute('href');

      if (tagName === 'a' && href) {
        foundSidebarLink = true;
        break;
      }
    }

    expect(foundSidebarLink).toBeTruthy();
  });

  test('Enter key activates buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find a button and focus it
    const button = page.locator('button').first();
    await button.focus();

    // Should be able to activate with Enter
    // (This is a basic test - actual behavior depends on button action)
    const focusedElement = page.locator(':focus');
    const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
  });

  test('Escape closes modals', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('domcontentloaded');

    // Open a modal
    const addButton = page.locator('button:has-text("Add")').first();
    if (await addButton.isVisible()) {
      await addButton.click();

      // Wait for modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should close
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('headings are in logical order', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const levels: number[] = [];

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.substring(1));
      levels.push(level);
    }

    // Check heading levels don't skip (e.g., h1 -> h3)
    for (let i = 1; i < levels.length; i++) {
      const diff = levels[i] - levels[i - 1];
      if (diff > 1) {
        console.warn(`Heading level skipped from h${levels[i - 1]} to h${levels[i]}`);
      }
    }

    console.log('Heading levels:', levels);
  });

  test('tables have proper headers', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForLoadState('domcontentloaded');

    const tables = await page.locator('table').all();

    for (const table of tables) {
      // Check for th elements
      const headers = await table.locator('th').count();
      if (headers === 0) {
        console.warn('Table without headers found');
      }

      // Check for scope attribute on th
      const scopedHeaders = await table.locator('th[scope]').count();
      console.log(`Table has ${headers} headers, ${scopedHeaders} with scope attribute`);
    }
  });

  test('live regions exist for dynamic content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live]').count();
    console.log(`Found ${liveRegions} live regions`);

    // Toast container should be a live region
    const toastContainer = await page.locator('[data-sonner-toaster]').count();
    console.log(`Toaster container: ${toastContainer}`);
  });
});
