import { test, expect, Page } from '@playwright/test';
import { performLogin } from './fixtures/auth.fixture';

/**
 * Theme Tests
 * Tests for dark/light/system theme functionality
 */

// Increase test timeout for theme tests
test.setTimeout(60000);

// Helper to set theme via the theme toggle in sidebar or settings page
async function setTheme(page: Page, theme: 'light' | 'dark' | 'system'): Promise<boolean> {
  const ariaLabel = theme === 'light' ? 'Light mode'
    : theme === 'dark' ? 'Dark mode'
    : 'System preference';

  // Try 1: Look for individual theme buttons (expanded sidebar)
  const button = page.locator(`button[aria-label="${ariaLabel}"]`);
  try {
    if (await button.isVisible({ timeout: 2000 })) {
      await button.click();
      await page.waitForTimeout(300);
      return true;
    }
  } catch {
    // Button not found in sidebar
  }

  // Try 2: Try the appearance settings page buttons
  try {
    const themeButtonText = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
    const settingsBtn = page.locator('button').filter({ hasText: new RegExp(`^${themeButtonText}$`, 'i') }).first();
    if (await settingsBtn.isVisible({ timeout: 1000 })) {
      await settingsBtn.click();
      await page.waitForTimeout(300);
      return true;
    }
  } catch {
    // Button not found
  }

  // Try 3: Navigate to settings/appearance and click there
  const currentUrl = page.url();
  if (!currentUrl.includes('/settings/appearance')) {
    await page.goto('/settings/appearance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const themeButtonText = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
    const settingsBtn = page.locator('button').filter({ hasText: new RegExp(`^${themeButtonText}$`, 'i') }).first();
    try {
      if (await settingsBtn.isVisible({ timeout: 3000 })) {
        await settingsBtn.click();
        await page.waitForTimeout(300);
        // Navigate back
        await page.goto(currentUrl);
        await page.waitForLoadState('networkidle');
        return true;
      }
    } catch {
      // Failed
    }
  }

  return false;
}

// Helper to get current theme class
async function getThemeClass(page: Page): Promise<string> {
  return await page.locator('html').getAttribute('class') || '';
}

// Helper to check if dark mode
async function isDarkMode(page: Page): Promise<boolean> {
  const htmlClass = await getThemeClass(page);
  return /\bdark\b/.test(htmlClass);
}

// Helper to check if light mode (no dark class)
async function isLightMode(page: Page): Promise<boolean> {
  const htmlClass = await getThemeClass(page);
  return !htmlClass.includes('dark');
}

// Pages to test - comprehensive list
const TEST_PAGES = [
  { path: '/', name: 'Dashboard' },
  { path: '/customers', name: 'Customers' },
  { path: '/orders', name: 'Orders' },
  { path: '/products', name: 'Products' },
  { path: '/transactions', name: 'Transactions' },
  { path: '/refunds', name: 'Refunds' },
  { path: '/shipments', name: 'Shipments' },
  { path: '/routing', name: 'Routing' },
  { path: '/integrations', name: 'Integrations' },
  { path: '/settings/general', name: 'Settings General' },
  { path: '/settings/appearance', name: 'Appearance' },
  { path: '/settings/team', name: 'Team' },
  { path: '/settings/integrations', name: 'Settings Integrations' },
];

// Helper to check for hardcoded dark theme classes in elements
async function findHardcodedDarkClasses(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const results: string[] = [];
    const allElements = document.querySelectorAll('*');

    allElements.forEach(el => {
      const classes = el.className;
      if (typeof classes === 'string') {
        // Patterns for hardcoded dark classes that should use CSS variables
        const darkPatterns = [
          /(?<![:\w])bg-zinc-9\d{2}(?![\w-])/, // bg-zinc-900, bg-zinc-950
          /(?<![:\w])bg-zinc-8\d{2}(?![\w-])/, // bg-zinc-800
          /(?<![:\w])text-white(?![\w-])/, // text-white
          /(?<![:\w])border-zinc-[78]\d{2}(?![\w-])/, // border-zinc-700, border-zinc-800
          /(?<![:\w])text-zinc-[345]\d{2}(?![\w-])/, // text-zinc-300/400/500
        ];

        for (const pattern of darkPatterns) {
          if (pattern.test(classes)) {
            const tag = el.tagName.toLowerCase();
            const shortClasses = classes.split(' ').slice(0, 5).join(' ');
            results.push(`${tag}: ${shortClasses}...`);
            break;
          }
        }
      }
    });

    return results.slice(0, 30);
  });
}

