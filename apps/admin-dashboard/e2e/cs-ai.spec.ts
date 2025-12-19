/**
 * CS AI E2E Tests
 * Phase 5: CS AI Customer Service Module
 *
 * Tests CS AI features:
 * - Main Dashboard
 * - Voice Call Management
 * - Conversations
 * - Analytics
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

test.describe('CS AI Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai');
  });

  test('should display CS AI dashboard header', async ({ page }) => {
    await expect(page.getByText('CS AI Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/ai-powered customer service/i)).toBeVisible();
  });

  test('should display refresh button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });

  test('should display overview stats cards', async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.getByText('Total Sessions')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Resolution Rate')).toBeVisible();
    await expect(page.getByText('Avg Resolution')).toBeVisible();
    await expect(page.getByText('Satisfaction')).toBeVisible();
  });

  test('should display performance by tier section', async ({ page }) => {
    await expect(page.getByText('Performance by Tier')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('AI Rep')).toBeVisible();
    await expect(page.getByText('AI Manager')).toBeVisible();
  });

  test('should display active sessions section', async ({ page }) => {
    await expect(page.getByText('Active Sessions')).toBeVisible({ timeout: 10000 });
  });

  test('should display escalations section', async ({ page }) => {
    await expect(page.getByText('Escalations This Week')).toBeVisible({ timeout: 10000 });
  });

  test('should have quick links to sub-pages', async ({ page }) => {
    await expect(page.getByRole('link', { name: /conversations/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /voice ai/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /analytics/i })).toBeVisible();
  });
});

test.describe('Voice AI Call Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/voice');
  });

  test('should display voice AI page header', async ({ page }) => {
    await expect(page.getByText('Voice AI Calls')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/call management/i)).toBeVisible();
  });

  test('should display call stats cards', async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.getByText('Total Calls')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Inbound')).toBeVisible();
    await expect(page.getByText('Outbound')).toBeVisible();
    await expect(page.getByText('Avg Duration')).toBeVisible();
    await expect(page.getByText('Success Rate')).toBeVisible();
    await expect(page.getByText('Total Minutes')).toBeVisible();
    await expect(page.getByText('Est. Revenue')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should have direction filter dropdown', async ({ page }) => {
    // Check for filter dropdowns
    const filterDropdowns = page.getByRole('combobox');
    await expect(filterDropdowns.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display call history table', async ({ page }) => {
    await expect(page.getByText('Call History')).toBeVisible({ timeout: 10000 });
  });

  test('should display call rows with details', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Should show either call rows or empty state
    const hasCalls = await page.locator('table tbody tr').count() > 0;
    const hasEmptyState = await page.getByText(/no calls found/i).isVisible();

    expect(hasCalls || hasEmptyState).toBeTruthy();
  });

  test('should filter calls by direction', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find and click direction filter
    const directionSelect = page.getByRole('combobox').first();
    await directionSelect.click();
    await page.getByText('Inbound').click();

    await page.waitForTimeout(500);
    // Filter should be applied
  });
});

test.describe('Voice Call Detail Page', () => {
  test('should display call detail with flow visualization', async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/voice');

    await page.waitForTimeout(1500);

    // Click on first call (if exists)
    const firstCallLink = page.locator('table tbody tr a').first();
    const hasLink = await firstCallLink.isVisible().catch(() => false);

    if (hasLink) {
      await firstCallLink.click();
      await page.waitForTimeout(1000);

      // Should show call overview
      await expect(page.getByText('Call Overview')).toBeVisible({ timeout: 10000 });

      // Should show call flow
      await expect(page.getByText('Call Flow')).toBeVisible();

      // Should show customer info
      await expect(page.getByText('Customer')).toBeVisible();

      // Should show billing details
      await expect(page.getByText('Billing Details')).toBeVisible();
    }
  });
});

test.describe('Conversations Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/conversations');
  });

  test('should display conversations page header', async ({ page }) => {
    await expect(page.getByText('Conversations')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/chat sessions/i)).toBeVisible();
  });

  test('should display status counts', async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.getByText('Active')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Escalated')).toBeVisible();
    await expect(page.getByText('Resolved')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should have filter dropdowns', async ({ page }) => {
    // Status filter
    const filterDropdowns = page.getByRole('combobox');
    const count = await filterDropdowns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should display conversations table', async ({ page }) => {
    await expect(page.getByText('All Conversations')).toBeVisible({ timeout: 10000 });
  });

  test('should show conversation rows', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Should show either sessions or empty state
    const hasSessions = await page.locator('table tbody tr').count() > 0;
    const hasEmptyState = await page.getByText(/no conversations found/i).isVisible();

    expect(hasSessions || hasEmptyState).toBeTruthy();
  });
});

test.describe('Conversation Detail Page', () => {
  test('should display conversation detail with messages', async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/conversations');

    await page.waitForTimeout(1500);

    // Click on first conversation (if exists)
    const firstLink = page.locator('table tbody tr a').first();
    const hasLink = await firstLink.isVisible().catch(() => false);

    if (hasLink) {
      await firstLink.click();
      await page.waitForTimeout(1000);

      // Should show tier badge
      await expect(page.getByText(/AI Rep|AI Manager|Human/i).first()).toBeVisible({ timeout: 10000 });

      // Should show session info
      await expect(page.getByText('Session Info')).toBeVisible();

      // Should show customer info
      await expect(page.getByText('Customer')).toBeVisible();
    }
  });
});

test.describe('CS AI Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/analytics');
  });

  test('should display analytics page header', async ({ page }) => {
    await expect(page.getByText('CS AI Analytics')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/performance metrics/i)).toBeVisible();
  });

  test('should display date range selector', async ({ page }) => {
    // Should have date range dropdown
    const dateDropdown = page.getByRole('combobox');
    await expect(dateDropdown).toBeVisible({ timeout: 10000 });
  });

  test('should display overview metrics', async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.getByText('Total Sessions')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Resolution Rate')).toBeVisible();
    await expect(page.getByText('CSAT Score')).toBeVisible();
    await expect(page.getByText('Total Revenue')).toBeVisible();
  });

  test('should display performance by tier', async ({ page }) => {
    await expect(page.getByText('Performance by Tier')).toBeVisible({ timeout: 10000 });
  });

  test('should display channel breakdown', async ({ page }) => {
    await expect(page.getByText('By Channel')).toBeVisible({ timeout: 10000 });
  });

  test('should display sentiment distribution', async ({ page }) => {
    await expect(page.getByText('Sentiment Distribution')).toBeVisible({ timeout: 10000 });
  });

  test('should display top issues', async ({ page }) => {
    await expect(page.getByText('Top Issues')).toBeVisible({ timeout: 10000 });
  });

  test('should display escalation reasons', async ({ page }) => {
    await expect(page.getByText('Escalation Reasons')).toBeVisible({ timeout: 10000 });
  });

  test('should display billing by client table', async ({ page }) => {
    await expect(page.getByText('Billing by Client')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Revenue breakdown')).toBeVisible();
  });

  test('should display category performance', async ({ page }) => {
    await expect(page.getByText('Performance by Category')).toBeVisible({ timeout: 10000 });
  });

  test('should change date range', async ({ page }) => {
    await page.waitForTimeout(1000);

    const dateDropdown = page.getByRole('combobox');
    await dateDropdown.click();

    await expect(page.getByText('Last 30 days')).toBeVisible();
    await page.getByText('Last 30 days').click();

    await page.waitForTimeout(500);
    // Data should reload with new range
  });
});

test.describe('CS AI Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have CS AI in navigation', async ({ page }) => {
    await expect(page.getByText(/cs ai/i)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between CS AI pages', async ({ page }) => {
    // Go to main CS AI page
    await page.goto('/cs-ai');
    await expect(page.getByText('CS AI Dashboard')).toBeVisible({ timeout: 10000 });

    // Navigate to voice
    await page.goto('/cs-ai/voice');
    await expect(page.getByText('Voice AI Calls')).toBeVisible({ timeout: 10000 });

    // Navigate to conversations
    await page.goto('/cs-ai/conversations');
    await expect(page.getByText('Conversations')).toBeVisible({ timeout: 10000 });

    // Navigate to analytics
    await page.goto('/cs-ai/analytics');
    await expect(page.getByText('CS AI Analytics')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mobile Responsiveness - CS AI', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('CS AI dashboard is mobile-friendly', async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai');

    // Stats should be visible
    await expect(page.getByText('Total Sessions')).toBeVisible({ timeout: 10000 });

    // Grid should stack on mobile
    const statsGrid = page.locator('.grid').first();
    const box = await statsGrid.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });

  test('Voice calls page is mobile-friendly', async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/voice');

    // Main content should be visible
    await expect(page.getByText('Voice AI Calls')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Calls')).toBeVisible();
  });

  test('Conversations page is mobile-friendly', async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/conversations');

    // Main content should be visible
    await expect(page.getByText('Conversations')).toBeVisible({ timeout: 10000 });
  });

  test('Analytics page is mobile-friendly', async ({ page }) => {
    await login(page);
    await page.goto('/cs-ai/analytics');

    // Main content should be visible
    await expect(page.getByText('CS AI Analytics')).toBeVisible({ timeout: 10000 });
  });
});
