/**
 * Unit tests for CartItem component
 *
 * Tests cover:
 * - Product info rendering (name, price, quantity, image)
 * - Placeholder rendering when no image
 * - Variant display
 * - Quantity increase/decrease functionality
 * - Quantity bounds (cannot decrease below 1, max quantity enforcement)
 * - Remove confirmation dialog
 * - Direct removal with undo functionality
 * - Low stock warning
 * - Out of stock warning
 * - Touch targets (44px minimum)
 * - Accessibility (aria-labels)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CartItem, CartItemProps } from './cart-item';

// ============================================================================
// Test Fixtures
// ============================================================================

const createCartItem = (overrides: Partial<CartItemProps['item']> = {}): CartItemProps['item'] => ({
  productId: 'prod-123',
  name: 'Premium Coffee Beans',
  price: 29.99,
  quantity: 2,
  imageUrl: 'https://example.com/coffee.jpg',
  ...overrides,
});

const defaultProps: Omit<CartItemProps, 'item'> = {
  onUpdateQuantity: jest.fn(),
  onRemove: jest.fn(),
};

// Helper to render with default props
const renderCartItem = (
  itemOverrides: Partial<CartItemProps['item']> = {},
  propsOverrides: Partial<Omit<CartItemProps, 'item'>> = {}
) => {
  const item = createCartItem(itemOverrides);
  const props = { ...defaultProps, ...propsOverrides, item };
  return render(<CartItem {...props} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('CartItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Basic Rendering - Product Info
  // ==========================================================================

  describe('renders product info correctly', () => {
    it('should render product name', () => {
      renderCartItem({ name: 'Organic Tea Leaves' });

      expect(screen.getByText('Organic Tea Leaves')).toBeInTheDocument();
    });

    it('should render product name in h3 element', () => {
      renderCartItem({ name: 'Premium Coffee' });

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Premium Coffee');
    });

    it('should render product price formatted as currency', () => {
      renderCartItem({ price: 49.99, quantity: 1 });

      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });

    it('should render line total (price x quantity)', () => {
      renderCartItem({ price: 15.00, quantity: 3 });

      // Line total should be $45.00
      expect(screen.getByLabelText(/Line total: \$45\.00/)).toBeInTheDocument();
    });

    it('should show unit price when quantity is greater than 1', () => {
      renderCartItem({ price: 19.99, quantity: 3 });

      // Should show "$19.99 each"
      expect(screen.getByText('$19.99 each')).toBeInTheDocument();
    });

    it('should not show unit price when quantity is 1', () => {
      renderCartItem({ price: 19.99, quantity: 1 });

      expect(screen.queryByText(/each/)).not.toBeInTheDocument();
    });

    it('should render quantity display', () => {
      renderCartItem({ quantity: 5 });

      expect(screen.getByLabelText('Quantity: 5')).toHaveTextContent('5');
    });

    it('should render product image', () => {
      renderCartItem({ imageUrl: 'https://example.com/product.jpg', name: 'Test Product' });

      const img = screen.getByRole('img', { name: 'Test Product' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/product.jpg');
    });

    it('should render image with correct dimensions (80x80)', () => {
      renderCartItem({ imageUrl: 'https://example.com/product.jpg' });

      const img = screen.getByRole('img');
      expect(img).toHaveClass('w-20', 'h-20');
    });

    it('should render image with lazy loading', () => {
      renderCartItem({ imageUrl: 'https://example.com/product.jpg' });

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  // ==========================================================================
  // Placeholder Rendering (No Image)
  // ==========================================================================

  describe('renders placeholder when no image', () => {
    it('should render placeholder icon when imageUrl is not provided', () => {
      const { container } = renderCartItem({ imageUrl: undefined });

      // Should have a placeholder div with the shopping cart icon
      const placeholder = container.querySelector('.w-20.h-20.bg-gray-100');
      expect(placeholder).toBeInTheDocument();

      // Should have the ShoppingCartIcon inside
      const icon = placeholder?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render placeholder with correct dimensions (80x80)', () => {
      const { container } = renderCartItem({ imageUrl: undefined });

      // Find placeholder div with shopping cart icon
      const placeholder = container.querySelector('.w-20.h-20.bg-gray-100');
      expect(placeholder).toBeInTheDocument();
    });

    it('should have ShoppingCartIcon in placeholder', () => {
      const { container } = renderCartItem({ imageUrl: undefined });

      // Find the SVG icon within the placeholder
      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-8', 'w-8');
    });
  });

  // ==========================================================================
  // Variant Display
  // ==========================================================================

  describe('shows variant name when provided', () => {
    it('should display variantDisplayName when provided', () => {
      renderCartItem({}, { variantDisplayName: 'Size: Large, Color: Blue' });

      expect(screen.getByText('Size: Large, Color: Blue')).toBeInTheDocument();
    });

    it('should display default variant text when variantId is provided but no displayName', () => {
      renderCartItem({ variantId: 'var-456' }, { variantDisplayName: undefined });

      expect(screen.getByText('Variant: var-456')).toBeInTheDocument();
    });

    it('should prioritize variantDisplayName over variantId', () => {
      renderCartItem(
        { variantId: 'var-456' },
        { variantDisplayName: 'Custom Variant Name' }
      );

      expect(screen.getByText('Custom Variant Name')).toBeInTheDocument();
      expect(screen.queryByText('Variant: var-456')).not.toBeInTheDocument();
    });

    it('should not show variant section when neither variantId nor variantDisplayName provided', () => {
      renderCartItem({ variantId: undefined }, { variantDisplayName: undefined });

      expect(screen.queryByText(/Variant:/)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Quantity Increase Functionality
  // ==========================================================================

  describe('quantity increase button works', () => {
    it('should call onUpdateQuantity with incremented value when increase button clicked', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ productId: 'prod-1', quantity: 3 }, { onUpdateQuantity });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      fireEvent.click(increaseButton);

      expect(onUpdateQuantity).toHaveBeenCalledTimes(1);
      expect(onUpdateQuantity).toHaveBeenCalledWith('prod-1', 4);
    });

    it('should increase from 1 to 2 correctly', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ productId: 'prod-1', quantity: 1 }, { onUpdateQuantity });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      fireEvent.click(increaseButton);

      expect(onUpdateQuantity).toHaveBeenCalledWith('prod-1', 2);
    });

    it('should not increase beyond maxQuantity', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ quantity: 10 }, { onUpdateQuantity, maxQuantity: 10 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toBeDisabled();

      fireEvent.click(increaseButton);
      expect(onUpdateQuantity).not.toHaveBeenCalled();
    });

    it('should not increase beyond available stock', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ quantity: 5 }, { onUpdateQuantity, stockLevel: 5 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Quantity Decrease Functionality
  // ==========================================================================

  describe('quantity decrease button works', () => {
    it('should call onUpdateQuantity with decremented value when decrease button clicked', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ productId: 'prod-1', quantity: 5 }, { onUpdateQuantity });

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      fireEvent.click(decreaseButton);

      expect(onUpdateQuantity).toHaveBeenCalledTimes(1);
      expect(onUpdateQuantity).toHaveBeenCalledWith('prod-1', 4);
    });

    it('should decrease from 10 to 9 correctly', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ productId: 'prod-1', quantity: 10 }, { onUpdateQuantity });

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      fireEvent.click(decreaseButton);

      expect(onUpdateQuantity).toHaveBeenCalledWith('prod-1', 9);
    });

    it('should decrease from 2 to 1 correctly', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ productId: 'prod-1', quantity: 2 }, { onUpdateQuantity });

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      fireEvent.click(decreaseButton);

      expect(onUpdateQuantity).toHaveBeenCalledWith('prod-1', 1);
    });
  });

  // ==========================================================================
  // Cannot Decrease Below 1
  // ==========================================================================

  describe('cannot decrease below 1', () => {
    it('should trigger remove flow when trying to decrease below 1 with confirmation', () => {
      renderCartItem({ quantity: 1 }, { showRemoveConfirmation: true });

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      fireEvent.click(decreaseButton);

      // Should show confirmation dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Remove this item?')).toBeInTheDocument();
    });

    it('should trigger remove flow when trying to decrease below 1 without confirmation', () => {
      const onRemove = jest.fn();
      renderCartItem({ productId: 'prod-1', quantity: 1 }, { showRemoveConfirmation: false, onRemove });

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      fireEvent.click(decreaseButton);

      // Should show undo state
      expect(screen.getByText(/Saying goodbye to/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('should not call onUpdateQuantity with 0 when decreasing from 1', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ quantity: 1 }, { onUpdateQuantity, showRemoveConfirmation: true });

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      fireEvent.click(decreaseButton);

      expect(onUpdateQuantity).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Remove Button with Confirmation
  // ==========================================================================

  describe('remove button shows confirmation when showRemoveConfirmation is true', () => {
    it('should show confirmation dialog when remove button clicked', () => {
      renderCartItem({ name: 'Test Product' }, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Remove this item?')).toBeInTheDocument();
      expect(screen.getByText(/Sure you want to remove Test Product/)).toBeInTheDocument();
    });

    it('should have Keep Item button in dialog', () => {
      renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      expect(screen.getByRole('button', { name: 'Nevermind, keep it' })).toBeInTheDocument();
    });

    it('should have Remove button in dialog', () => {
      renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Get the confirm remove button in the dialog
      expect(screen.getByRole('button', { name: 'Yes, remove it' })).toBeInTheDocument();
    });

    it('should call onRemove when Remove button clicked in dialog', () => {
      const onRemove = jest.fn();
      renderCartItem({ productId: 'prod-123' }, { showRemoveConfirmation: true, onRemove });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Click the Remove button in the dialog
      const dialogRemoveButton = screen.getByRole('button', { name: 'Yes, remove it' });
      fireEvent.click(dialogRemoveButton);

      expect(onRemove).toHaveBeenCalledWith('prod-123');
    });

    it('should close dialog when Keep Item button clicked', () => {
      renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const keepItemButton = screen.getByRole('button', { name: 'Nevermind, keep it' });
      fireEvent.click(keepItemButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close dialog when backdrop clicked', () => {
      const { container } = renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Find and click the backdrop
      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not call onRemove when dialog is cancelled', () => {
      const onRemove = jest.fn();
      renderCartItem({}, { showRemoveConfirmation: true, onRemove });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const keepItemButton = screen.getByRole('button', { name: 'Nevermind, keep it' });
      fireEvent.click(keepItemButton);

      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Direct Removal (No Confirmation)
  // ==========================================================================

  describe('direct removal when showRemoveConfirmation is false', () => {
    it('should show undo state when remove button clicked', () => {
      renderCartItem({ name: 'Coffee Beans' }, { showRemoveConfirmation: false });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      expect(screen.getByText(/Saying goodbye to Coffee Beans.../)).toBeInTheDocument();
    });

    it('should show Undo button when pending removal', () => {
      renderCartItem({}, { showRemoveConfirmation: false });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    it('should apply reduced opacity during pending removal', () => {
      const { container } = renderCartItem({}, { showRemoveConfirmation: false });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // The card should have opacity-50 class
      const card = container.querySelector('.opacity-50');
      expect(card).toBeInTheDocument();
    });

    it('should call onRemove after 5 seconds if not undone', () => {
      const onRemove = jest.fn();
      renderCartItem({ productId: 'prod-123' }, { showRemoveConfirmation: false, onRemove });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      expect(onRemove).not.toHaveBeenCalled();

      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onRemove).toHaveBeenCalledWith('prod-123');
    });

    it('should not call onRemove before 5 seconds', () => {
      const onRemove = jest.fn();
      renderCartItem({ productId: 'prod-123' }, { showRemoveConfirmation: false, onRemove });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Fast-forward 4.9 seconds
      act(() => {
        jest.advanceTimersByTime(4900);
      });

      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Undo Functionality
  // ==========================================================================

  describe('undo functionality works (5 second window)', () => {
    it('should restore item when Undo button clicked', () => {
      const onRemove = jest.fn();
      renderCartItem({ name: 'Premium Coffee' }, { showRemoveConfirmation: false, onRemove });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Undo before timeout
      const undoButton = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(undoButton);

      // Should show original item again (check for product name heading)
      expect(screen.getByRole('heading', { name: 'Premium Coffee' })).toBeInTheDocument();
    });

    it('should not call onRemove when Undo is clicked', () => {
      const onRemove = jest.fn();
      renderCartItem({ productId: 'prod-123' }, { showRemoveConfirmation: false, onRemove });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const undoButton = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(undoButton);

      // Fast-forward past 5 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(onRemove).not.toHaveBeenCalled();
    });

    it('should clear the timeout when Undo is clicked', () => {
      const onRemove = jest.fn();
      renderCartItem({ productId: 'prod-123' }, { showRemoveConfirmation: false, onRemove });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Wait 2 seconds, then undo
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      const undoButton = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(undoButton);

      // Fast-forward another 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should never have been called
      expect(onRemove).not.toHaveBeenCalled();
    });

    it('should allow re-removal after undo', () => {
      const onRemove = jest.fn();
      renderCartItem({ productId: 'prod-123' }, { showRemoveConfirmation: false, onRemove });

      // First removal attempt
      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Undo
      const undoButton = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(undoButton);

      // Second removal attempt
      const removeButtonAgain = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButtonAgain);

      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onRemove).toHaveBeenCalledWith('prod-123');
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Low Stock Warning
  // ==========================================================================

  describe('low stock warning appears when stockLevel is low', () => {
    it('should show low stock warning when stockLevel is 5 or less', () => {
      renderCartItem({}, { stockLevel: 5 });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Hurry! Only 5 left/)).toBeInTheDocument();
    });

    it('should show low stock warning when stockLevel is 1', () => {
      renderCartItem({}, { stockLevel: 1 });

      expect(screen.getByText(/Hurry! Only 1 left/)).toBeInTheDocument();
    });

    it('should show low stock warning when stockLevel is 3', () => {
      renderCartItem({}, { stockLevel: 3 });

      expect(screen.getByText(/Hurry! Only 3 left/)).toBeInTheDocument();
    });

    it('should not show low stock warning when stockLevel is above 5', () => {
      renderCartItem({}, { stockLevel: 10 });

      expect(screen.queryByText(/Hurry! Only \d+ left/)).not.toBeInTheDocument();
    });

    it('should not show low stock warning when stockLevel is undefined', () => {
      renderCartItem({}, { stockLevel: undefined });

      expect(screen.queryByText(/Hurry! Only \d+ left/)).not.toBeInTheDocument();
    });

    it('should show out of stock warning when stockLevel is 0', () => {
      renderCartItem({}, { stockLevel: 0 });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Sold out - check back soon/)).toBeInTheDocument();
    });

    it('should disable increase button when out of stock', () => {
      renderCartItem({}, { stockLevel: 0 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toBeDisabled();
    });

    it('should have warning icon in low stock alert', () => {
      const { container } = renderCartItem({}, { stockLevel: 3 });

      // Find the warning icon (ExclamationTriangleIcon)
      const icon = container.querySelector('.text-amber-600');
      expect(icon).toBeInTheDocument();
    });

    it('should have error icon in out of stock alert', () => {
      const { container } = renderCartItem({}, { stockLevel: 0 });

      // Find the error icon (ExclamationTriangleIcon with red color)
      const icon = container.querySelector('.text-red-600');
      expect(icon).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Max Quantity Enforcement
  // ==========================================================================

  describe('max quantity enforcement', () => {
    it('should disable increase button when quantity equals maxQuantity', () => {
      renderCartItem({ quantity: 99 }, { maxQuantity: 99 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toBeDisabled();
    });

    it('should use default maxQuantity of 99', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ quantity: 98 }, { onUpdateQuantity });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).not.toBeDisabled();

      fireEvent.click(increaseButton);
      expect(onUpdateQuantity).toHaveBeenCalledWith('prod-123', 99);
    });

    it('should respect custom maxQuantity', () => {
      renderCartItem({ quantity: 5 }, { maxQuantity: 5 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toBeDisabled();
    });

    it('should allow increase when below maxQuantity', () => {
      const onUpdateQuantity = jest.fn();
      renderCartItem({ quantity: 4 }, { onUpdateQuantity, maxQuantity: 10 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).not.toBeDisabled();

      fireEvent.click(increaseButton);
      expect(onUpdateQuantity).toHaveBeenCalled();
    });

    it('should prioritize stockLevel over maxQuantity when stockLevel is lower', () => {
      renderCartItem({ quantity: 3 }, { stockLevel: 3, maxQuantity: 10 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toBeDisabled();
    });

    it('should prioritize maxQuantity over stockLevel when maxQuantity is lower', () => {
      renderCartItem({ quantity: 5 }, { stockLevel: 10, maxQuantity: 5 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Touch Targets (44px minimum)
  // ==========================================================================

  describe('touch targets are 44px minimum', () => {
    it('should have 44px minimum height on decrease button', () => {
      renderCartItem();

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      expect(decreaseButton).toHaveClass('min-h-[44px]');
    });

    it('should have 44px minimum height on increase button', () => {
      renderCartItem();

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toHaveClass('min-h-[44px]');
    });

    it('should have 44px minimum width on decrease button', () => {
      renderCartItem();

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      expect(decreaseButton).toHaveClass('min-w-[44px]');
    });

    it('should have 44px minimum width on increase button', () => {
      renderCartItem();

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toHaveClass('min-w-[44px]');
    });

    it('should have 44px minimum dimensions on remove button', () => {
      renderCartItem();

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      expect(removeButton).toHaveClass('min-w-[44px]');
      expect(removeButton).toHaveClass('min-h-[44px]');
    });

    it('should have 44px minimum height on Undo button', () => {
      renderCartItem({}, { showRemoveConfirmation: false });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const undoButton = screen.getByRole('button', { name: 'Undo' });
      expect(undoButton).toHaveClass('min-h-[44px]');
    });

    it('should have 44px minimum height on dialog buttons', () => {
      renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const keepItemButton = screen.getByRole('button', { name: 'Nevermind, keep it' });
      const confirmRemoveButton = screen.getByRole('button', { name: 'Yes, remove it' });

      expect(keepItemButton).toHaveClass('min-h-[44px]');
      expect(confirmRemoveButton).toHaveClass('min-h-[44px]');
    });

    it('should have touch-manipulation class on quantity buttons', () => {
      renderCartItem();

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });

      expect(decreaseButton).toHaveClass('touch-manipulation');
      expect(increaseButton).toHaveClass('touch-manipulation');
    });

    it('should have touch-manipulation class on remove button', () => {
      renderCartItem();

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      expect(removeButton).toHaveClass('touch-manipulation');
    });
  });

  // ==========================================================================
  // Accessibility (aria-labels on buttons)
  // ==========================================================================

  describe('accessibility (aria-labels on buttons)', () => {
    it('should have aria-label on decrease button', () => {
      renderCartItem();

      const decreaseButton = screen.getByRole('button', { name: 'Decrease quantity' });
      expect(decreaseButton).toHaveAttribute('aria-label', 'Decrease quantity');
    });

    it('should have aria-label on increase button', () => {
      renderCartItem();

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton).toHaveAttribute('aria-label', 'Increase quantity');
    });

    it('should have aria-label on remove button that includes product name', () => {
      renderCartItem({ name: 'Organic Coffee' });

      const removeButton = screen.getByRole('button', { name: 'Remove Organic Coffee from cart' });
      expect(removeButton).toHaveAttribute('aria-label', 'Remove Organic Coffee from cart');
    });

    it('should have aria-live on quantity display', () => {
      renderCartItem({ quantity: 3 });

      const quantityDisplay = screen.getByLabelText('Quantity: 3');
      expect(quantityDisplay).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label on quantity display with correct value', () => {
      renderCartItem({ quantity: 7 });

      expect(screen.getByLabelText('Quantity: 7')).toBeInTheDocument();
    });

    it('should have role="group" on quantity controls', () => {
      renderCartItem({ name: 'Test Product' });

      const quantityGroup = screen.getByRole('group', { name: 'Quantity for Test Product' });
      expect(quantityGroup).toBeInTheDocument();
    });

    it('should have aria-modal on confirmation dialog', () => {
      renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby on confirmation dialog', () => {
      renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'remove-dialog-title');
    });

    it('should have proper heading in dialog with id for aria-labelledby', () => {
      renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      const dialogTitle = screen.getByText('Remove this item?');
      expect(dialogTitle).toHaveAttribute('id', 'remove-dialog-title');
    });

    it('should have role="alert" on low stock warning', () => {
      renderCartItem({}, { stockLevel: 3 });

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have role="alert" on out of stock warning', () => {
      renderCartItem({}, { stockLevel: 0 });

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = renderCartItem({}, { stockLevel: 3 });

      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have aria-label on line total', () => {
      renderCartItem({ price: 25.00, quantity: 2 });

      expect(screen.getByLabelText('Line total: $50.00')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Custom Currency Formatter
  // ==========================================================================

  describe('custom currency formatter', () => {
    it('should use custom formatCurrency function for line total', () => {
      const customFormatter = (amount: number) => `EUR ${amount.toFixed(2)}`;
      renderCartItem({ price: 30.00, quantity: 2 }, { formatCurrency: customFormatter });

      expect(screen.getByText('EUR 60.00')).toBeInTheDocument();
    });

    it('should use custom formatCurrency function for unit price', () => {
      const customFormatter = (amount: number) => `GBP ${amount.toFixed(2)}`;
      renderCartItem({ price: 15.00, quantity: 3 }, { formatCurrency: customFormatter });

      expect(screen.getByText('GBP 15.00 each')).toBeInTheDocument();
    });

    it('should use default USD formatter when formatCurrency is not provided', () => {
      renderCartItem({ price: 99.99, quantity: 1 });

      expect(screen.getByText('$99.99')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle very long product names gracefully', () => {
      const longName = 'This is a very long product name that should be truncated or handled appropriately by the component';
      renderCartItem({ name: longName });

      expect(screen.getByText(longName)).toBeInTheDocument();
      // The component should have line-clamp-2 class for truncation
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('line-clamp-2');
    });

    it('should handle zero price', () => {
      renderCartItem({ price: 0, quantity: 1 });

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should handle large quantities', () => {
      renderCartItem({ quantity: 99, price: 10 });

      expect(screen.getByLabelText('Quantity: 99')).toHaveTextContent('99');
      expect(screen.getByLabelText('Line total: $990.00')).toBeInTheDocument();
    });

    it('should handle decimal prices correctly', () => {
      renderCartItem({ price: 19.99, quantity: 3 });

      // $19.99 * 3 = $59.97
      expect(screen.getByLabelText('Line total: $59.97')).toBeInTheDocument();
    });

    it('should not show Remove dialog if showRemoveConfirmation changes after click', async () => {
      const { rerender } = renderCartItem({}, { showRemoveConfirmation: true });

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      fireEvent.click(removeButton);

      // Dialog should be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Rerender with showRemoveConfirmation: false should not affect current dialog
      rerender(
        <CartItem
          item={createCartItem()}
          {...defaultProps}
          showRemoveConfirmation={false}
        />
      );

      // Dialog should still be visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // CSS Classes Integrity
  // ==========================================================================

  describe('CSS classes integrity', () => {
    it('should have card styling classes on main container', () => {
      const { container } = renderCartItem();

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('shadow-sm');
      expect(card.className).toContain('border');
    });

    it('should have responsive padding on card', () => {
      const { container } = renderCartItem();

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-4');
      expect(card.className).toContain('sm:p-6');
    });

    it('should have disabled styling on disabled buttons', () => {
      renderCartItem({ quantity: 99 }, { maxQuantity: 99 });

      const increaseButton = screen.getByRole('button', { name: 'Increase quantity' });
      expect(increaseButton.className).toContain('disabled:opacity-50');
      expect(increaseButton.className).toContain('disabled:cursor-not-allowed');
    });

    it('should have hover styling on remove button', () => {
      renderCartItem();

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      expect(removeButton.className).toContain('hover:text-red-500');
      expect(removeButton.className).toContain('hover:bg-red-50');
    });

    it('should have transition classes on buttons', () => {
      renderCartItem();

      const removeButton = screen.getByRole('button', { name: /Remove .* from cart/ });
      expect(removeButton.className).toContain('transition-colors');
    });
  });
});
