import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LandingPageStickyCartBar } from './landing-page-sticky-cart-bar';

// ============================================================================
// Mock LandingPageContext
// ============================================================================

const mockOpenCartDrawer = jest.fn();
const mockRemoveFromCart = jest.fn();

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
  removeFromCart: mockRemoveFromCart,
  isCartDrawerOpen: false,
  landingPage: null,
  isLoading: false,
  error: null,
  session: null,
  cart: null,
  initializeLandingPage: jest.fn(),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  trackEvent: jest.fn(),
};

jest.mock('@/contexts/landing-page-context', () => ({
  useLandingPage: () => mockContextValue,
  LandingPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ============================================================================
// Tests
// ============================================================================

describe('LandingPageStickyCartBar', () => {
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
      render(<LandingPageStickyCartBar />);

      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('renders when cart has items', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 49.99;
      mockContextValue.localCart = [
        { productId: 'prod-1', name: 'Test Product', price: 24.99, quantity: 2 },
      ];

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        expect(screen.getByRole('region')).toBeInTheDocument();
      });
    });

    it('displays formatted subtotal', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 99.50;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        expect(screen.getByText('$99.50')).toBeInTheDocument();
      });
    });

    it('displays subtotal label', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 50.00;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        expect(screen.getByText('Subtotal')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Interaction Tests
  // -------------------------------------------------------------------------

  describe('Interactions', () => {
    it('calls openCartDrawer when cart icon is clicked', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 49.99;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        const cartIconButton = screen.getByRole('button', { name: /view cart with 2 items/i });
        expect(cartIconButton).toBeInTheDocument();
      });

      const cartIconButton = screen.getByRole('button', { name: /view cart with 2 items/i });
      fireEvent.click(cartIconButton);

      expect(mockOpenCartDrawer).toHaveBeenCalledTimes(1);
    });

    it('calls openCartDrawer when Checkout button is clicked', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 49.99;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        const checkoutButton = screen.getByRole('button', { name: /checkout/i });
        expect(checkoutButton).toBeInTheDocument();
      });

      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      fireEvent.click(checkoutButton);

      expect(mockOpenCartDrawer).toHaveBeenCalledTimes(1);
    });

    it('toggles expanded state when drag handle is clicked', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
        expect(expandButton).toBeInTheDocument();
      });

      const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
      fireEvent.click(expandButton);

      // Should now show collapse button
      expect(screen.getByRole('button', { name: /collapse cart preview/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Expanded State Tests
  // -------------------------------------------------------------------------

  describe('Expanded State', () => {
    it('shows cart preview items when expanded', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.localCart = [
        { productId: 'prod-1', name: 'Test Product 1', price: 25.00, quantity: 1 },
        { productId: 'prod-2', name: 'Test Product 2', price: 25.00, quantity: 1 },
      ];

      render(<LandingPageStickyCartBar />);

      // Expand the cart preview
      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
        fireEvent.click(expandButton);
      });

      // Should show product names
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });

    it('shows "Your Cart" heading when expanded', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.localCart = [
        { productId: 'prod-1', name: 'Test Product', price: 25.00, quantity: 1 },
      ];

      render(<LandingPageStickyCartBar />);

      // Expand
      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
        fireEvent.click(expandButton);
      });

      expect(screen.getByText('Your Cart')).toBeInTheDocument();
    });

    it('shows "View All" link when more than 3 items', async () => {
      mockContextValue.cartCount = 5;
      mockContextValue.localCart = [
        { productId: 'prod-1', name: 'Product 1', price: 10.00, quantity: 1 },
        { productId: 'prod-2', name: 'Product 2', price: 10.00, quantity: 1 },
        { productId: 'prod-3', name: 'Product 3', price: 10.00, quantity: 1 },
        { productId: 'prod-4', name: 'Product 4', price: 10.00, quantity: 1 },
        { productId: 'prod-5', name: 'Product 5', price: 10.00, quantity: 1 },
      ];

      render(<LandingPageStickyCartBar />);

      // Expand
      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
        fireEvent.click(expandButton);
      });

      expect(screen.getByText('+2 more items - View All')).toBeInTheDocument();
    });

    it('closes on Escape key', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageStickyCartBar />);

      // Expand
      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
        fireEvent.click(expandButton);
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Should now show expand button again
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /expand cart preview/i })).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has proper aria-label on region', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        const region = screen.getByRole('region');
        expect(region).toHaveAttribute('aria-label', 'Shopping cart');
      });
    });

    it('has screen reader announcement for cart updates', async () => {
      mockContextValue.cartCount = 2;
      mockContextValue.cartTotal = 50.00;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent('Cart: 2 items, $50.00');
      });
    });

    it('has aria-expanded on toggle button', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
        expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      });

      // Click to expand
      const expandButton = screen.getByRole('button', { name: /expand cart preview/i });
      fireEvent.click(expandButton);

      // Check expanded state
      const collapseButton = screen.getByRole('button', { name: /collapse cart preview/i });
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // -------------------------------------------------------------------------
  // Mobile-Only Tests
  // -------------------------------------------------------------------------

  describe('Mobile Only', () => {
    it('is hidden on desktop (md:hidden)', async () => {
      mockContextValue.cartCount = 2;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        // The region element itself has the md:hidden class
        const region = screen.getByRole('region');
        expect(region).toHaveClass('md:hidden');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Badge Tests
  // -------------------------------------------------------------------------

  describe('Badge', () => {
    it('displays cart count in badge', async () => {
      mockContextValue.cartCount = 5;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('shows 99+ for counts over 99', async () => {
      mockContextValue.cartCount = 150;

      render(<LandingPageStickyCartBar />);

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });
  });
});
