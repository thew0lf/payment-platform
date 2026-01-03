/**
 * Unit tests for CartDrawer component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartDrawer, CartDrawerProps } from './cart-drawer';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock useFunnel context
const mockNextStage = jest.fn();
const mockUpdateCartItem = jest.fn();
const mockRemoveFromCart = jest.fn();

const mockUseFunnel = jest.fn();

jest.mock('@/contexts/funnel-context', () => ({
  useFunnel: () => mockUseFunnel(),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

interface MockCartItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

const createMockCartItem = (overrides: Partial<MockCartItem> = {}): MockCartItem => ({
  productId: 'product-1',
  name: 'Test Product',
  price: 29.99,
  quantity: 1,
  ...overrides,
});

const createMockFunnelContext = (overrides: Partial<{
  cart: MockCartItem[];
  cartTotal: number;
  cartCount: number;
  funnel: { id: string; stages: Array<{ type: string }> } | null;
  currentStage: { type: string } | null;
}> = {}) => ({
  cart: [],
  cartTotal: 0,
  cartCount: 0,
  funnel: null,
  currentStage: null,
  updateCartItem: mockUpdateCartItem,
  removeFromCart: mockRemoveFromCart,
  nextStage: mockNextStage,
  ...overrides,
});

const defaultProps: CartDrawerProps = {
  isOpen: true,
  onClose: jest.fn(),
};

// Helper to render component with context
const renderCartDrawer = (
  props: Partial<CartDrawerProps> = {},
  contextOverrides: Parameters<typeof createMockFunnelContext>[0] = {}
) => {
  mockUseFunnel.mockReturnValue(createMockFunnelContext(contextOverrides));
  return render(<CartDrawer {...defaultProps} {...props} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('CartDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  // ==========================================================================
  // Visibility Tests
  // ==========================================================================

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      renderCartDrawer({ isOpen: true });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Shopping cart')).toBeInTheDocument();
    });

    it('should have visible content when isOpen is true', () => {
      renderCartDrawer({ isOpen: true });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('translate-x-0');
      expect(dialog).not.toHaveClass('translate-x-full');
    });

    it('should render but be hidden when isOpen is false', () => {
      renderCartDrawer({ isOpen: false });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveClass('translate-x-full');
    });

    it('should hide backdrop when isOpen is false', () => {
      const { container } = renderCartDrawer({ isOpen: false });

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toHaveClass('opacity-0', 'pointer-events-none');
    });

    it('should show backdrop when isOpen is true', () => {
      const { container } = renderCartDrawer({ isOpen: true });

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toHaveClass('opacity-100');
    });
  });

  // ==========================================================================
  // Close Functionality Tests
  // ==========================================================================

  describe('close functionality', () => {
    it('should call onClose when clicking overlay', () => {
      const onClose = jest.fn();
      const { container } = renderCartDrawer({ isOpen: true, onClose });

      const backdrop = container.querySelector('[aria-hidden="true"]');
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when pressing Escape key', () => {
      const onClose = jest.fn();
      renderCartDrawer({ isOpen: true, onClose });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when pressing other keys', () => {
      const onClose = jest.fn();
      renderCartDrawer({ isOpen: true, onClose });

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not respond to Escape when drawer is closed', () => {
      const onClose = jest.fn();
      renderCartDrawer({ isOpen: false, onClose });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when clicking close button', () => {
      const onClose = jest.fn();
      renderCartDrawer({ isOpen: true, onClose });

      const closeButton = screen.getByLabelText('Close cart');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should prevent body scroll when open', () => {
      renderCartDrawer({ isOpen: true });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<CartDrawer isOpen={true} onClose={jest.fn()} />);

      // First check it's hidden when open
      expect(document.body.style.overflow).toBe('hidden');

      // Then close the drawer
      rerender(<CartDrawer isOpen={false} onClose={jest.fn()} />);

      expect(document.body.style.overflow).toBe('');
    });
  });

  // ==========================================================================
  // Cart Items Display Tests
  // ==========================================================================

  describe('cart items display', () => {
    it('should display cart items correctly', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', name: 'Product One', price: 19.99, quantity: 2 }),
        createMockCartItem({ productId: 'p2', name: 'Product Two', price: 39.99, quantity: 1 }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 3, cartTotal: 79.97 });

      expect(screen.getByText('Product One')).toBeInTheDocument();
      expect(screen.getByText('Product Two')).toBeInTheDocument();
    });

    it('should display product prices correctly', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', name: 'Test Item', price: 29.99, quantity: 1 }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      // Price appears multiple times (unit price, line total, subtotal)
      const prices = screen.getAllByText('$29.99');
      expect(prices.length).toBeGreaterThan(0);
    });

    it('should display quantity for each item', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', name: 'Test Item', price: 10, quantity: 3 }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 3, cartTotal: 30 });

      expect(screen.getByLabelText('Quantity: 3')).toBeInTheDocument();
    });

    it('should display product image when imageUrl is provided', () => {
      const cartItems = [
        createMockCartItem({
          productId: 'p1',
          name: 'Test Product',
          imageUrl: 'https://example.com/image.jpg',
        }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const image = screen.getByAltText('Test Product');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should display placeholder icon when no imageUrl is provided', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', name: 'Test Product', imageUrl: undefined }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      // Should not find an image with alt text
      expect(screen.queryByAltText('Test Product')).not.toBeInTheDocument();
    });

    it('should display line totals for each item (price * quantity)', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', name: 'Test Item', price: 15.00, quantity: 3 }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 3, cartTotal: 45 });

      // Line total should be $45.00 - appears in line total and subtotal
      const lineTotals = screen.getAllByText('$45.00');
      expect(lineTotals.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Cart Totals Tests
  // ==========================================================================

  describe('cart totals', () => {
    it('should calculate and display correct subtotal', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', price: 25.00, quantity: 2 }),
        createMockCartItem({ productId: 'p2', price: 15.00, quantity: 1 }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 3, cartTotal: 65.00 });

      expect(screen.getByText('$65.00')).toBeInTheDocument();
    });

    it('should display cart count in header', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', quantity: 2 }),
        createMockCartItem({ productId: 'p2', quantity: 3 }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 5, cartTotal: 100 });

      expect(screen.getByText('(5 items)')).toBeInTheDocument();
    });

    it('should display singular "item" for count of 1', () => {
      const cartItems = [createMockCartItem({ productId: 'p1', quantity: 1 })];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      expect(screen.getByText('(1 item)')).toBeInTheDocument();
    });

    it('should display shipping message', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      expect(screen.getByText(/Shipping \+ taxes calculated at checkout/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty Cart State Tests
  // ==========================================================================

  describe('empty cart state', () => {
    it('should show empty cart state when cart is empty', () => {
      renderCartDrawer({}, { cart: [], cartCount: 0, cartTotal: 0 });

      expect(screen.getByText('Nothing here yet!')).toBeInTheDocument();
    });

    it('should display helpful message in empty state', () => {
      renderCartDrawer({}, { cart: [], cartCount: 0, cartTotal: 0 });

      expect(screen.getByText(/Your cart is feeling lonely/)).toBeInTheDocument();
    });

    it('should have Start Exploring button in empty state', () => {
      const onClose = jest.fn();
      renderCartDrawer({ onClose }, { cart: [], cartCount: 0, cartTotal: 0 });

      const exploreButton = screen.getByRole('button', { name: /start exploring/i });
      expect(exploreButton).toBeInTheDocument();
    });

    it('should call onClose when clicking Start Exploring button', () => {
      const onClose = jest.fn();
      renderCartDrawer({ onClose }, { cart: [], cartCount: 0, cartTotal: 0 });

      const exploreButton = screen.getByRole('button', { name: /start exploring/i });
      fireEvent.click(exploreButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not display checkout button when cart is empty', () => {
      renderCartDrawer({}, { cart: [], cartCount: 0, cartTotal: 0 });

      expect(screen.queryByRole('button', { name: /complete your order/i })).not.toBeInTheDocument();
    });

    it('should not display express checkout options when cart is empty', () => {
      renderCartDrawer({}, { cart: [], cartCount: 0, cartTotal: 0 });

      // Express checkout is disabled (coming soon) so this test should pass
      expect(screen.queryByText('Express Checkout')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have role="dialog" on drawer', () => {
      renderCartDrawer();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true" on drawer', () => {
      renderCartDrawer();

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-label="Shopping cart" on drawer', () => {
      renderCartDrawer();

      expect(screen.getByLabelText('Shopping cart')).toBeInTheDocument();
    });

    it('should have aria-label on close button', () => {
      renderCartDrawer();

      expect(screen.getByLabelText('Close cart')).toBeInTheDocument();
    });

    it('should have aria-label on remove item buttons', () => {
      const cartItems = [createMockCartItem({ name: 'Test Product' })];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      expect(screen.getByLabelText('Remove Test Product from cart')).toBeInTheDocument();
    });

    it('should have aria-label on quantity decrease button', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      expect(screen.getByLabelText('Decrease quantity')).toBeInTheDocument();
    });

    it('should have aria-label on quantity increase button', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      expect(screen.getByLabelText('Increase quantity')).toBeInTheDocument();
    });

    it('should have aria-hidden="true" on backdrop', () => {
      const { container } = renderCartDrawer();

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('should focus close button when drawer opens', async () => {
      renderCartDrawer({ isOpen: true });

      await waitFor(() => {
        expect(screen.getByLabelText('Close cart')).toHaveFocus();
      });
    });

    it('should have aria-hidden on decorative icons', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      // Check that SVG icons have aria-hidden
      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    // Express checkout tests removed - feature disabled until implemented
  });

  // ==========================================================================
  // Touch Target Tests
  // ==========================================================================

  describe('touch targets', () => {
    it('should have minimum 44px touch target on close button', () => {
      renderCartDrawer();

      const closeButton = screen.getByLabelText('Close cart');
      expect(closeButton.className).toContain('min-w-[44px]');
      expect(closeButton.className).toContain('min-h-[44px]');
    });

    it('should have minimum 44px touch target on quantity buttons', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const decreaseButton = screen.getByLabelText('Decrease quantity');
      const increaseButton = screen.getByLabelText('Increase quantity');

      expect(decreaseButton.className).toContain('min-w-[44px]');
      expect(decreaseButton.className).toContain('min-h-[44px]');
      expect(increaseButton.className).toContain('min-w-[44px]');
      expect(increaseButton.className).toContain('min-h-[44px]');
    });

    it('should have minimum 44px touch target on remove button', () => {
      const cartItems = [createMockCartItem({ name: 'Test Product' })];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const removeButton = screen.getByLabelText('Remove Test Product from cart');
      expect(removeButton.className).toContain('min-w-[44px]');
      expect(removeButton.className).toContain('min-h-[44px]');
    });

    it('should have minimum 44px touch target on Start Exploring button (empty cart)', () => {
      renderCartDrawer({}, { cart: [], cartCount: 0, cartTotal: 0 });

      const continueButton = screen.getByRole('button', { name: /start exploring/i });
      expect(continueButton.className).toContain('min-h-[44px]');
    });

    it('should have touch-manipulation class on interactive elements', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const closeButton = screen.getByLabelText('Close cart');
      expect(closeButton.className).toContain('touch-manipulation');
    });
  });

  // ==========================================================================
  // Close Button Tests
  // ==========================================================================

  describe('close button functionality', () => {
    it('should render close button with X icon', () => {
      renderCartDrawer();

      const closeButton = screen.getByLabelText('Close cart');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.querySelector('svg')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      renderCartDrawer({ isOpen: true, onClose });

      fireEvent.click(screen.getByLabelText('Close cart'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should have hover styling classes', () => {
      renderCartDrawer();

      const closeButton = screen.getByLabelText('Close cart');
      expect(closeButton.className).toContain('hover:text-gray-600');
      expect(closeButton.className).toContain('hover:bg-gray-100');
    });
  });

  // ==========================================================================
  // Checkout Button Tests
  // ==========================================================================

  describe('checkout button', () => {
    it('should navigate to checkout when clicked', () => {
      const onClose = jest.fn();
      const cartItems = [createMockCartItem()];

      renderCartDrawer({ onClose }, {
        cart: cartItems,
        cartCount: 1,
        cartTotal: 29.99,
        funnel: { id: 'funnel-1', stages: [{ type: 'LANDING' }, { type: 'CHECKOUT' }] },
        currentStage: { type: 'LANDING' },
      });

      const checkoutButton = screen.getByRole('button', { name: /complete your order/i });
      fireEvent.click(checkoutButton);

      expect(mockNextStage).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should just close drawer if already on checkout stage', () => {
      const onClose = jest.fn();
      const cartItems = [createMockCartItem()];

      renderCartDrawer({ onClose }, {
        cart: cartItems,
        cartCount: 1,
        cartTotal: 29.99,
        funnel: { id: 'funnel-1', stages: [{ type: 'CHECKOUT' }] },
        currentStage: { type: 'CHECKOUT' },
      });

      const checkoutButton = screen.getByRole('button', { name: /complete your order/i });
      fireEvent.click(checkoutButton);

      expect(mockNextStage).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should display checkout button with arrow icon', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const checkoutButton = screen.getByRole('button', { name: /complete your order/i });
      expect(checkoutButton).toBeInTheDocument();
      expect(checkoutButton.querySelector('svg')).toBeInTheDocument();
    });

    it('should have proper styling on checkout button', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const checkoutButton = screen.getByRole('button', { name: /complete your order/i });
      expect(checkoutButton.className).toContain('w-full');
      expect(checkoutButton.className).toContain('min-h-[52px]');
    });
  });

  // ==========================================================================
  // Quantity Controls Tests
  // ==========================================================================

  describe('quantity controls', () => {
    it('should call updateCartItem when increasing quantity', () => {
      const cartItems = [createMockCartItem({ productId: 'p1', quantity: 1 })];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const increaseButton = screen.getByLabelText('Increase quantity');
      fireEvent.click(increaseButton);

      expect(mockUpdateCartItem).toHaveBeenCalledWith('p1', 2);
    });

    it('should call updateCartItem when decreasing quantity', () => {
      const cartItems = [createMockCartItem({ productId: 'p1', quantity: 3 })];

      renderCartDrawer({}, { cart: cartItems, cartCount: 3, cartTotal: 89.97 });

      const decreaseButton = screen.getByLabelText('Decrease quantity');
      fireEvent.click(decreaseButton);

      expect(mockUpdateCartItem).toHaveBeenCalledWith('p1', 2);
    });

    it('should show undo flow when clicking remove button (showRemoveConfirmation=false)', () => {
      jest.useFakeTimers();
      const cartItems = [createMockCartItem({ productId: 'p1', name: 'Test Product' })];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      const removeButton = screen.getByLabelText('Remove Test Product from cart');
      fireEvent.click(removeButton);

      // Should show undo state (not call removeFromCart immediately)
      expect(screen.getByText(/Saying goodbye to/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();

      // After timeout, should call removeFromCart
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockRemoveFromCart).toHaveBeenCalledWith('p1');
      jest.useRealTimers();
    });
  });

  // ==========================================================================
  // Express Checkout Tests (Disabled - Coming Soon)
  // ==========================================================================

  describe('express checkout', () => {
    it('should NOT display express checkout section (disabled until implemented)', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      // Express checkout is disabled/hidden until implemented
      expect(screen.queryByText('Express Checkout')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Pay with Apple Pay')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Pay with Google Pay')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Pay with PayPal')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Security Badge Tests
  // ==========================================================================

  describe('security badge', () => {
    it('should display security badge when cart has items', () => {
      const cartItems = [createMockCartItem()];

      renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      expect(screen.getByText(/your payment is safe with us/i)).toBeInTheDocument();
    });

    it('should have lock icon in security badge', () => {
      const cartItems = [createMockCartItem()];

      const { container } = renderCartDrawer({}, { cart: cartItems, cartCount: 1, cartTotal: 29.99 });

      // Find the footer security section
      const securityText = screen.getByText(/your payment is safe with us/i);
      const parentElement = securityText.parentElement;
      expect(parentElement?.querySelector('svg')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Header Tests
  // ==========================================================================

  describe('header', () => {
    it('should display "Your Cart" title', () => {
      renderCartDrawer();

      // The heading contains "Your Cart" text
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Your Cart');
    });

    it('should not display item count when cart is empty', () => {
      renderCartDrawer({}, { cart: [], cartCount: 0, cartTotal: 0 });

      expect(screen.queryByText(/items?\)/)).not.toBeInTheDocument();
    });

    it('should have sticky header styling', () => {
      const { container } = renderCartDrawer();

      const header = container.querySelector('header');
      expect(header).toHaveClass('flex-shrink-0');
    });
  });

  // ==========================================================================
  // Multiple Items Tests
  // ==========================================================================

  describe('multiple cart items', () => {
    it('should render all cart items', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', name: 'Product One' }),
        createMockCartItem({ productId: 'p2', name: 'Product Two' }),
        createMockCartItem({ productId: 'p3', name: 'Product Three' }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 3, cartTotal: 89.97 });

      expect(screen.getByText('Product One')).toBeInTheDocument();
      expect(screen.getByText('Product Two')).toBeInTheDocument();
      expect(screen.getByText('Product Three')).toBeInTheDocument();
    });

    it('should have unique keys for cart items with variants', () => {
      const cartItems = [
        createMockCartItem({ productId: 'p1', variantId: 'v1', name: 'Product Variant 1' }),
        createMockCartItem({ productId: 'p1', variantId: 'v2', name: 'Product Variant 2' }),
      ];

      renderCartDrawer({}, { cart: cartItems, cartCount: 2, cartTotal: 59.98 });

      expect(screen.getByText('Product Variant 1')).toBeInTheDocument();
      expect(screen.getByText('Product Variant 2')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Styling Tests
  // ==========================================================================

  describe('styling', () => {
    it('should have proper drawer width classes', () => {
      renderCartDrawer();

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('w-full');
      expect(dialog.className).toContain('sm:w-[400px]');
    });

    it('should have transition classes for animation', () => {
      renderCartDrawer();

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('transition-transform');
      expect(dialog.className).toContain('duration-300');
    });

    it('should have shadow styling', () => {
      renderCartDrawer();

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('shadow-2xl');
    });

    it('should have backdrop blur on overlay', () => {
      const { container } = renderCartDrawer();

      const backdrop = container.querySelector('[aria-hidden="true"]');
      expect(backdrop?.className).toContain('backdrop-blur-sm');
    });
  });
});
