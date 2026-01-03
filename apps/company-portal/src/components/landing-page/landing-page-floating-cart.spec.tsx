import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LandingPageFloatingCart } from './landing-page-floating-cart';

// ============================================================================
// Mock LandingPageContext
// ============================================================================

const mockOpenCartDrawer = jest.fn();

const mockContextValue = {
  localCart: [] as Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    variantId?: string;
  }>,
  cartTotal: 0,
  cartCount: 0,
  openCartDrawer: mockOpenCartDrawer,
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

describe('LandingPageFloatingCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.localCart = [];
    mockContextValue.cartTotal = 0;
    mockContextValue.cartCount = 0;
  });

  // -------------------------------------------------------------------------
  // Visibility Tests
  // -------------------------------------------------------------------------

  describe('Visibility', () => {
    it('does not render when cart is empty', () => {
      mockContextValue.cartCount = 0;
      render(<LandingPageFloatingCart />);

      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('renders when cart has items', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 49.99;
      mockContextValue.localCart = [
        { productId: 'prod-1', name: 'Test Product', price: 24.99, quantity: 2 },
      ];

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });
    });

    it('displays correct item count', async () => {
      mockContextValue.cartCount = 3;
      mockContextValue.cartTotal = 75.00;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        expect(screen.getByText('3 items in cart')).toBeInTheDocument();
      });
    });

    it('displays singular item text for single item', async () => {
      mockContextValue.cartCount = 1;
      mockContextValue.cartTotal = 25.00;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        expect(screen.getByText('1 item in cart')).toBeInTheDocument();
      });
    });

    it('displays formatted total', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 99.50;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        expect(screen.getByText('$99.50')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Interaction Tests
  // -------------------------------------------------------------------------

  describe('Interactions', () => {
    it('calls openCartDrawer when View Cart button is clicked', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 49.99;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        const viewCartButton = screen.getByRole('button', { name: /view cart/i });
        expect(viewCartButton).toBeInTheDocument();
      });

      const viewCartButton = screen.getByRole('button', { name: /view cart/i });
      fireEvent.click(viewCartButton);

      expect(mockOpenCartDrawer).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has proper aria-label on region', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        const region = screen.getByRole('region');
        expect(region).toHaveAttribute('aria-label', 'Shopping cart summary');
      });
    });

    it('has descriptive aria-label on View Cart button', async () => {
      mockContextValue.cartCount = 3;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /view cart with 3 items/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('has screen reader announcement for cart updates', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 50.00;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent('Cart updated: 2 items, $50.00 total');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Animation Tests
  // -------------------------------------------------------------------------

  describe('Animation', () => {
    it('shows and hides based on cart count', async () => {
      mockContextValue.cartCount = 2;
      const { rerender } = render(<LandingPageFloatingCart />);

      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });

      // Update context to empty cart
      mockContextValue.cartCount = 0;
      rerender(<LandingPageFloatingCart />);

      // Component should eventually hide (after animation)
      await waitFor(
        () => {
          expect(screen.queryByRole('region')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Styling Tests
  // -------------------------------------------------------------------------

  describe('Styling', () => {
    it('applies custom className', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageFloatingCart className="custom-class" />);

      await waitFor(() => {
        const region = screen.getByRole('region');
        // The className is applied to the region element itself
        expect(region).toHaveClass('custom-class');
      });
    });

    it('is hidden on mobile (md:block)', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageFloatingCart />);

      await waitFor(() => {
        // The region element itself has the responsive classes
        const region = screen.getByRole('region');
        expect(region).toHaveClass('hidden');
        expect(region).toHaveClass('md:block');
      });
    });
  });
});
