import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartUpsell, UpsellProduct } from './landing-page-cart-upsell';

// ============================================================================
// Mock LandingPageContext
// ============================================================================

const mockAddToCart = jest.fn().mockResolvedValue(undefined);
const mockTrackEvent = jest.fn();
const mockLocalCart: Array<{ productId: string; name: string; price: number; quantity: number }> = [];

jest.mock('@/contexts/landing-page-context', () => ({
  useLandingPage: () => ({
    addToCart: mockAddToCart,
    trackEvent: mockTrackEvent,
    localCart: mockLocalCart,
  }),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockProducts: UpsellProduct[] = [
  {
    id: 'prod-1',
    name: 'Coffee Beans',
    price: 19.99,
    originalPrice: 24.99,
    imageUrl: 'https://example.com/coffee.jpg',
    description: 'Premium roasted beans',
  },
  {
    id: 'prod-2',
    name: 'Coffee Mug',
    price: 12.99,
    imageUrl: 'https://example.com/mug.jpg',
  },
  {
    id: 'prod-3',
    name: 'Coffee Grinder',
    price: 49.99,
    originalPrice: 59.99,
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('CartUpsell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalCart.length = 0;
  });

  // -------------------------------------------------------------------------
  // Rendering Tests
  // -------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders upsell products', () => {
      render(<CartUpsell products={mockProducts} />);

      expect(screen.getByText('Coffee Beans')).toBeInTheDocument();
      expect(screen.getByText('Coffee Mug')).toBeInTheDocument();
      expect(screen.getByText('Coffee Grinder')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(<CartUpsell products={mockProducts} title="Recommended for you" />);

      expect(screen.getByText('Recommended for you')).toBeInTheDocument();
    });

    it('renders with subtitle', () => {
      render(<CartUpsell products={mockProducts} subtitle="Free shipping on orders over $50" />);

      expect(screen.getByText('Free shipping on orders over $50')).toBeInTheDocument();
    });

    it('limits displayed products to maxProducts', () => {
      render(<CartUpsell products={mockProducts} maxProducts={2} />);

      expect(screen.getByText('Coffee Beans')).toBeInTheDocument();
      expect(screen.getByText('Coffee Mug')).toBeInTheDocument();
      expect(screen.queryByText('Coffee Grinder')).not.toBeInTheDocument();
    });

    it('does not render when no products', () => {
      const { container } = render(<CartUpsell products={[]} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  // -------------------------------------------------------------------------
  // Cart Integration Tests
  // -------------------------------------------------------------------------

  describe('Cart Integration', () => {
    it('filters out products already in cart', () => {
      mockLocalCart.push({ productId: 'prod-1', name: 'Coffee Beans', price: 19.99, quantity: 1 });

      render(<CartUpsell products={mockProducts} />);

      expect(screen.queryByText('Coffee Beans')).not.toBeInTheDocument();
      expect(screen.getByText('Coffee Mug')).toBeInTheDocument();
    });

    it('returns null when all products are in cart', () => {
      mockLocalCart.push(
        { productId: 'prod-1', name: 'Coffee Beans', price: 19.99, quantity: 1 },
        { productId: 'prod-2', name: 'Coffee Mug', price: 12.99, quantity: 1 },
        { productId: 'prod-3', name: 'Coffee Grinder', price: 49.99, quantity: 1 }
      );

      const { container } = render(<CartUpsell products={mockProducts} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  // -------------------------------------------------------------------------
  // Add to Cart Tests
  // -------------------------------------------------------------------------

  describe('Add to Cart', () => {
    it('calls addToCart when Add button is clicked', async () => {
      render(<CartUpsell products={mockProducts} />);

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(mockAddToCart).toHaveBeenCalledWith(
          'prod-1',
          1,
          undefined,
          { price: 19.99, name: 'Coffee Beans', imageUrl: 'https://example.com/coffee.jpg' }
        );
      });
    });

    it('tracks upsell event when product is added', async () => {
      render(<CartUpsell products={mockProducts} />);

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('UPSELL_ADDED', {
          productId: 'prod-1',
          productName: 'Coffee Beans',
          price: 19.99,
          source: 'cart_drawer',
        });
      });
    });

    it('calls onProductAdd callback', async () => {
      const onProductAdd = jest.fn();
      render(<CartUpsell products={mockProducts} onProductAdd={onProductAdd} />);

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(onProductAdd).toHaveBeenCalledWith(mockProducts[0]);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Pricing Display Tests
  // -------------------------------------------------------------------------

  describe('Pricing Display', () => {
    it('displays current price', () => {
      render(<CartUpsell products={mockProducts} />);

      expect(screen.getByText('$19.99')).toBeInTheDocument();
    });

    it('displays original price and discount when available', () => {
      render(<CartUpsell products={mockProducts} showDiscount={true} />);

      expect(screen.getByText('$24.99')).toBeInTheDocument();
      expect(screen.getByText('-20%')).toBeInTheDocument();
    });

    it('uses custom currency symbol', () => {
      render(<CartUpsell products={mockProducts} currencySymbol="€" />);

      expect(screen.getByText('€19.99')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has proper section labeling', () => {
      render(<CartUpsell products={mockProducts} />);

      expect(screen.getByRole('heading', { name: 'Complete your order' })).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      render(<CartUpsell products={mockProducts} />);

      expect(screen.getByRole('button', { name: /add coffee beans to cart/i })).toBeInTheDocument();
    });

    it('has article elements for each product', () => {
      render(<CartUpsell products={mockProducts} />);

      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Image Handling Tests
  // -------------------------------------------------------------------------

  describe('Image Handling', () => {
    it('displays product images when available', () => {
      render(<CartUpsell products={mockProducts} />);

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', 'https://example.com/coffee.jpg');
    });

    it('displays placeholder when image is missing', () => {
      const productsWithoutImages = [{ ...mockProducts[2], imageUrl: undefined }];
      render(<CartUpsell products={productsWithoutImages} />);

      // Should have SVG placeholder, not img
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});
