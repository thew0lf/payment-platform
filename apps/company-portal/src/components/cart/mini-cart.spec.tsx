/**
 * Unit tests for MiniCart component
 *
 * Tests the MiniCart component for:
 * 1. Rendering cart icon
 * 2. Badge display with correct count
 * 3. Badge hidden when cart is empty
 * 4. Click handler calling onOpenDrawer
 * 5. Hover preview on desktop
 * 6. Preview showing cart items
 * 7. Preview showing total
 * 8. "View Cart" button in preview
 * 9. Touch target minimum 44px
 * 10. Accessibility (aria-label, aria-expanded)
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniCart, MiniCartProps } from './mini-cart';
import { useFunnel } from '@/contexts/funnel-context';

// ============================================================================
// Mocks
// ============================================================================

// Mock the useFunnel hook
jest.mock('@/contexts/funnel-context', () => ({
  useFunnel: jest.fn(),
}));

// Mock window.matchMedia for desktop detection
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// ============================================================================
// Test Fixtures
// ============================================================================

interface MockCartItem {
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface MockFunnelContext {
  cart: MockCartItem[];
  cartCount: number;
  cartTotal: number;
}

const createMockCartItem = (overrides: Partial<MockCartItem> = {}): MockCartItem => ({
  productId: 'prod-1',
  variantId: 'var-1',
  name: 'Test Product',
  price: 29.99,
  quantity: 1,
  imageUrl: 'https://example.com/image.jpg',
  ...overrides,
});

const defaultMockFunnelContext: MockFunnelContext = {
  cart: [],
  cartCount: 0,
  cartTotal: 0,
};

const mockFunnelContextWithItems = (items: MockCartItem[]): MockFunnelContext => {
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return {
    cart: items,
    cartCount,
    cartTotal,
  };
};

const defaultProps: MiniCartProps = {
  onOpenDrawer: jest.fn(),
};

// Helper to render MiniCart with mocked context
const renderMiniCart = (
  props: Partial<MiniCartProps> = {},
  contextOverrides: Partial<MockFunnelContext> = {}
) => {
  (useFunnel as jest.Mock).mockReturnValue({
    ...defaultMockFunnelContext,
    ...contextOverrides,
  });

  return render(<MiniCart {...defaultProps} {...props} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('MiniCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMatchMedia(true); // Default to desktop
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe('basic rendering', () => {
    it('should render cart icon', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      // Check for SVG icon (ShoppingCartIcon)
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render as a button element', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  // ==========================================================================
  // Badge Display
  // ==========================================================================

  describe('badge display', () => {
    it('should show badge with correct count when cart has items', () => {
      const items = [createMockCartItem({ quantity: 3 })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });

    it('should show badge with count summing multiple items', () => {
      const items = [
        createMockCartItem({ productId: 'prod-1', quantity: 2 }),
        createMockCartItem({ productId: 'prod-2', quantity: 3 }),
      ];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
    });

    it('should show "99+" when count exceeds 99', () => {
      renderMiniCart({}, { cartCount: 100, cart: [], cartTotal: 0 });

      const badge = screen.getByText('99+');
      expect(badge).toBeInTheDocument();
    });

    it('should hide badge when cart is empty', () => {
      renderMiniCart({}, { cartCount: 0, cart: [], cartTotal: 0 });

      // Badge should not exist in the DOM
      const badges = screen.queryAllByText(/\d+/);
      expect(badges.length).toBe(0);
    });

    it('should hide badge when count is 0', () => {
      renderMiniCart({}, { cartCount: 0, cart: [], cartTotal: 0 });

      const badge = screen.queryByText('0');
      expect(badge).not.toBeInTheDocument();
    });

    it('should have aria-hidden on badge', () => {
      const items = [createMockCartItem({ quantity: 5 })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const badge = screen.getByText('5');
      expect(badge).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ==========================================================================
  // Click Handler
  // ==========================================================================

  describe('click handler', () => {
    it('should call onOpenDrawer when button is clicked', () => {
      const mockOnOpenDrawer = jest.fn();
      renderMiniCart({ onOpenDrawer: mockOnOpenDrawer });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnOpenDrawer).toHaveBeenCalledTimes(1);
    });

    it('should close preview and call onOpenDrawer on click', async () => {
      const mockOnOpenDrawer = jest.fn();
      const items = [createMockCartItem()];
      renderMiniCart({ onOpenDrawer: mockOnOpenDrawer }, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button', { name: /shopping cart/i }).parentElement!;

      // Trigger hover to show preview
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Click the main cart button (not the View Cart button)
      const cartButton = screen.getByRole('button', { name: /shopping cart/i });
      fireEvent.click(cartButton);

      expect(mockOnOpenDrawer).toHaveBeenCalledTimes(1);
      // Preview should be closed
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should handle keyboard Enter key', () => {
      const mockOnOpenDrawer = jest.fn();
      renderMiniCart({ onOpenDrawer: mockOnOpenDrawer });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(mockOnOpenDrawer).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard Space key', () => {
      const mockOnOpenDrawer = jest.fn();
      renderMiniCart({ onOpenDrawer: mockOnOpenDrawer });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });

      expect(mockOnOpenDrawer).toHaveBeenCalledTimes(1);
    });

    it('should not call onOpenDrawer for other keys', () => {
      const mockOnOpenDrawer = jest.fn();
      renderMiniCart({ onOpenDrawer: mockOnOpenDrawer });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Tab' });
      fireEvent.keyDown(button, { key: 'Escape' });
      fireEvent.keyDown(button, { key: 'a' });

      expect(mockOnOpenDrawer).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Hover Preview (Desktop)
  // ==========================================================================

  describe('hover preview on desktop', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Desktop
    });

    it('should show preview on mouseEnter after delay when cart has items', async () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);

      // Preview should not appear immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // Advance timer past the 200ms delay
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Preview should now appear
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('should hide preview on mouseLeave', async () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;

      // Show preview
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Hide preview
      fireEvent.mouseLeave(container);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should cancel preview if mouseLeave happens before delay', () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;

      // Start hover
      fireEvent.mouseEnter(container);

      // Leave before delay completes
      act(() => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.mouseLeave(container);

      // Advance past original delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Preview should not appear
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should not show preview when cart is empty', () => {
      renderMiniCart({}, { cartCount: 0, cart: [], cartTotal: 0 });

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);

      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Hover Preview (Mobile)
  // ==========================================================================

  describe('hover preview on mobile', () => {
    beforeEach(() => {
      mockMatchMedia(false); // Mobile
    });

    it('should not show preview on mobile even with items', () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);

      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Preview Content
  // ==========================================================================

  describe('preview shows cart items', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Desktop
    });

    it('should show product names in preview', async () => {
      const items = [createMockCartItem({ name: 'Amazing Product' })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('Amazing Product')).toBeInTheDocument();
    });

    it('should show product quantities and prices', async () => {
      const items = [createMockCartItem({ quantity: 2, price: 25.5 })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('x2 - $51.00')).toBeInTheDocument();
    });

    it('should show product image when available', async () => {
      const items = [createMockCartItem({ imageUrl: 'https://example.com/product.jpg' })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button', { name: /shopping cart/i }).parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // The image has an empty alt text, so we need to query by tag
      const img = document.querySelector('img[src="https://example.com/product.jpg"]');
      expect(img).toBeInTheDocument();
    });

    it('should show placeholder when no image URL', async () => {
      const items = [createMockCartItem({ imageUrl: undefined })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Should render a placeholder div with an icon instead of an img
      const placeholder = document.querySelector('.w-10.h-10.rounded-md.bg-gray-100');
      expect(placeholder).toBeInTheDocument();
    });

    it('should show first 3 items only', async () => {
      const items = [
        createMockCartItem({ productId: '1', name: 'Product 1' }),
        createMockCartItem({ productId: '2', name: 'Product 2' }),
        createMockCartItem({ productId: '3', name: 'Product 3' }),
        createMockCartItem({ productId: '4', name: 'Product 4' }),
      ];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
      expect(screen.queryByText('Product 4')).not.toBeInTheDocument();
    });

    it('should show remaining item count when more than 3 items', async () => {
      const items = [
        createMockCartItem({ productId: '1', name: 'Product 1' }),
        createMockCartItem({ productId: '2', name: 'Product 2' }),
        createMockCartItem({ productId: '3', name: 'Product 3' }),
        createMockCartItem({ productId: '4', name: 'Product 4' }),
        createMockCartItem({ productId: '5', name: 'Product 5' }),
      ];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('should show singular "item" for 1 remaining item', async () => {
      const items = [
        createMockCartItem({ productId: '1', name: 'Product 1' }),
        createMockCartItem({ productId: '2', name: 'Product 2' }),
        createMockCartItem({ productId: '3', name: 'Product 3' }),
        createMockCartItem({ productId: '4', name: 'Product 4' }),
      ];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Preview Total
  // ==========================================================================

  describe('preview shows total', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Desktop
    });

    it('should show cart total in preview', async () => {
      const items = [createMockCartItem({ price: 29.99, quantity: 2 })];
      const context = mockFunnelContextWithItems(items);
      renderMiniCart({}, context);

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('$59.98')).toBeInTheDocument();
    });

    it('should show "Subtotal" label', async () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
    });

    it('should format total with 2 decimal places', async () => {
      const items = [createMockCartItem({ price: 10, quantity: 1 })];
      const context = mockFunnelContextWithItems(items);
      renderMiniCart({}, context);

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('$10.00')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // View Cart Button in Preview
  // ==========================================================================

  describe('View Cart button in preview', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Desktop
    });

    it('should render "View Cart" button in preview', async () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('View Cart')).toBeInTheDocument();
    });

    it('should call onOpenDrawer when View Cart is clicked', async () => {
      const mockOnOpenDrawer = jest.fn();
      const items = [createMockCartItem()];
      renderMiniCart({ onOpenDrawer: mockOnOpenDrawer }, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const viewCartButton = screen.getByText('View Cart');
      fireEvent.click(viewCartButton);

      expect(mockOnOpenDrawer).toHaveBeenCalledTimes(1);
    });

    it('should have minimum 44px touch target on View Cart button', async () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const viewCartButton = screen.getByText('View Cart');
      expect(viewCartButton).toHaveClass('min-h-[44px]');
    });
  });

  // ==========================================================================
  // Touch Target Size
  // ==========================================================================

  describe('touch target minimum 44px', () => {
    it('should have minimum height of 44px on main button', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('should have minimum width of 44px on main button', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-w-[44px]');
    });

    it('should have touch-manipulation class for mobile optimization', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveClass('touch-manipulation');
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have aria-label describing empty cart', () => {
      renderMiniCart({}, { cartCount: 0, cart: [], cartTotal: 0 });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Shopping cart, empty');
    });

    it('should have aria-label describing cart with 1 item', () => {
      renderMiniCart({}, { cartCount: 1, cart: [], cartTotal: 0 });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Shopping cart, 1 item');
    });

    it('should have aria-label describing cart with multiple items', () => {
      renderMiniCart({}, { cartCount: 5, cart: [], cartTotal: 0 });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Shopping cart, 5 items');
    });

    it('should have aria-haspopup="dialog"', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    });

    it('should have aria-expanded="false" when preview is hidden', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-expanded="true" when preview is shown', async () => {
      mockMatchMedia(true); // Desktop
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button', { name: /shopping cart/i }).parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      const button = screen.getByRole('button', { name: /shopping cart/i });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have focus-visible ring styles', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:ring-2');
      expect(button).toHaveClass('focus-visible:ring-offset-2');
    });

    it('should have role="tooltip" on preview element', async () => {
      mockMatchMedia(true); // Desktop
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Preview Header
  // ==========================================================================

  describe('preview header', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Desktop
    });

    it('should show correct item count in header (singular)', async () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('Your Cart (1 item)')).toBeInTheDocument();
    });

    it('should show correct item count in header (plural)', async () => {
      const items = [
        createMockCartItem({ productId: '1', quantity: 2 }),
        createMockCartItem({ productId: '2', quantity: 3 }),
      ];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('Your Cart (5 items)')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid mouseEnter/mouseLeave', () => {
      const items = [createMockCartItem()];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;

      // Rapid hover in/out
      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);
      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Preview should not be shown
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should handle products with variant IDs in key', async () => {
      mockMatchMedia(true); // Desktop
      const items = [
        createMockCartItem({ productId: 'prod-1', variantId: 'var-a', name: 'Product A' }),
        createMockCartItem({ productId: 'prod-1', variantId: 'var-b', name: 'Product B' }),
      ];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Both products should be rendered without key collision
      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('Product B')).toBeInTheDocument();
    });

    it('should handle zero price items', async () => {
      mockMatchMedia(true); // Desktop
      const items = [createMockCartItem({ price: 0, quantity: 1 })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(screen.getByText('x1 - $0.00')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should cleanup timeout on unmount', () => {
      const items = [createMockCartItem()];
      const { unmount } = renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);

      // Unmount before timeout completes
      unmount();

      // Should not throw any errors
      act(() => {
        jest.advanceTimersByTime(500);
      });
    });

    it('should handle empty product name', async () => {
      mockMatchMedia(true); // Desktop
      const items = [createMockCartItem({ name: '' })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const container = screen.getByRole('button').parentElement!;
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(250);
      });

      // Should still render the item row
      const preview = screen.getByRole('tooltip');
      expect(preview).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // CSS Classes Integrity
  // ==========================================================================

  describe('CSS classes integrity', () => {
    it('should have proper styling classes on main button', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveClass('relative');
      expect(button).toHaveClass('flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
      expect(button).toHaveClass('rounded-lg');
    });

    it('should have proper badge styling', () => {
      const items = [createMockCartItem({ quantity: 5 })];
      renderMiniCart({}, mockFunnelContextWithItems(items));

      const badge = screen.getByText('5');
      expect(badge).toHaveClass('absolute');
      expect(badge).toHaveClass('-top-1');
      expect(badge).toHaveClass('-right-1');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-semibold');
    });

    it('should have hover and active states', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-gray-100');
      expect(button).toHaveClass('active:bg-gray-200');
    });

    it('should have transition classes', () => {
      renderMiniCart();

      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-colors');
    });
  });
});
