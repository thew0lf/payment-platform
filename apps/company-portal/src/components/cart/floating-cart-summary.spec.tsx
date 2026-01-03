/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FloatingCartSummary } from './floating-cart-summary';

// Mock the funnel context
const mockUseFunnel = jest.fn();
jest.mock('@/contexts/funnel-context', () => ({
  useFunnel: () => mockUseFunnel(),
}));

describe('FloatingCartSummary', () => {
  const defaultMockFunnel = {
    cart: [],
    cartTotal: 0,
    cartCount: 0,
  };

  const mockWithItems = {
    cart: [
      { productId: 'prod-1', name: 'Test Product', price: 29.99, quantity: 2 },
    ],
    cartTotal: 59.98,
    cartCount: 2,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseFunnel.mockReturnValue(defaultMockFunnel);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should not render when cart is empty', () => {
      const { container } = render(
        <FloatingCartSummary onOpenCart={jest.fn()} />
      );

      // Wait for animation timers
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // The component should not have visible cart UI
      expect(screen.queryByRole('region', { name: /shopping cart summary/i })).not.toBeInTheDocument();
    });

    it('should render when cart has items', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      // Wait for visibility animation
      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByRole('region', { name: /shopping cart summary/i })).toBeInTheDocument();
    });

    it('should be hidden on mobile (md:hidden class)', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const cartRegion = screen.getByRole('region', { name: /shopping cart summary/i });
      expect(cartRegion).toHaveClass('hidden');
      expect(cartRegion).toHaveClass('md:block');
    });
  });

  describe('Content Display', () => {
    it('should display item count', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByText(/2 items in cart/i)).toBeInTheDocument();
    });

    it('should display cart total', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByText('$59.98')).toBeInTheDocument();
    });

    it('should display "1 item" for singular', () => {
      mockUseFunnel.mockReturnValue({
        ...mockWithItems,
        cartCount: 1,
      });

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByText(/1 item in cart/i)).toBeInTheDocument();
    });

    it('should display badge with item count', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Badge should show count
      const badge = screen.getByText('2', { selector: 'span' });
      expect(badge).toHaveAttribute('aria-hidden', 'true');
    });

    it('should display 99+ for large counts', () => {
      mockUseFunnel.mockReturnValue({
        ...mockWithItems,
        cartCount: 150,
      });

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onOpenCart when View Cart button is clicked', () => {
      const onOpenCart = jest.fn();
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={onOpenCart} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      fireEvent.click(screen.getByRole('button', { name: /view cart/i }));

      expect(onOpenCart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on View Cart button', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const button = screen.getByRole('button', { name: /view cart with 2 items/i });
      expect(button).toBeInTheDocument();
    });

    it('should have screen reader announcement for cart updates', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveClass('sr-only');
      expect(announcement).toHaveTextContent(/cart updated.*2 items/i);
    });

    it('should have focus visible styles', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const button = screen.getByRole('button', { name: /view cart/i });
      expect(button).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Animations', () => {
    it('should apply pulse animation when items are added', async () => {
      // Start with 1 item
      mockUseFunnel.mockReturnValue({
        cart: [{ productId: 'prod-1', name: 'Test', price: 10, quantity: 1 }],
        cartTotal: 10,
        cartCount: 1,
      });

      const { rerender } = render(<FloatingCartSummary onOpenCart={jest.fn()} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Add another item
      mockUseFunnel.mockReturnValue({
        cart: [{ productId: 'prod-1', name: 'Test', price: 10, quantity: 2 }],
        cartTotal: 20,
        cartCount: 2,
      });

      rerender(<FloatingCartSummary onOpenCart={jest.fn()} />);

      // Badge should have pulse animation class
      await waitFor(() => {
        const badge = screen.getByText('2', { selector: 'span' });
        expect(badge).toHaveClass('animate-badge-pulse');
      });
    });
  });
});
