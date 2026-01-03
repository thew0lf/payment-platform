import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { LandingPageUrgencyTimer } from './landing-page-urgency-timer';

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

describe('LandingPageUrgencyTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockContextValue.cartCount = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Visibility Tests
  // -------------------------------------------------------------------------

  describe('Visibility', () => {
    it('does not render when cart is empty', () => {
      mockContextValue.cartCount = 0;
      render(<LandingPageUrgencyTimer />);

      expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    });

    it('renders when cart has items', () => {
      mockContextValue.cartCount = 2;
      render(<LandingPageUrgencyTimer />);

      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('displays default message', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer />);

      expect(screen.getByText('Your cart is reserved for')).toBeInTheDocument();
    });

    it('displays custom message', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer message="Offer expires in" />);

      expect(screen.getByText('Offer expires in')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Timer Tests
  // -------------------------------------------------------------------------

  describe('Timer', () => {
    it('starts at specified duration', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer duration={300} />); // 5 minutes

      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('counts down every second', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer duration={10} />);

      expect(screen.getByText('00:10')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText('00:09')).toBeInTheDocument();
    });

    it('shows expired message when timer reaches zero', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer duration={2} />);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText('Your reservation has expired')).toBeInTheDocument();
    });

    it('displays custom expired message', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer duration={1} expiredMessage="Time's up!" />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText("Time's up!")).toBeInTheDocument();
    });

    it('calls onExpire callback when timer expires', () => {
      const onExpire = jest.fn();
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer duration={2} onExpire={onExpire} />);

      // Advance past expiration
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should be called at least once when expired
      expect(onExpire).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Variant Tests
  // -------------------------------------------------------------------------

  describe('Variants', () => {
    it('applies banner variant styles', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer variant="banner" />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('w-full');
    });

    it('applies inline variant styles', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer variant="inline" />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('inline-flex');
    });

    it('applies floating variant styles', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer variant="floating" />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('fixed');
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has role="timer"', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer />);

      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-live', 'polite');
    });

    it('has accessible time label', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer duration={125} />); // 2:05

      // Should have aria-label with human-readable time
      expect(screen.getByLabelText(/2 minutes and 5 seconds remaining/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('resets timer when cart becomes empty and then has items again', () => {
      mockContextValue.cartCount = 1;
      const { rerender } = render(<LandingPageUrgencyTimer duration={10} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText('00:05')).toBeInTheDocument();

      // Cart becomes empty
      mockContextValue.cartCount = 0;
      rerender(<LandingPageUrgencyTimer duration={10} />);

      expect(screen.queryByRole('timer')).not.toBeInTheDocument();

      // Cart has items again
      mockContextValue.cartCount = 2;
      rerender(<LandingPageUrgencyTimer duration={10} />);

      expect(screen.getByText('00:10')).toBeInTheDocument(); // Reset to full duration
    });

    it('applies custom className', () => {
      mockContextValue.cartCount = 1;
      render(<LandingPageUrgencyTimer className="custom-class" />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('custom-class');
    });
  });
});
