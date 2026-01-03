import React from 'react';
import { render, screen } from '@testing-library/react';
import { LandingPageFreeShippingBar } from './landing-page-free-shipping-bar';

// ============================================================================
// Mock LandingPageContext
// ============================================================================

const mockContextValue = {
  localCart: [] as Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  cartTotal: 0,
  cartCount: 0,
  openCartDrawer: jest.fn(),
  closeCartDrawer: jest.fn(),
  isCartDrawerOpen: false,
  landingPage: null,
  isLoading: false,
  error: null,
  session: null,
  cart: null,
  initializeLandingPage: jest.fn(),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
  trackEvent: jest.fn(),
};

jest.mock('@/contexts/landing-page-context', () => ({
  useLandingPage: () => mockContextValue,
  LandingPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ============================================================================
// Tests
// ============================================================================

describe('LandingPageFreeShippingBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.cartCount = 0;
    mockContextValue.cartTotal = 0;
  });

  // -------------------------------------------------------------------------
  // Visibility Tests
  // -------------------------------------------------------------------------

  describe('Visibility', () => {
    it('does not render when cart is empty', () => {
      mockContextValue.cartCount = 0;
      render(<LandingPageFreeShippingBar />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders when cart has items', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Progress Tests
  // -------------------------------------------------------------------------

  describe('Progress', () => {
    it('shows remaining amount needed for free shipping', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 30;
      render(<LandingPageFreeShippingBar threshold={50} />);

      expect(screen.getByText("You're $20 away from free shipping!")).toBeInTheDocument();
    });

    it('shows achieved message when threshold is met', () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 60;
      render(<LandingPageFreeShippingBar threshold={50} />);

      expect(screen.getByText('Nice! Free shipping is yours.')).toBeInTheDocument();
    });

    it('shows achieved message when threshold is exactly met', () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 50;
      render(<LandingPageFreeShippingBar threshold={50} />);

      expect(screen.getByText('Nice! Free shipping is yours.')).toBeInTheDocument();
    });

    it('uses custom messages', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 20;
      render(
        <LandingPageFreeShippingBar
          threshold={50}
          belowMessage="Spend {amount} more for free delivery!"
          achievedMessage="Free delivery unlocked!"
        />
      );

      expect(screen.getByText('Spend $30 more for free delivery!')).toBeInTheDocument();
    });

    it('uses custom threshold', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 80;
      render(<LandingPageFreeShippingBar threshold={100} />);

      expect(screen.getByText("You're $20 away from free shipping!")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Progress Bar Tests
  // -------------------------------------------------------------------------

  describe('Progress Bar', () => {
    it('displays progress bar with correct percentage', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar threshold={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    });

    it('shows 0% when cart is at $0', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 0;
      render(<LandingPageFreeShippingBar threshold={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('shows 100% when threshold exceeded', () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 75;
      render(<LandingPageFreeShippingBar threshold={50} />);

      // Progress bar should not show when achieved
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('shows current and target amounts', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar threshold={50} />);

      expect(screen.getByText('$25')).toBeInTheDocument();
      expect(screen.getByText('$50')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Variant Tests
  // -------------------------------------------------------------------------

  describe('Variants', () => {
    it('applies banner variant styles', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar variant="banner" />);

      const bar = screen.getByRole('status');
      expect(bar).toHaveClass('w-full');
    });

    it('applies inline variant styles', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar variant="inline" />);

      const bar = screen.getByRole('status');
      expect(bar).toHaveClass('inline-flex');
    });

    it('applies card variant styles', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar variant="card" />);

      const bar = screen.getByRole('status');
      expect(bar).toHaveClass('rounded-xl');
    });
  });

  // -------------------------------------------------------------------------
  // Styling Tests
  // -------------------------------------------------------------------------

  describe('Styling', () => {
    it('applies green gradient when threshold achieved', () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 60;
      render(<LandingPageFreeShippingBar threshold={50} variant="banner" />);

      const bar = screen.getByRole('status');
      expect(bar).toHaveClass('from-green-500');
    });

    it('applies blue gradient when below threshold', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar threshold={50} variant="banner" />);

      const bar = screen.getByRole('status');
      expect(bar).toHaveClass('from-blue-50');
    });

    it('applies custom className', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar className="custom-class" />);

      const bar = screen.getByRole('status');
      expect(bar).toHaveClass('custom-class');
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has role="status"', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar />);

      const bar = screen.getByRole('status');
      expect(bar).toHaveAttribute('aria-live', 'polite');
    });

    it('progressbar has accessible label', () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25;
      render(<LandingPageFreeShippingBar threshold={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', '50% progress to free shipping');
    });
  });
});