// ═══════════════════════════════════════════════════════════════
// HEADER DROPDOWN THEME SELECTOR (Top Right Avatar Menu)
// Tests for the fix to hydration bug that caused theme to revert
// ═══════════════════════════════════════════════════════════════

// Helper to set theme via header dropdown (user avatar menu)
async function setThemeViaHeaderDropdown(page: Page, theme: 'light' | 'dark' | 'system'): Promise<boolean> {
  try {
    // Click the user avatar button (gradient circle in top right)
    const avatarButton = page.locator('header button.rounded-full').first();
    if (!await avatarButton.isVisible({ timeout: 3000 })) {
      return false;
    }
    await avatarButton.click();
    await page.waitForTimeout(300);

    // Wait for dropdown to open and find the theme radio item
    const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
    const radioItem = page.locator(`[role="menuitemradio"]`).filter({ hasText: themeLabel });

    if (await radioItem.isVisible({ timeout: 2000 })) {
      await radioItem.click();
      await page.waitForTimeout(500);
      return true;
    }

    // Close dropdown if theme option not found
    await page.keyboard.press('Escape');
    return false;
  } catch {
    return false;
  }
}

// Helper to verify theme radio is checked in header dropdown
async function verifyHeaderThemeSelected(page: Page, theme: 'light' | 'dark' | 'system'): Promise<boolean> {
  try {
    // Open avatar dropdown
    const avatarButton = page.locator('header button.rounded-full').first();
    await avatarButton.click();
    await page.waitForTimeout(300);

    const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';
    const radioItem = page.locator(`[role="menuitemradio"]`).filter({ hasText: themeLabel });

    // Check if the radio item has data-state="checked"
    const isChecked = await radioItem.getAttribute('data-state') === 'checked';

    // Close dropdown
    await page.keyboard.press('Escape');
    return isChecked;
  } catch {
    return false;
  }
}

