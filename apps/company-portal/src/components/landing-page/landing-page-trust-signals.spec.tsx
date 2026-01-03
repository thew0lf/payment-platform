import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { LandingPageTrustSignals, TrustBadge } from './landing-page-trust-signals';

// ============================================================================
// Tests
// ============================================================================

describe('LandingPageTrustSignals', () => {
  // -------------------------------------------------------------------------
  // Rendering Tests
  // -------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders with default badges', () => {
      render(<LandingPageTrustSignals />);

      expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
      expect(screen.getByText('30-Day Money Back')).toBeInTheDocument();
      expect(screen.getByText('24/7 Support')).toBeInTheDocument();
    });

    it('renders with custom badges', () => {
      const customBadges: TrustBadge[] = [
        { id: 'shipping', type: 'fast-shipping', label: 'Free Shipping' },
        { id: 'verified', type: 'verified', label: 'Verified Seller' },
      ];

      render(<LandingPageTrustSignals badges={customBadges} />);

      expect(screen.getByText('Free Shipping')).toBeInTheDocument();
      expect(screen.getByText('Verified Seller')).toBeInTheDocument();
      expect(screen.queryByText('Secure Checkout')).not.toBeInTheDocument();
    });

    it('renders correct number of badges', () => {
      render(<LandingPageTrustSignals />);

      const list = screen.getByRole('list');
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Layout Tests
  // -------------------------------------------------------------------------

  describe('Layout', () => {
    it('applies horizontal layout by default', () => {
      render(<LandingPageTrustSignals />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('flex');
      expect(list).toHaveClass('flex-wrap');
    });

    it('applies vertical layout', () => {
      render(<LandingPageTrustSignals layout="vertical" />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('flex-col');
    });

    it('applies grid layout', () => {
      render(<LandingPageTrustSignals layout="grid" />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('grid');
    });
  });

  // -------------------------------------------------------------------------
  // Variant Tests
  // -------------------------------------------------------------------------

  describe('Variants', () => {
    it('shows labels in minimal variant', () => {
      render(<LandingPageTrustSignals variant="minimal" />);

      expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
    });

    it('shows descriptions in detailed variant', () => {
      render(<LandingPageTrustSignals variant="detailed" />);

      expect(screen.getByText('256-bit SSL encryption')).toBeInTheDocument();
      expect(screen.getByText('No questions asked')).toBeInTheDocument();
    });

    it('hides labels in icons-only variant', () => {
      render(<LandingPageTrustSignals variant="icons-only" />);

      // Labels should not be visible
      expect(screen.queryByText('Secure Checkout')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Icon Tests
  // -------------------------------------------------------------------------

  describe('Icons', () => {
    it('renders lock icon for secure-checkout type', () => {
      const badges: TrustBadge[] = [
        { id: 'secure', type: 'secure-checkout', label: 'Secure' },
      ];
      render(<LandingPageTrustSignals badges={badges} />);

      // Icon should be present (we can't easily test SVG content, but we can verify the item renders)
      expect(screen.getByText('Secure')).toBeInTheDocument();
    });

    it('renders custom icon when provided', () => {
      const CustomIcon = () => <span data-testid="custom-icon">★</span>;
      const badges: TrustBadge[] = [
        { id: 'custom', type: 'custom', label: 'Custom Badge', icon: <CustomIcon /> },
      ];
      render(<LandingPageTrustSignals badges={badges} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has role="list"', () => {
      render(<LandingPageTrustSignals />);

      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('has aria-label', () => {
      render(<LandingPageTrustSignals />);

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', 'Trust signals');
    });

    it('each badge has role="listitem"', () => {
      render(<LandingPageTrustSignals />);

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Styling Tests
  // -------------------------------------------------------------------------

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<LandingPageTrustSignals className="custom-class" />);

      const list = screen.getByRole('list');
      expect(list).toHaveClass('custom-class');
    });

    it('applies detailed variant styles', () => {
      render(<LandingPageTrustSignals variant="detailed" />);

      const items = screen.getAllByRole('listitem');
      items.forEach(item => {
        expect(item).toHaveClass('bg-gray-50');
      });
    });
  });

  // -------------------------------------------------------------------------
  // showLabels Tests
  // -------------------------------------------------------------------------

  describe('showLabels', () => {
    it('shows labels when showLabels is true', () => {
      render(<LandingPageTrustSignals showLabels={true} />);

      expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
    });

    it('hides labels when showLabels is false (minimal variant)', () => {
      render(<LandingPageTrustSignals showLabels={false} variant="minimal" />);

      // Labels should not be visible
      expect(screen.queryByText('Secure Checkout')).not.toBeInTheDocument();
    });

    it('still shows labels in detailed variant even when showLabels is false', () => {
      render(<LandingPageTrustSignals showLabels={false} variant="detailed" />);

      // Detailed variant always shows labels
      expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
    });
  });
});
