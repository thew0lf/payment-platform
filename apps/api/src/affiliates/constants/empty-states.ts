/**
 * Affiliate Program Empty State Copy
 *
 * Fun, friendly, and on-brand messaging for empty affiliate tables.
 * Follows AVNZ brand voice: confident, approachable, encouraging.
 */

export const AFFILIATE_EMPTY_STATES = {
  // Partners list empty state
  partners: {
    icon: 'Users',
    title: 'Your partner squad is ready to grow!',
    description:
      "You haven't added any affiliate partners yet. Once you do, they'll show up here ready to help spread the word about your amazing products.",
    primaryAction: 'Invite Your First Partner',
    primaryActionUrl: '/affiliates/new',
    secondaryText: 'Or share your public application link',
  },

  // Applications pending review
  applications: {
    icon: 'Inbox',
    title: 'No applications waiting in line',
    description:
      "When potential partners apply to join your program, they'll appear here for your review. Share your application link to start building your team!",
    primaryAction: 'View Application Settings',
    primaryActionUrl: '/affiliates/settings',
  },

  // Links list empty state
  links: {
    icon: 'Link',
    title: 'No tracking links yet',
    description:
      "Tracking links are how your partners share your products. They'll create these from their portal, and you can see them all here.",
    tip: 'Pro tip: Help your partners create effective links with our link builder guide.',
  },

  // Clicks empty state
  clicks: {
    icon: 'MousePointer',
    title: 'Waiting for that first click...',
    description:
      "Once your partners start sharing their links, every click will show up here. You'll see exactly where your traffic is coming from.",
    tip: "Clicks are tracked in real-time. Give it a few minutes after a partner shares their first link!",
  },

  // Conversions empty state
  conversions: {
    icon: 'ShoppingBag',
    title: 'Ready to celebrate your first sale!',
    description:
      "When a customer completes a purchase through an affiliate link, it'll appear here. Your first conversion is just around the corner!",
    primaryAction: 'Check Your Funnel Settings',
    tip: 'Make sure your checkout is optimized for conversions.',
  },

  // Payouts empty state
  payouts: {
    icon: 'Wallet',
    title: 'No payouts processed yet',
    description:
      "When your partners earn commissions and reach the payout threshold, their payments will show up here. Everyone's a winner!",
    tip: 'Partners can see their earnings in their portal. Keep them motivated with regular updates!',
  },

  // Creatives empty state
  creatives: {
    icon: 'Image',
    title: 'Your creative arsenal is empty',
    description:
      "Upload banners, social media graphics, and email templates for your partners to use. Great creatives = higher conversions!",
    primaryAction: 'Upload Your First Creative',
    primaryActionUrl: '/affiliates/creatives/upload',
  },

  // Reports empty state (no data for selected period)
  reports: {
    icon: 'BarChart3',
    title: 'Not enough data yet',
    description:
      "We need more activity to generate meaningful reports. Once your partners start driving traffic and sales, you'll see beautiful charts here!",
    tip: 'Try selecting a different date range or check back in a few days.',
  },

  // Partner portal - my links
  portalLinks: {
    icon: 'Link',
    title: 'Create your first tracking link!',
    description:
      "Tracking links help you earn commissions on every sale you refer. Create one for each campaign to track what's working best.",
    primaryAction: 'Create My First Link',
    tip: 'Use different links for different platforms (Instagram, blog, email) to see which converts best.',
  },

  // Partner portal - my earnings
  portalEarnings: {
    icon: 'TrendingUp',
    title: 'Your earnings journey starts here',
    description:
      "Share your affiliate links and watch your commissions roll in! Every sale you refer earns you money. Let's get started!",
    primaryAction: 'Get My Tracking Links',
  },

  // Partner portal - my payouts
  portalPayouts: {
    icon: 'Wallet',
    title: "You're on your way!",
    description:
      "Once you reach the minimum payout threshold, your earned commissions will be processed automatically. Keep sharing those links!",
    tip: 'Current balance: $0.00 | Minimum payout: $50.00',
  },

  // Search results empty
  searchNoResults: {
    icon: 'Search',
    title: 'No matches found',
    description:
      "We couldn't find anything matching your search. Try different keywords or clear your filters.",
    primaryAction: 'Clear Filters',
  },

  // Filtered results empty
  filteredNoResults: {
    icon: 'Filter',
    title: 'No results with these filters',
    description:
      'Try adjusting your filters to see more results. Sometimes less is more!',
    primaryAction: 'Reset Filters',
  },
} as const;

/**
 * Get empty state content by key
 */
export function getEmptyState(
  key: keyof typeof AFFILIATE_EMPTY_STATES,
): (typeof AFFILIATE_EMPTY_STATES)[typeof key] {
  return AFFILIATE_EMPTY_STATES[key];
}

/**
 * Format payout threshold tip with actual values
 */
export function formatPayoutTip(
  currentBalance: number,
  threshold: number,
): string {
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const remaining = Math.max(0, threshold - currentBalance);
  const progress = Math.min(100, (currentBalance / threshold) * 100);

  if (remaining === 0) {
    return "You've reached the payout threshold! Your next payout is being processed.";
  }

  return `Current balance: ${currency.format(currentBalance)} | ${currency.format(remaining)} more to reach ${currency.format(threshold)} threshold (${progress.toFixed(0)}% there!)`;
}
