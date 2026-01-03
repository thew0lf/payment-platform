import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { PostPurchaseUpsell, PostPurchaseProduct } from './landing-page-post-purchase-upsell';

// ============================================================================
// Mock LandingPageContext
// ============================================================================

const mockTrackEvent = jest.fn();

jest.mock('@/contexts/landing-page-context', () => ({
  useLandingPage: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockProduct: PostPurchaseProduct = {
  id: 'upsell-1',
  name: 'Premium Coffee Subscription',
  price: 29.99,
  originalPrice: 39.99,
  imageUrl: 'https://example.com/subscription.jpg',
  description: 'Get fresh coffee delivered monthly. Cancel anytime.',
  urgencyMessage: 'Only 5 spots left at this price!',
};

const mockOrderId = 'order-123';

// ============================================================================
// Tests
// ============================================================================

describe('PostPurchaseUpsell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Rendering Tests
  // -------------------------------------------------------------------------

  describe('Rendering', () => {
    it('renders the upsell offer', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(screen.getByText('Premium Coffee Subscription')).toBeInTheDocument();
      expect(screen.getByText(/Get fresh coffee delivered monthly/)).toBeInTheDocument();
    });

    it('renders with custom title and subtitle', () => {
      render(
        <PostPurchaseUpsell
          product={mockProduct}
          orderId={mockOrderId}
          title="Exclusive Offer!"
          subtitle="Available for the next 5 minutes only"
        />
      );

      expect(screen.getByText('Exclusive Offer!')).toBeInTheDocument();
      expect(screen.getByText('Available for the next 5 minutes only')).toBeInTheDocument();
    });

    it('renders product image', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      const image = screen.getByRole('img', { name: mockProduct.name });
      expect(image).toHaveAttribute('src', mockProduct.imageUrl);
    });

    it('renders placeholder when image is missing', () => {
      const productWithoutImage = { ...mockProduct, imageUrl: undefined };
      render(<PostPurchaseUpsell product={productWithoutImage} orderId={mockOrderId} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('displays urgency message', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(screen.getByText('Only 5 spots left at this price!')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Pricing Tests
  // -------------------------------------------------------------------------

  describe('Pricing Display', () => {
    it('displays current price', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });

    it('displays original price with line-through', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(screen.getByText('$39.99')).toBeInTheDocument();
    });

    it('displays savings amount', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(screen.getByText(/Save \$10.00/)).toBeInTheDocument();
    });

    it('calculates discount price correctly', () => {
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} discountPercent={50} />
      );

      // 50% off $29.99 = $14.995, toFixed(2) = "14.99"
      expect(screen.getByText('$14.99')).toBeInTheDocument();
    });

    it('uses custom currency symbol', () => {
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} currencySymbol="€" />
      );

      expect(screen.getByText('€29.99')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Timer Tests
  // -------------------------------------------------------------------------

  describe('Timer', () => {
    it('displays countdown timer when offerTimeLimit is set', () => {
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} offerTimeLimit={300} />
      );

      expect(screen.getByText(/Offer expires in 5:00/)).toBeInTheDocument();
    });

    it('counts down the timer', () => {
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} offerTimeLimit={10} />
      );

      expect(screen.getByText(/0:10/)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText(/0:05/)).toBeInTheDocument();
    });

    it('hides component when timer expires', async () => {
      const onTimerExpire = jest.fn();
      render(
        <PostPurchaseUpsell
          product={mockProduct}
          orderId={mockOrderId}
          offerTimeLimit={2}
          onTimerExpire={onTimerExpire}
        />
      );

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Premium Coffee Subscription')).not.toBeInTheDocument();
      });

      expect(onTimerExpire).toHaveBeenCalled();
    });

    it('tracks expiry event', async () => {
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} offerTimeLimit={1} />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('POST_PURCHASE_UPSELL_EXPIRED', {
          productId: 'upsell-1',
          orderId: 'order-123',
        });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Interaction Tests
  // -------------------------------------------------------------------------

  describe('Interactions', () => {
    it('calls onAccept when accept button is clicked', async () => {
      const onAccept = jest.fn().mockResolvedValue(undefined);
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} onAccept={onAccept} />
      );

      const acceptButton = screen.getByRole('button', { name: /yes, add to my order/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(onAccept).toHaveBeenCalledWith(mockProduct);
      });
    });

    it('calls onDecline when decline button is clicked', () => {
      const onDecline = jest.fn();
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} onDecline={onDecline} />
      );

      const declineButton = screen.getByRole('button', { name: /no thanks/i });
      fireEvent.click(declineButton);

      expect(onDecline).toHaveBeenCalled();
    });

    it('hides component after accepting', async () => {
      const onAccept = jest.fn().mockResolvedValue(undefined);
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} onAccept={onAccept} />
      );

      const acceptButton = screen.getByRole('button', { name: /yes, add to my order/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.queryByText('Premium Coffee Subscription')).not.toBeInTheDocument();
      });
    });

    it('hides component after declining', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      const declineButton = screen.getByRole('button', { name: /no thanks/i });
      fireEvent.click(declineButton);

      expect(screen.queryByText('Premium Coffee Subscription')).not.toBeInTheDocument();
    });

    it('shows loading state while processing', async () => {
      const onAccept = jest.fn(
        (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1000))
      );
      render(
        <PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} onAccept={onAccept} />
      );

      const acceptButton = screen.getByRole('button', { name: /yes, add to my order/i });
      fireEvent.click(acceptButton);

      expect(screen.getByText(/adding to order/i)).toBeInTheDocument();
      expect(acceptButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  // -------------------------------------------------------------------------
  // Analytics Tests
  // -------------------------------------------------------------------------

  describe('Analytics', () => {
    it('tracks impression on mount', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('POST_PURCHASE_UPSELL_SHOWN', {
        productId: 'upsell-1',
        productName: 'Premium Coffee Subscription',
        orderId: 'order-123',
        discountPercent: undefined,
        offerTimeLimit: undefined,
      });
    });

    it('tracks acceptance with details', async () => {
      const onAccept = jest.fn().mockResolvedValue(undefined);
      render(
        <PostPurchaseUpsell
          product={mockProduct}
          orderId={mockOrderId}
          onAccept={onAccept}
          discountPercent={10}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /yes, add to my order/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'POST_PURCHASE_UPSELL_ACCEPTED',
          expect.objectContaining({
            productId: 'upsell-1',
            productName: 'Premium Coffee Subscription',
            orderId: 'order-123',
          })
        );
      });
    });

    it('tracks decline', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      const declineButton = screen.getByRole('button', { name: /no thanks/i });
      fireEvent.click(declineButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('POST_PURCHASE_UPSELL_DECLINED', {
        productId: 'upsell-1',
        orderId: 'order-123',
        timeRemaining: 0,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(
        screen.getByRole('heading', { name: /wait! special one-time offer/i })
      ).toBeInTheDocument();
    });

    it('has proper section labeling', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      // Section should be labeled by the heading
      const section = document.querySelector('[aria-labelledby="post-purchase-upsell-heading"]');
      expect(section).toBeInTheDocument();
    });

    it('uses custom CTA text', () => {
      render(
        <PostPurchaseUpsell
          product={mockProduct}
          orderId={mockOrderId}
          ctaText="Add Now!"
          declineText="Skip this offer"
        />
      );

      expect(screen.getByRole('button', { name: /add now/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip this offer/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Trust Indicators Tests
  // -------------------------------------------------------------------------

  describe('Trust Indicators', () => {
    it('displays secure checkout message', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(screen.getByText('Secure checkout')).toBeInTheDocument();
    });

    it('displays same payment method message', () => {
      render(<PostPurchaseUpsell product={mockProduct} orderId={mockOrderId} />);

      expect(screen.getByText('Same payment method')).toBeInTheDocument();
    });
  });
});
