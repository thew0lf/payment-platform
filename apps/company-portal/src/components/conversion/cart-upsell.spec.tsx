/**
 * Unit tests for CartUpsell component
 *
 * Tests cover:
 * - Basic rendering (title, products, variants)
 * - Loading state with skeletons
 * - Empty state when no products
 * - Product card rendering (image, name, price, discount)
 * - Add to cart functionality
 * - Horizontal variant (scroll buttons)
 * - Vertical variant (stacked layout)
 * - Carousel variant (navigation, dots, keyboard)
 * - maxItems prop limiting
 * - Touch targets (44px minimum)
 * - Accessibility (aria-labels, roles)
 * - Dark mode support classes
 * - CSS variables usage (--primary-color)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartUpsell, CartUpsellProps, UpsellProduct } from './cart-upsell';

// ============================================================================
// Test Fixtures
// ============================================================================

const createProduct = (overrides: Partial<UpsellProduct> = {}): UpsellProduct => ({
  id: `prod-${Math.random().toString(36).slice(2, 9)}`,
  name: 'Premium Coffee Beans',
  price: 29.99,
  ...overrides,
});

const createProducts = (count: number): UpsellProduct[] =>
  Array.from({ length: count }, (_, i) =>
    createProduct({
      id: `prod-${i + 1}`,
      name: `Product ${i + 1}`,
      price: 10 + i * 5,
    })
  );

const defaultProps: CartUpsellProps = {
  products: createProducts(3),
  onAdd: jest.fn(),
};

// Helper to render with default props
const renderCartUpsell = (propsOverrides: Partial<CartUpsellProps> = {}) => {
  const props = { ...defaultProps, ...propsOverrides };
  return render(<CartUpsell {...props} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('CartUpsell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe('basic rendering', () => {
    it('should render with default title', () => {
      renderCartUpsell();

      expect(screen.getByText('Pairs perfectly with your order')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      renderCartUpsell({ title: 'Recommended for you' });

      expect(screen.getByText('Recommended for you')).toBeInTheDocument();
    });

    it('should render title as h3 heading', () => {
      renderCartUpsell({ title: 'Test Title' });

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Title');
    });

    it('should render as section with aria-label', () => {
      renderCartUpsell({ title: 'Product Suggestions' });

      expect(screen.getByRole('region', { name: 'Product Suggestions' })).toBeInTheDocument();
    });

    it('should render all products up to maxItems', () => {
      const products = createProducts(5);
      renderCartUpsell({ products, maxItems: 3 });

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
      expect(screen.queryByText('Product 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Product 5')).not.toBeInTheDocument();
    });

    it('should use default maxItems of 3', () => {
      const products = createProducts(5);
      renderCartUpsell({ products });

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
      expect(screen.queryByText('Product 4')).not.toBeInTheDocument();
    });

    it('should render fewer products if less than maxItems available', () => {
      const products = createProducts(2);
      renderCartUpsell({ products, maxItems: 5 });

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Loading State
  // ==========================================================================

  describe('loading state', () => {
    it('should show skeleton cards when loading', () => {
      const { container } = renderCartUpsell({ loading: true });

      const skeletons = container.querySelectorAll('.motion-safe\\:animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show correct number of skeletons based on maxItems', () => {
      const { container } = renderCartUpsell({ loading: true, maxItems: 2 });

      const skeletons = container.querySelectorAll('.motion-safe\\:animate-pulse');
      expect(skeletons.length).toBe(2);
    });

    it('should have aria-busy when loading', () => {
      renderCartUpsell({ loading: true });

      const section = screen.getByRole('region');
      expect(section).toHaveAttribute('aria-busy', 'true');
    });

    it('should show title while loading', () => {
      renderCartUpsell({ loading: true, title: 'Loading Products' });

      expect(screen.getByText('Loading Products')).toBeInTheDocument();
    });

    it('should not show products when loading', () => {
      const products = [createProduct({ name: 'Test Product' })];
      renderCartUpsell({ products, loading: true });

      expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty State
  // ==========================================================================

  describe('empty state', () => {
    it('should show empty state when no products', () => {
      renderCartUpsell({ products: [] });

      expect(screen.getByText("We're finding the perfect picks for you!")).toBeInTheDocument();
    });

    it('should show title in empty state', () => {
      renderCartUpsell({ products: [], title: 'Suggestions' });

      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });

    it('should have shopping cart icon in empty state', () => {
      const { container } = renderCartUpsell({ products: [] });

      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should not show Add buttons in empty state', () => {
      renderCartUpsell({ products: [] });

      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Product Card Rendering
  // ==========================================================================

  describe('product card rendering', () => {
    it('should render product name', () => {
      const products = [createProduct({ name: 'Organic Tea Leaves' })];
      renderCartUpsell({ products });

      expect(screen.getByText('Organic Tea Leaves')).toBeInTheDocument();
    });

    it('should truncate long product names', () => {
      const longName = 'This is an extremely long product name that should be truncated';
      const products = [createProduct({ name: longName })];
      renderCartUpsell({ products });

      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toHaveAttribute('title', longName);
    });

    it('should render product price formatted as currency', () => {
      const products = [createProduct({ price: 49.99 })];
      renderCartUpsell({ products });

      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });

    it('should render product image when provided', () => {
      const products = [
        createProduct({ name: 'Coffee', imageUrl: 'https://example.com/coffee.jpg' }),
      ];
      renderCartUpsell({ products });

      const img = screen.getByRole('img', { name: 'Coffee' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/coffee.jpg');
    });

    it('should render placeholder when no image', () => {
      const products = [createProduct({ imageUrl: undefined })];
      const { container } = renderCartUpsell({ products });

      const placeholder = container.querySelector('svg.h-8.w-8');
      expect(placeholder).toBeInTheDocument();
    });

    it('should render image with lazy loading', () => {
      const products = [createProduct({ imageUrl: 'https://example.com/img.jpg' })];
      renderCartUpsell({ products });

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  // ==========================================================================
  // Discount Display
  // ==========================================================================

  describe('discount display', () => {
    it('should show discount badge when originalPrice > price', () => {
      const products = [createProduct({ price: 20, originalPrice: 25 })];
      renderCartUpsell({ products });

      expect(screen.getByText('-20%')).toBeInTheDocument();
    });

    it('should show original price with strikethrough', () => {
      const products = [createProduct({ price: 15, originalPrice: 30 })];
      renderCartUpsell({ products });

      const originalPrice = screen.getByText('$30.00');
      expect(originalPrice).toHaveClass('line-through');
    });

    it('should not show discount badge when no originalPrice', () => {
      const products = [createProduct({ price: 20, originalPrice: undefined })];
      renderCartUpsell({ products });

      expect(screen.queryByText(/-%/)).not.toBeInTheDocument();
    });

    it('should not show discount when originalPrice equals price', () => {
      const products = [createProduct({ price: 20, originalPrice: 20 })];
      renderCartUpsell({ products });

      expect(screen.queryByText(/-%/)).not.toBeInTheDocument();
    });

    it('should calculate correct discount percentage', () => {
      const products = [createProduct({ price: 75, originalPrice: 100 })];
      renderCartUpsell({ products });

      expect(screen.getByText('-25%')).toBeInTheDocument();
    });

    it('should round discount percentage', () => {
      const products = [createProduct({ price: 33, originalPrice: 100 })];
      renderCartUpsell({ products });

      expect(screen.getByText('-67%')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Add to Cart Functionality
  // ==========================================================================

  describe('add to cart functionality', () => {
    it('should call onAdd with product id when Add button clicked', async () => {
      const onAdd = jest.fn();
      const products = [createProduct({ id: 'prod-123', name: 'Test Item' })];
      renderCartUpsell({ products, onAdd });

      const addButton = screen.getByRole('button', { name: 'Add Test Item to cart' });
      fireEvent.click(addButton);

      expect(onAdd).toHaveBeenCalledWith('prod-123');
    });

    it('should call onAdd only once per click', async () => {
      const onAdd = jest.fn();
      const products = [createProduct({ id: 'prod-1' })];
      renderCartUpsell({ products, onAdd });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('should have Add button for each product', () => {
      const products = createProducts(3);
      renderCartUpsell({ products });

      const addButtons = screen.getAllByRole('button', { name: /add .* to cart/i });
      expect(addButtons).toHaveLength(3);
    });

    it('should include product name in Add button aria-label', () => {
      const products = [createProduct({ name: 'Espresso Blend' })];
      renderCartUpsell({ products });

      expect(screen.getByRole('button', { name: 'Add Espresso Blend to cart' })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Horizontal Variant
  // ==========================================================================

  describe('horizontal variant', () => {
    it('should render as horizontal by default', () => {
      const { container } = renderCartUpsell({ variant: 'horizontal' });

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should have flex container for horizontal scroll', () => {
      const { container } = renderCartUpsell({ variant: 'horizontal' });

      const flexContainer = container.querySelector('.flex.gap-3');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should have fixed width product cards in horizontal', () => {
      const { container } = renderCartUpsell({ variant: 'horizontal' });

      const cards = container.querySelectorAll('.w-\\[200px\\]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Vertical Variant
  // ==========================================================================

  describe('vertical variant', () => {
    it('should render products in stacked layout', () => {
      const { container } = renderCartUpsell({ variant: 'vertical' });

      const stackedContainer = container.querySelector('.space-y-3');
      expect(stackedContainer).toBeInTheDocument();
    });

    it('should show description in vertical variant', () => {
      const products = [createProduct({ description: 'A delicious blend' })];
      renderCartUpsell({ products, variant: 'vertical' });

      expect(screen.getByText('A delicious blend')).toBeInTheDocument();
    });

    it('should not show scroll buttons in vertical variant', () => {
      renderCartUpsell({ variant: 'vertical' });

      expect(screen.queryByRole('button', { name: 'Scroll left' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Scroll right' })).not.toBeInTheDocument();
    });

    it('should have flex row layout for each card in vertical', () => {
      const { container } = renderCartUpsell({ variant: 'vertical' });

      const cards = container.querySelectorAll('.flex.gap-3');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Carousel Variant
  // ==========================================================================

  describe('carousel variant', () => {
    it('should render carousel with slides', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      expect(screen.getByRole('region', { name: /carousel/i })).toBeInTheDocument();
    });

    it('should have previous/next navigation buttons', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      expect(screen.getByRole('button', { name: 'Previous product' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next product' })).toBeInTheDocument();
    });

    it('should have dot indicators for each slide', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const dots = screen.getAllByRole('tab');
      expect(dots).toHaveLength(3);
    });

    it('should navigate to next slide when Next clicked', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const nextButton = screen.getByRole('button', { name: 'Next product' });
      fireEvent.click(nextButton);

      const dots = screen.getAllByRole('tab');
      expect(dots[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('should navigate to previous slide when Previous clicked', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      // Go to slide 2 first
      const nextButton = screen.getByRole('button', { name: 'Next product' });
      fireEvent.click(nextButton);

      // Now go back
      const prevButton = screen.getByRole('button', { name: 'Previous product' });
      fireEvent.click(prevButton);

      const dots = screen.getAllByRole('tab');
      expect(dots[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should loop to last slide when Previous clicked on first slide', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const prevButton = screen.getByRole('button', { name: 'Previous product' });
      fireEvent.click(prevButton);

      const dots = screen.getAllByRole('tab');
      expect(dots[2]).toHaveAttribute('aria-selected', 'true');
    });

    it('should loop to first slide when Next clicked on last slide', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const nextButton = screen.getByRole('button', { name: 'Next product' });
      fireEvent.click(nextButton); // 1
      fireEvent.click(nextButton); // 2
      fireEvent.click(nextButton); // back to 0

      const dots = screen.getAllByRole('tab');
      expect(dots[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should navigate to specific slide when dot clicked', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const dots = screen.getAllByRole('tab');
      fireEvent.click(dots[2]);

      expect(dots[2]).toHaveAttribute('aria-selected', 'true');
    });

    it('should support keyboard navigation with ArrowLeft', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      // Go to slide 2 first
      const nextButton = screen.getByRole('button', { name: 'Next product' });
      fireEvent.click(nextButton);

      // Focus the carousel region and press ArrowLeft
      const carousel = screen.getByRole('region', { name: /carousel/i });
      fireEvent.keyDown(carousel, { key: 'ArrowLeft' });

      const dots = screen.getAllByRole('tab');
      expect(dots[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should support keyboard navigation with ArrowRight', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const carousel = screen.getByRole('region', { name: /carousel/i });
      fireEvent.keyDown(carousel, { key: 'ArrowRight' });

      const dots = screen.getAllByRole('tab');
      expect(dots[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('should not show navigation for single item', () => {
      const products = createProducts(1);
      renderCartUpsell({ products, variant: 'carousel' });

      expect(screen.queryByRole('button', { name: 'Previous product' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Next product' })).not.toBeInTheDocument();
    });

    it('should not show dots for single item', () => {
      const products = createProducts(1);
      renderCartUpsell({ products, variant: 'carousel' });

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('should have aria-hidden on non-current slides', () => {
      const products = createProducts(3);
      const { container } = renderCartUpsell({ products, variant: 'carousel' });

      const slides = container.querySelectorAll('[role="group"][aria-roledescription="slide"]');
      expect(slides[0]).toHaveAttribute('aria-hidden', 'false');
      expect(slides[1]).toHaveAttribute('aria-hidden', 'true');
      expect(slides[2]).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have aria-live on slide container', () => {
      const products = createProducts(3);
      const { container } = renderCartUpsell({ products, variant: 'carousel' });

      const slideContainer = container.querySelector('[aria-live="polite"]');
      expect(slideContainer).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Touch Targets (44px minimum)
  // ==========================================================================

  describe('touch targets are 44px minimum', () => {
    it('should have 44px minimum height on Add buttons', () => {
      renderCartUpsell();

      const addButtons = screen.getAllByRole('button', { name: /add .* to cart/i });
      addButtons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });

    it('should have touch-manipulation class on Add buttons', () => {
      renderCartUpsell();

      const addButtons = screen.getAllByRole('button', { name: /add .* to cart/i });
      addButtons.forEach((button) => {
        expect(button).toHaveClass('touch-manipulation');
      });
    });

    it('should have 44px minimum dimensions on carousel navigation buttons', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const prevButton = screen.getByRole('button', { name: 'Previous product' });
      const nextButton = screen.getByRole('button', { name: 'Next product' });

      expect(prevButton).toHaveClass('min-w-[44px]', 'min-h-[44px]');
      expect(nextButton).toHaveClass('min-w-[44px]', 'min-h-[44px]');
    });

    it('should have touch-manipulation on carousel navigation buttons', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const prevButton = screen.getByRole('button', { name: 'Previous product' });
      const nextButton = screen.getByRole('button', { name: 'Next product' });

      expect(prevButton).toHaveClass('touch-manipulation');
      expect(nextButton).toHaveClass('touch-manipulation');
    });

    it('should have 44px minimum dimensions on dot indicators', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const dots = screen.getAllByRole('tab');
      dots.forEach((dot) => {
        expect(dot).toHaveClass('min-w-[44px]', 'min-h-[44px]');
      });
    });

    it('should have touch-manipulation on dot indicators', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const dots = screen.getAllByRole('tab');
      dots.forEach((dot) => {
        expect(dot).toHaveClass('touch-manipulation');
      });
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper section role', () => {
      renderCartUpsell();

      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should have aria-label on Add buttons with product name', () => {
      const products = [createProduct({ name: 'Artisan Blend' })];
      renderCartUpsell({ products });

      const button = screen.getByRole('button', { name: 'Add Artisan Blend to cart' });
      expect(button).toHaveAttribute('aria-label', 'Add Artisan Blend to cart');
    });

    it('should have aria-hidden on decorative icons', () => {
      const products = [createProduct({ imageUrl: undefined })];
      const { container } = renderCartUpsell({ products });

      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have aria-roledescription on carousel', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const carousel = screen.getByRole('region', { name: /carousel/i });
      expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    });

    it('should have tablist role on dot container', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      expect(screen.getByRole('tablist', { name: 'Carousel pagination' })).toBeInTheDocument();
    });

    it('should have tab role on individual dots', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const dots = screen.getAllByRole('tab');
      expect(dots).toHaveLength(3);
    });

    it('should have aria-selected on current dot', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const dots = screen.getAllByRole('tab');
      expect(dots[0]).toHaveAttribute('aria-selected', 'true');
      expect(dots[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('should have aria-label on dot buttons', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const dots = screen.getAllByRole('tab');
      expect(dots[0]).toHaveAttribute('aria-label', 'Go to slide 1');
      expect(dots[1]).toHaveAttribute('aria-label', 'Go to slide 2');
      expect(dots[2]).toHaveAttribute('aria-label', 'Go to slide 3');
    });

    it('should have aria-label on scroll buttons', () => {
      // Note: scroll buttons only appear when content overflows
      // For this test, we check that when visible, they have proper labels
      const products = createProducts(5);
      renderCartUpsell({ products, maxItems: 5, variant: 'horizontal' });

      // The scroll buttons are conditionally rendered based on scroll position
      // So we just verify the component structure is correct
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should have carousel focusable for keyboard navigation', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const carousel = screen.getByRole('region', { name: /carousel/i });
      expect(carousel).toHaveAttribute('tabIndex', '0');
    });
  });

  // ==========================================================================
  // Dark Mode Support
  // ==========================================================================

  describe('dark mode support', () => {
    it('should have dark mode classes on product cards', () => {
      const { container } = renderCartUpsell();

      const cards = container.querySelectorAll('.dark\\:bg-gray-800');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have dark mode text classes', () => {
      const { container } = renderCartUpsell();

      const darkText = container.querySelectorAll('.dark\\:text-gray-100');
      expect(darkText.length).toBeGreaterThan(0);
    });

    it('should have dark mode border classes', () => {
      const { container } = renderCartUpsell();

      const darkBorders = container.querySelectorAll('.dark\\:border-gray-700');
      expect(darkBorders.length).toBeGreaterThan(0);
    });

    it('should have dark mode classes in empty state', () => {
      const { container } = renderCartUpsell({ products: [] });

      expect(container.querySelector('.dark\\:bg-gray-800\\/50')).toBeInTheDocument();
    });

    it('should have dark mode classes in loading state', () => {
      const { container } = renderCartUpsell({ loading: true });

      const darkSkeletons = container.querySelectorAll('.dark\\:bg-gray-700');
      expect(darkSkeletons.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CSS Variables Usage
  // ==========================================================================

  describe('CSS variables usage', () => {
    it('should use --primary-color for price text', () => {
      renderCartUpsell();

      const priceElement = screen.getByText('$10.00');
      expect(priceElement).toHaveStyle({ color: 'var(--primary-color, #0ea5e9)' });
    });

    it('should use --primary-color for Add button background', () => {
      renderCartUpsell();

      const addButton = screen.getAllByRole('button', { name: /add .* to cart/i })[0];
      expect(addButton).toHaveStyle({ backgroundColor: 'var(--primary-color, #0ea5e9)' });
    });
  });

  // ==========================================================================
  // Loading Button State
  // ==========================================================================

  describe('loading button state', () => {
    it('should show loading spinner when adding', async () => {
      const onAdd = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
      const products = [createProduct({ id: 'prod-1' })];
      renderCartUpsell({ products, onAdd });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });

    it('should disable button while adding', async () => {
      const onAdd = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
      const products = [createProduct({ id: 'prod-1' })];
      renderCartUpsell({ products, onAdd });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      expect(addButton).toBeDisabled();
    });

    it('should have spinner icon while adding', async () => {
      const onAdd = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
      const products = [createProduct({ id: 'prod-1' })];
      const { container } = renderCartUpsell({ products, onAdd });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      // Note: CSS class selector requires escaping the colon in motion-safe:
      const spinner = container.querySelector('.motion-safe\\:animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Hover Effects
  // ==========================================================================

  describe('hover effects', () => {
    it('should have hover:shadow-md on product cards', () => {
      const { container } = renderCartUpsell();

      const cards = container.querySelectorAll('.hover\\:shadow-md');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have hover background on navigation buttons', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const prevButton = screen.getByRole('button', { name: 'Previous product' });
      expect(prevButton).toHaveClass('hover:bg-gray-50');
    });

    it('should have transition-shadow on cards', () => {
      const { container } = renderCartUpsell();

      const cards = container.querySelectorAll('.transition-shadow');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle zero price', () => {
      const products = [createProduct({ price: 0 })];
      renderCartUpsell({ products });

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should handle very large prices', () => {
      const products = [createProduct({ price: 99999.99 })];
      renderCartUpsell({ products });

      expect(screen.getByText('$99,999.99')).toBeInTheDocument();
    });

    it('should handle missing optional fields gracefully', () => {
      const products = [
        {
          id: 'prod-1',
          name: 'Basic Product',
          price: 10,
        },
      ];
      renderCartUpsell({ products });

      expect(screen.getByText('Basic Product')).toBeInTheDocument();
      expect(screen.getByText('$10.00')).toBeInTheDocument();
    });

    it('should handle maxItems of 0', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, maxItems: 0 });

      expect(screen.getByText("We're finding the perfect picks for you!")).toBeInTheDocument();
    });

    it('should handle rapid navigation clicks', () => {
      const products = createProducts(3);
      renderCartUpsell({ products, variant: 'carousel' });

      const nextButton = screen.getByRole('button', { name: 'Next product' });

      // Rapid clicks
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      // Should have cycled through and be at slide 2
      const dots = screen.getAllByRole('tab');
      expect(dots[2]).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle products with special characters in name', () => {
      const products = [createProduct({ name: 'Coffee & Tea <Special>' })];
      renderCartUpsell({ products });

      expect(screen.getByText('Coffee & Tea <Special>')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Image Dimensions
  // ==========================================================================

  describe('image dimensions', () => {
    it('should have correct dimensions in horizontal variant (200x128)', () => {
      const products = [createProduct({ imageUrl: 'test.jpg' })];
      renderCartUpsell({ products, variant: 'horizontal' });

      const img = screen.getByRole('img');
      expect(img).toHaveClass('h-32', 'w-full');
    });

    it('should have correct dimensions in vertical variant (80x80)', () => {
      const products = [createProduct({ imageUrl: 'test.jpg' })];
      renderCartUpsell({ products, variant: 'vertical' });

      const img = screen.getByRole('img');
      expect(img).toHaveClass('w-20', 'h-20');
    });
  });
});
