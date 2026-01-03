/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StickyCartBar } from './sticky-cart-bar';

// Mock the funnel context
const mockUseFunnel = jest.fn();
jest.mock('@/contexts/funnel-context', () => ({
  useFunnel: () => mockUseFunnel(),
}));

describe('StickyCartBar', () => {
  const defaultMockFunnel = {
    cart: [],
    cartTotal: 0,
    cartCount: 0,
    updateCartItem: jest.fn(),
    removeFromCart: jest.fn(),
  };

  const mockWithItems = {
    cart: [
      { productId: 'prod-1', name: 'Test Product 1', price: 29.99, quantity: 1, imageUrl: 'https://example.com/img1.jpg' },
      { productId: 'prod-2', name: 'Test Product 2', price: 19.99, quantity: 2, imageUrl: 'https://example.com/img2.jpg' },
    ],
    cartTotal: 69.97,
    cartCount: 3,
    updateCartItem: jest.fn(),
    removeFromCart: jest.fn(),
  };

  const mockProps = {
    onCheckout: jest.fn(),
    onOpenCart: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseFunnel.mockReturnValue(defaultMockFunnel);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('should not render when cart is empty', () => {
      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(screen.queryByRole('region', { name: /shopping cart/i })).not.toBeInTheDocument();
    });

    it('should render when cart has items', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByRole('region', { name: /shopping cart/i })).toBeInTheDocument();
    });

    it('should be visible only on mobile (md:hidden class)', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const cartBar = screen.getByRole('region', { name: /shopping cart/i });
      expect(cartBar).toHaveClass('md:hidden');
    });
  });

  describe('Content Display', () => {
    it('should display cart total', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByText('$69.97')).toBeInTheDocument();
    });

    it('should display item count badge', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display 99+ for large counts', () => {
      mockUseFunnel.mockReturnValue({
        ...mockWithItems,
        cartCount: 150,
      });

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onCheckout when Checkout button is clicked', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      fireEvent.click(screen.getByRole('button', { name: /checkout/i }));

      expect(mockProps.onCheckout).toHaveBeenCalledTimes(1);
    });

    it('should call onOpenCart when cart icon is clicked', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      fireEvent.click(screen.getByRole('button', { name: /view cart with 3 items/i }));

      expect(mockProps.onOpenCart).toHaveBeenCalledTimes(1);
    });

    it('should toggle expanded state when chevron is clicked', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Initially not expanded
      const expandButton = screen.getByRole('button', { name: /show cart preview/i });

      // Click to expand
      fireEvent.click(expandButton);

      // Should now show collapse button
      expect(screen.getByRole('button', { name: /hide cart preview/i })).toBeInTheDocument();
    });

    it('should toggle expanded state when drag handle is clicked', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Click drag handle to expand
      const dragHandle = screen.getByRole('button', { name: /expand cart preview/i });
      fireEvent.click(dragHandle);

      // Should now show collapse button
      expect(screen.getByRole('button', { name: /collapse cart preview/i })).toBeInTheDocument();
    });
  });

  describe('Mini Cart Preview', () => {
    it('should show preview items when expanded', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /expand cart preview/i }));

      // Should show product names
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    });

    it('should show remaining count when more than 3 items', () => {
      const manyItems = {
        cart: [
          { productId: 'prod-1', name: 'Product 1', price: 10, quantity: 1 },
          { productId: 'prod-2', name: 'Product 2', price: 10, quantity: 1 },
          { productId: 'prod-3', name: 'Product 3', price: 10, quantity: 1 },
          { productId: 'prod-4', name: 'Product 4', price: 10, quantity: 1 },
          { productId: 'prod-5', name: 'Product 5', price: 10, quantity: 1 },
        ],
        cartTotal: 50,
        cartCount: 5,
        updateCartItem: jest.fn(),
        removeFromCart: jest.fn(),
      };

      mockUseFunnel.mockReturnValue(manyItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /expand cart preview/i }));

      // Should show "+2 more items"
      expect(screen.getByText(/\+2 more items - View All/i)).toBeInTheDocument();
    });

    it('should call removeFromCart when remove button is clicked in preview', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /expand cart preview/i }));

      // Click remove on first item
      const removeButtons = screen.getAllByRole('button', { name: /remove .* from cart/i });
      fireEvent.click(removeButtons[0]);

      expect(mockWithItems.removeFromCart).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on checkout button', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(
        screen.getByRole('button', { name: /checkout with 3 items for \$69\.97/i })
      ).toBeInTheDocument();
    });

    it('should have screen reader announcement', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveClass('sr-only');
      expect(announcement).toHaveTextContent(/cart.*3 items/i);
    });

    it('should have 44px minimum touch targets', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      const checkoutButton = screen.getByRole('button', { name: /checkout/i });
      expect(checkoutButton).toHaveClass('min-h-[48px]');

      const cartButton = screen.getByRole('button', { name: /view cart/i });
      expect(cartButton).toHaveClass('min-h-[44px]');
    });

    it('should close on Escape key', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Expand first
      fireEvent.click(screen.getByRole('button', { name: /expand cart preview/i }));

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Should show expand button again (collapsed state)
      expect(screen.getByRole('button', { name: /expand cart preview/i })).toBeInTheDocument();
    });
  });

  describe('Safe Area', () => {
    it('should include safe area padding for iOS', () => {
      mockUseFunnel.mockReturnValue(mockWithItems);

      const { container } = render(<StickyCartBar {...mockProps} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Check for safe area inset styling
      const safeArea = container.querySelector('[class*="safe-area-inset-bottom"]');
      expect(safeArea).toBeInTheDocument();
    });
  });
});
