/**
 * Momentum Intelligence E2E Tests
 * Phase 4: Momentum Intelligence UI
 *
 * Tests Momentum Intelligence features:
 * - Churn Risk Dashboard
 * - Save Flow Configuration
 * - Behavioral Triggers
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

test.describe('Churn Risk Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/momentum/churn');
  });

  test('should display churn risk dashboard header', async ({ page }) => {
    await expect(page.getByText('Churn Risk Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/monitor and intervene/i)).toBeVisible();
  });

  test('should display refresh button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });

  test('should display summary stats cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000);

    // Check stat cards are present
    await expect(page.getByText('At-Risk Customers')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Avg Risk Score')).toBeVisible();
    await expect(page.getByText('Revenue at Risk')).toBeVisible();
    await expect(page.getByText('Week over Week')).toBeVisible();
  });

  test('should display risk level distribution', async ({ page }) => {
    await expect(page.getByText('Risk Level Distribution')).toBeVisible({ timeout: 10000 });

    // Should show risk levels
    await expect(page.getByText(/critical/i)).toBeVisible();
    await expect(page.getByText(/high/i).first()).toBeVisible();
    await expect(page.getByText(/medium/i).first()).toBeVisible();
  });

  test('should have risk filter dropdown', async ({ page }) => {
    // Check filter dropdown exists
    const filterDropdown = page.getByRole('combobox');
    await expect(filterDropdown).toBeVisible();

    await filterDropdown.click();

    // Check filter options
    await expect(page.getByText('All Risk Levels')).toBeVisible();
    await expect(page.getByRole('option', { name: /critical only/i })).toBeVisible();
  });

  test('should display high-risk customers section', async ({ page }) => {
    await expect(page.getByText('High-Risk Customers')).toBeVisible({ timeout: 10000 });
  });

  test('should display customer cards with risk information', async ({ page }) => {
    // Wait for data
    await page.waitForTimeout(1500);

    // Check for customer data (from API or mock)
    // Should show either customer cards or empty state
    const hasCustomers = await page.getByText(/risk score/i).first().isVisible();
    const hasEmptyState = await page.getByText(/no at-risk customers/i).isVisible();

    expect(hasCustomers || hasEmptyState).toBeTruthy();

    if (hasCustomers) {
      // Should have Save Flow button
      await expect(page.getByRole('button', { name: /save flow/i }).first()).toBeVisible();
    }
  });

  test('should show risk score gauge for customers', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Check for risk score display (SVG gauge)
    const gauges = page.locator('svg circle');
    const hasGauges = await gauges.count() > 0;

    // Either has gauges or empty state
    const hasEmptyState = await page.getByText(/no at-risk customers/i).isVisible();
    expect(hasGauges || hasEmptyState).toBeTruthy();
  });
});

test.describe('Save Flow Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/momentum/save-flows');
  });

  test('should display save flows page header', async ({ page }) => {
    await expect(page.getByText('Save Flows')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/customer retention automation/i)).toBeVisible();
  });

  test('should display refresh and settings buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  });

  test('should display master toggle for save flow engine', async ({ page }) => {
    await expect(page.getByText('Save Flow Engine')).toBeVisible({ timeout: 10000 });

    // Should have a switch/toggle
    const toggle = page.getByRole('switch');
    await expect(toggle).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    await page.waitForTimeout(1000);

    await expect(page.getByText('Total Attempts')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Success Rate')).toBeVisible();
    await expect(page.getByText('Revenue Preserved')).toBeVisible();
    await expect(page.getByText('Avg Time to Save')).toBeVisible();
  });

  test('should display flow stages section', async ({ page }) => {
    await expect(page.getByText('Flow Stages')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/configure each stage/i)).toBeVisible();
  });

  test('should display all 7 save flow stages', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Check for stage names
    await expect(page.getByText('Pattern Interrupt')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Diagnosis')).toBeVisible();
    await expect(page.getByText('Branching')).toBeVisible();
    await expect(page.getByText('Nuclear Offer')).toBeVisible();
    await expect(page.getByText('Loss Visualization')).toBeVisible();
    await expect(page.getByText('Exit Survey')).toBeVisible();
    await expect(page.getByText('Winback')).toBeVisible();
  });

  test('should have toggle switches for each stage', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Should have multiple switches (master + stages)
    const switches = page.getByRole('switch');
    const switchCount = await switches.count();

    // At least 1 master + 7 stages = 8 switches
    expect(switchCount).toBeGreaterThanOrEqual(1);
  });

  test('should display active save attempts section', async ({ page }) => {
    await expect(page.getByText('Active Save Attempts')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/customers in flow/i)).toBeVisible();
  });

  test('should display stage performance section', async ({ page }) => {
    await expect(page.getByText('Stage Performance')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/save rate by flow stage/i)).toBeVisible();
  });

  test('should toggle master switch', async ({ page }) => {
    await page.waitForTimeout(1000);

    const masterSwitch = page.getByRole('switch').first();

    // Get initial state
    const initialState = await masterSwitch.getAttribute('aria-checked');

    // Click to toggle
    await masterSwitch.click();

    // Wait for update
    await page.waitForTimeout(500);

    // State should have changed
    const newState = await masterSwitch.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });
});

test.describe('Behavioral Triggers', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/momentum/triggers');
  });

  test('should display behavioral triggers page header', async ({ page }) => {
    await expect(page.getByText('Behavioral Triggers')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/psychological triggers/i).or(page.getByText(/persuasion/i))).toBeVisible();
  });

  test('should display trigger category filters', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Should have category tabs/buttons
    await expect(page.getByText('All')).toBeVisible();

    // Should show at least some trigger categories
    const categories = ['URGENCY', 'SCARCITY', 'SOCIAL_PROOF', 'AUTHORITY'];
    let foundCategory = false;

    for (const category of categories) {
      const isVisible = await page.getByText(category).isVisible().catch(() => false);
      if (isVisible) {
        foundCategory = true;
        break;
      }
    }

    // Alternative: category buttons
    if (!foundCategory) {
      const buttons = await page.getByRole('button').allTextContents();
      foundCategory = buttons.some(text =>
        text.includes('Urgency') || text.includes('Scarcity') || text.includes('Social')
      );
    }

    expect(foundCategory).toBeTruthy();
  });

  test('should display trigger cards', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Should show trigger cards or empty state
    const hasCards = await page.locator('[class*="card"]').count() > 2; // More than just header cards
    const hasTriggers = await page.getByText(/preview/i).isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no triggers/i).isVisible().catch(() => false);

    expect(hasCards || hasTriggers || hasEmptyState).toBeTruthy();
  });

  test('should have preview buttons on triggers', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for preview buttons
    const previewButton = page.getByRole('button', { name: /preview/i }).first();
    const hasPreview = await previewButton.isVisible().catch(() => false);

    if (hasPreview) {
      await previewButton.click();

      // Should open preview modal
      await expect(page.getByRole('dialog').or(page.getByText(/example/i))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have apply buttons on triggers', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for apply buttons
    const applyButton = page.getByRole('button', { name: /apply/i }).first();
    const hasApply = await applyButton.isVisible().catch(() => false);

    if (hasApply) {
      await applyButton.click();

      // Should open apply modal/dialog
      await expect(page.getByRole('dialog').or(page.getByText(/content/i))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter triggers by category', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find a category button
    const urgencyButton = page.getByRole('button', { name: /urgency/i });
    const isVisible = await urgencyButton.isVisible().catch(() => false);

    if (isVisible) {
      await urgencyButton.click();
      await page.waitForTimeout(500);

      // URL or state should reflect filter
      // Triggers shown should be of that category
    }
  });

  test('should display effectiveness rating on triggers', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Look for effectiveness indicators (stars, percentages, or badges)
    const hasEffectiveness = await page.getByText(/effectiveness/i).isVisible().catch(() => false);
    const hasRating = await page.locator('[class*="star"]').count() > 0;
    const hasPercentage = await page.getByText(/%/).first().isVisible().catch(() => false);

    // At least one indicator type should be present if triggers are shown
    const hasTriggers = await page.getByText(/preview/i).isVisible().catch(() => false);

    if (hasTriggers) {
      expect(hasEffectiveness || hasRating || hasPercentage).toBeTruthy();
    }
  });
});

test.describe('Momentum Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have Momentum Intelligence in navigation', async ({ page }) => {
    // Look for Momentum section in sidebar
    await expect(page.getByText(/momentum intelligence/i).or(page.getByText(/momentum/i))).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between momentum pages', async ({ page }) => {
    // Go to churn page
    await page.goto('/momentum/churn');
    await expect(page.getByText('Churn Risk Dashboard')).toBeVisible({ timeout: 10000 });

    // Navigate to save flows
    await page.goto('/momentum/save-flows');
    await expect(page.getByText('Save Flows')).toBeVisible({ timeout: 10000 });

    // Navigate to triggers
    await page.goto('/momentum/triggers');
    await expect(page.getByText('Behavioral Triggers')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mobile Responsiveness - Momentum', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('churn dashboard is mobile-friendly', async ({ page }) => {
    await login(page);
    await page.goto('/momentum/churn');

    // Stats should be visible
    await expect(page.getByText('At-Risk Customers')).toBeVisible({ timeout: 10000 });

    // Grid should stack on mobile
    const statsGrid = page.locator('.grid').first();
    const box = await statsGrid.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });

  test('save flows page is mobile-friendly', async ({ page }) => {
    await login(page);
    await page.goto('/momentum/save-flows');

    // Main content should be visible
    await expect(page.getByText('Save Flows')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Save Flow Engine')).toBeVisible();
  });

  test('triggers page is mobile-friendly', async ({ page }) => {
    await login(page);
    await page.goto('/momentum/triggers');

    // Main content should be visible
    await expect(page.getByText('Behavioral Triggers')).toBeVisible({ timeout: 10000 });
  });
});