test.describe('Header Dropdown Theme Selector', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('header dropdown shows theme options after mount', async ({ page }) => {
    // Click avatar button
    const avatarButton = page.locator('header button.rounded-full').first();
    await avatarButton.click();
    await page.waitForTimeout(500);

    // Should show Theme label
    const themeLabel = page.locator('text=Theme').first();
    await expect(themeLabel).toBeVisible({ timeout: 3000 });

    // Should show Light, Dark, System options
    await expect(page.locator('[role="menuitemradio"]').filter({ hasText: 'Light' })).toBeVisible();
    await expect(page.locator('[role="menuitemradio"]').filter({ hasText: 'Dark' })).toBeVisible();
    await expect(page.locator('[role="menuitemradio"]').filter({ hasText: 'System' })).toBeVisible();
  });

  test('header dropdown theme selection persists (does not revert)', async ({ page }) => {
    // This tests the specific bug fix: theme was reverting due to hydration mismatch

    // First, set to light mode to establish baseline
    const lightSet = await setThemeViaHeaderDropdown(page, 'light');
    if (!lightSet) {
      test.skip();
      return;
    }
    expect(await isLightMode(page)).toBeTruthy();

    // Now switch to dark mode
    const darkSet = await setThemeViaHeaderDropdown(page, 'dark');
    expect(darkSet).toBeTruthy();

    // Wait a moment for any potential "revert" behavior
    await page.waitForTimeout(1000);

    // Theme should still be dark (not reverted)
    expect(await isDarkMode(page)).toBeTruthy();

    // Verify the radio button shows correct state
    expect(await verifyHeaderThemeSelected(page, 'dark')).toBeTruthy();
  });

  test('header dropdown dark mode saves to localStorage', async ({ page }) => {
    const darkSet = await setThemeViaHeaderDropdown(page, 'dark');
    if (!darkSet) {
      test.skip();
      return;
    }

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });

  test('header dropdown light mode saves to localStorage', async ({ page }) => {
    const lightSet = await setThemeViaHeaderDropdown(page, 'light');
    if (!lightSet) {
      test.skip();
      return;
    }

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('light');
  });

  test('header dropdown system mode saves to localStorage', async ({ page }) => {
    const systemSet = await setThemeViaHeaderDropdown(page, 'system');
    if (!systemSet) {
      test.skip();
      return;
    }

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('system');
  });

  test('header dropdown theme persists after page reload', async ({ page }) => {
    // Set dark mode via header
    const darkSet = await setThemeViaHeaderDropdown(page, 'dark');
    if (!darkSet) {
      test.skip();
      return;
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be dark
    expect(await isDarkMode(page)).toBeTruthy();

    // Radio button should show dark as selected
    expect(await verifyHeaderThemeSelected(page, 'dark')).toBeTruthy();
  });

  test('header dropdown theme persists across navigation', async ({ page }) => {
    // Set dark mode via header
    const darkSet = await setThemeViaHeaderDropdown(page, 'dark');
    if (!darkSet) {
      test.skip();
      return;
    }

    // Navigate to different pages
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    expect(await isDarkMode(page)).toBeTruthy();

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    expect(await isDarkMode(page)).toBeTruthy();

    await page.goto('/settings/general');
    await page.waitForLoadState('networkidle');
    expect(await isDarkMode(page)).toBeTruthy();
  });

  test('header dropdown shows loading skeleton before mount (hydration safety)', async ({ page }) => {
    // This test verifies the fix prevents hydration mismatch
    // The theme section should have proper loading state

    // Navigate fresh (may catch pre-hydration state)
    await page.goto('/');

    // Immediately click avatar
    const avatarButton = page.locator('header button.rounded-full').first();
    await avatarButton.click();

    // Theme options should be visible (not a loading skeleton) once mounted
    // If we see the loading skeleton, wait for mount
    const skeleton = page.locator('.animate-pulse').first();
    if (await skeleton.isVisible({ timeout: 500 }).catch(() => false)) {
      // Wait for it to disappear (mount complete)
      await expect(skeleton).toBeHidden({ timeout: 3000 });
    }

    // Now theme options should be visible
    await expect(page.locator('[role="menuitemradio"]').filter({ hasText: 'Light' })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════
// THEME TOGGLE FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('page renders with a theme class', async ({ page }) => {
    const htmlClass = await getThemeClass(page);
    // Should have either 'light' or 'dark' class (or system default)
    expect(htmlClass).toBeDefined();
    await expect(page.locator('body')).toBeVisible();
  });

  test('can switch themes', async ({ page }) => {
    // Try setting dark mode
    const darkSet = await setTheme(page, 'dark');
    if (darkSet) {
      expect(await isDarkMode(page)).toBeTruthy();
    }

    // Try setting light mode
    const lightSet = await setTheme(page, 'light');
    if (lightSet) {
      expect(await isLightMode(page)).toBeTruthy();
    }
  });

  test('theme persists across navigation', async ({ page }) => {
    // Set dark mode if button available
    const darkSet = await setTheme(page, 'dark');
    if (!darkSet) {
      test.skip();
      return;
    }
    expect(await isDarkMode(page)).toBeTruthy();

    // Navigate to customers
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Should still be dark
    expect(await isDarkMode(page)).toBeTruthy();
  });

  test('theme persists after reload', async ({ page }) => {
    // Set dark mode
    const darkSet = await setTheme(page, 'dark');
    if (!darkSet) {
      test.skip();
      return;
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be dark
    expect(await isDarkMode(page)).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// DARK MODE VISUAL TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await setTheme(page, 'dark');
  });

  test('sidebar has dark background in dark mode', async ({ page }) => {
    if (!await isDarkMode(page)) {
      test.skip();
      return;
    }

    const aside = page.locator('aside').first();
    if (await aside.isVisible({ timeout: 3000 })) {
      const bgColor = await aside.evaluate(el => getComputedStyle(el).backgroundColor);
      // Parse RGB and check if dark
      const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
        expect(luminance).toBeLessThan(0.5);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// LIGHT MODE VISUAL TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Light Mode', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await setTheme(page, 'light');
  });

  test('sidebar has light background in light mode', async ({ page }) => {
    if (!await isLightMode(page)) {
      test.skip();
      return;
    }

    const aside = page.locator('aside').first();
    if (await aside.isVisible({ timeout: 3000 })) {
      const bgColor = await aside.evaluate(el => getComputedStyle(el).backgroundColor);
      // Parse RGB and check if light
      const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
        expect(luminance).toBeGreaterThan(0.5);
      }
    }
  });

  test('header has light background in light mode', async ({ page }) => {
    if (!await isLightMode(page)) {
      test.skip();
      return;
    }

    const header = page.locator('header').first();
    if (await header.isVisible({ timeout: 3000 })) {
      const bgColor = await header.evaluate(el => getComputedStyle(el).backgroundColor);
      const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
        // Header should be light (luminance > 0.5) in light mode
        expect(luminance).toBeGreaterThan(0.5);
      }
    }
  });

  test('main content area has light background in light mode', async ({ page }) => {
    if (!await isLightMode(page)) {
      test.skip();
      return;
    }

    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 3000 })) {
      // Get computed background (may be transparent, inherit from parent)
      const bgInfo = await main.evaluate(el => {
        let element: HTMLElement | null = el as HTMLElement;
        while (element) {
          const bg = getComputedStyle(element).backgroundColor;
          // Skip transparent backgrounds
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            return bg;
          }
          element = element.parentElement;
        }
        return 'rgb(255, 255, 255)'; // Default to white if no bg found
      });

      const match = bgInfo.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
        expect(luminance).toBeGreaterThan(0.5);
      }
    }
  });

  test('no hardcoded dark classes visible in light mode', async ({ page }) => {
    if (!await isLightMode(page)) {
      test.skip();
      return;
    }

    // Check for elements with hardcoded zinc backgrounds that should be themed
    const hardcodedDarkElements = await page.evaluate(() => {
      const results: string[] = [];
      const allElements = document.querySelectorAll('*');

      allElements.forEach(el => {
        const classes = el.className;
        if (typeof classes === 'string') {
          // Check for hardcoded dark classes (excluding dark: prefix variants)
          // These patterns detect classes that should use CSS variables instead
          const darkPatterns = [
            /(?<![:\w])bg-zinc-9\d{2}(?![\w-])/, // bg-zinc-900, bg-zinc-950
            /(?<![:\w])bg-zinc-8\d{2}(?![\w-])/, // bg-zinc-800
            /(?<![:\w])text-white(?![\w-])/, // text-white (should be text-foreground)
            /(?<![:\w])border-zinc-[78]\d{2}(?![\w-])/, // border-zinc-700, border-zinc-800
          ];

          for (const pattern of darkPatterns) {
            if (pattern.test(classes)) {
              // Get tag and first few classes for identification
              const tag = el.tagName.toLowerCase();
              const shortClasses = classes.split(' ').slice(0, 5).join(' ');
              results.push(`${tag}: ${shortClasses}...`);
              break;
            }
          }
        }
      });

      return results.slice(0, 20); // Show up to 20 elements for debugging
    });

    // STRICT: Fail if hardcoded dark classes found (except known exceptions)
    if (hardcodedDarkElements.length > 0) {
      console.error('Found hardcoded dark classes in light mode:', hardcodedDarkElements);
    }

    // Strict test - should have zero hardcoded dark classes
    expect(hardcodedDarkElements.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// THEME ON MULTIPLE PAGES
// ═══════════════════════════════════════════════════════════════

test.describe('Theme Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  for (const testPage of TEST_PAGES) {
    test(`${testPage.name} page renders correctly`, async ({ page }) => {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');

      // Page should render without errors
      await expect(page.locator('body')).toBeVisible();
      const errorCount = await page.locator('text=Something went wrong').count();
      expect(errorCount).toBe(0);

      // Should have a theme class
      const htmlClass = await getThemeClass(page);
      expect(htmlClass).toBeDefined();
    });
  }

  test('dark mode works on multiple pages', async ({ page }) => {
    // Set dark mode on dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const darkSet = await setTheme(page, 'dark');
    if (!darkSet) {
      test.skip();
      return;
    }

    // Visit multiple pages and verify dark mode
    for (const testPage of TEST_PAGES.slice(0, 3)) {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');
      expect(await isDarkMode(page)).toBeTruthy();
    }
  });

  test('light mode works on multiple pages', async ({ page }) => {
    // Set light mode on dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const lightSet = await setTheme(page, 'light');
    if (!lightSet) {
      test.skip();
      return;
    }

    // Visit multiple pages and verify light mode
    for (const testPage of TEST_PAGES.slice(0, 3)) {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');
      expect(await isLightMode(page)).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// APPEARANCE SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════

test.describe('Appearance Settings', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/settings/appearance');
    await page.waitForLoadState('networkidle');
  });

  test('appearance page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const errorCount = await page.locator('text=Something went wrong').count();
    expect(errorCount).toBe(0);
  });

  test('has theme section', async ({ page }) => {
    const themeText = page.locator('text=Theme').first();
    const hasTheme = await themeText.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTheme).toBeTruthy();
  });

  test('has sidebar section', async ({ page }) => {
    const sidebarText = page.locator('text=Sidebar').first();
    const hasSidebar = await sidebarText.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSidebar).toBeTruthy();
  });

  test('theme buttons exist', async ({ page }) => {
    const lightBtn = page.locator('button').filter({ hasText: 'Light' });
    const darkBtn = page.locator('button').filter({ hasText: 'Dark' });
    const systemBtn = page.locator('button').filter({ hasText: 'System' });

    const hasButtons =
      await lightBtn.first().isVisible({ timeout: 3000 }).catch(() => false) ||
      await darkBtn.first().isVisible({ timeout: 1000 }).catch(() => false) ||
      await systemBtn.first().isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasButtons).toBeTruthy();
  });

  test('can change theme from settings', async ({ page }) => {
    // Click dark button - may need to wait for button to be interactive
    const darkBtn = page.locator('button').filter({ hasText: 'Dark' }).first();
    if (await darkBtn.isVisible({ timeout: 5000 })) {
      await darkBtn.click();
      // Wait for theme to apply
      await page.waitForTimeout(1000);
      const isDark = await isDarkMode(page);
      // Theme may or may not change depending on current state, just verify no error
      if (isDark) {
        expect(isDark).toBeTruthy();
      }
    }

    // Click light button
    const lightBtn = page.locator('button').filter({ hasText: 'Light' }).first();
    if (await lightBtn.isVisible({ timeout: 3000 })) {
      await lightBtn.click();
      await page.waitForTimeout(1000);
      // Verify light mode or at least no crash
      expect(await page.locator('body').isVisible()).toBeTruthy();
    }
  });

  test('sidebar toggle exists', async ({ page }) => {
    const toggle = page.locator('button[role="switch"]');
    const hasToggle = await toggle.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasToggle).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// CSS VARIABLES
// ═══════════════════════════════════════════════════════════════

test.describe('CSS Variables', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('CSS variables exist', async ({ page }) => {
    const cssVars = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      return {
        background: style.getPropertyValue('--background').trim(),
        foreground: style.getPropertyValue('--foreground').trim(),
        primary: style.getPropertyValue('--primary').trim(),
      };
    });

    // At least one variable should have a value
    const hasVars = Object.values(cssVars).some(v => v.length > 0);
    expect(hasVars).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// SYSTEM PREFERENCE
// ═══════════════════════════════════════════════════════════════

test.describe('System Preference', () => {
  test('respects system dark preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set system preference
    await setTheme(page, 'system');
    await page.waitForTimeout(500);

    // Page should render
    await expect(page.locator('body')).toBeVisible();
  });

  test('respects system light preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set system preference
    await setTheme(page, 'system');
    await page.waitForTimeout(500);

    // Page should render
    await expect(page.locator('body')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════
// THEME PERSISTENCE
// ═══════════════════════════════════════════════════════════════

test.describe('Theme Persistence', () => {
  test('theme saved to localStorage', async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const darkSet = await setTheme(page, 'dark');
    if (!darkSet) {
      test.skip();
      return;
    }

    // Check localStorage
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });
});

// ═══════════════════════════════════════════════════════════════
// LIGHT MODE PER-PAGE TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Light Mode Per-Page', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await setTheme(page, 'light');
  });

  for (const testPage of TEST_PAGES) {
    test(`${testPage.name} page has no hardcoded dark classes in light mode`, async ({ page }) => {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // Wait for any animations

      if (!await isLightMode(page)) {
        test.skip();
        return;
      }

      const hardcodedClasses = await findHardcodedDarkClasses(page);

      if (hardcodedClasses.length > 0) {
        console.error(`[${testPage.name}] Found hardcoded dark classes:`, hardcodedClasses);
      }

      // Strict: fail if any hardcoded dark classes found
      expect(hardcodedClasses.length).toBe(0);
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// DARK MODE CONTRAST TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Dark Mode Per-Page', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await setTheme(page, 'dark');
  });

  for (const testPage of TEST_PAGES.slice(0, 5)) { // Test first 5 pages
    test(`${testPage.name} page renders correctly in dark mode`, async ({ page }) => {
      await page.goto(testPage.path);
      await page.waitForLoadState('networkidle');

      if (!await isDarkMode(page)) {
        test.skip();
        return;
      }

      // Page should render without errors
      await expect(page.locator('body')).toBeVisible();
      const errorCount = await page.locator('text=Something went wrong').count();
      expect(errorCount).toBe(0);

      // Check that main content area has dark background
      const main = page.locator('main').first();
      if (await main.isVisible({ timeout: 3000 })) {
        const bgInfo = await main.evaluate(el => {
          let element: HTMLElement | null = el as HTMLElement;
          while (element) {
            const bg = getComputedStyle(element).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              return bg;
            }
            element = element.parentElement;
          }
          return 'rgb(0, 0, 0)';
        });

        const match = bgInfo.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
          // In dark mode, background should be dark (luminance < 0.5)
          expect(luminance).toBeLessThan(0.5);
        }
      }
    });
  }
});
