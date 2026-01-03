import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import {
  SocialProofPopup,
  LiveVisitorCount,
  PurchaseCountBadge,
  RecentPurchase,
} from './landing-page-social-proof';

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

const mockPurchases: RecentPurchase[] = [
  {
    id: 'purchase-1',
    customerName: 'John D.',
    customerLocation: 'New York, NY',
    productName: 'Premium Coffee Beans',
    productImageUrl: 'https://example.com/coffee.jpg',
    timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
  },
  {
    id: 'purchase-2',
    customerName: 'Sarah M.',
    customerLocation: 'Los Angeles, CA',
    productName: 'Coffee Grinder',
    timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
  },
  {
    id: 'purchase-3',
    customerName: 'Mike T.',
    productName: 'Coffee Mug Set',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  },
];

// ============================================================================
// SocialProofPopup Tests
// ============================================================================

describe('SocialProofPopup', () => {
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
    it('does not render initially (before initial delay)', () => {
      render(<SocialProofPopup purchases={mockPurchases} initialDelay={10000} />);

      // Before initial delay, no purchase should be visible
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows popup after initial delay', async () => {
      render(<SocialProofPopup purchases={mockPurchases} initialDelay={1000} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('does not render when disabled', () => {
      render(<SocialProofPopup purchases={mockPurchases} enabled={false} />);

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not render with empty purchases', () => {
      render(<SocialProofPopup purchases={[]} />);

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Content Tests
  // -------------------------------------------------------------------------

  describe('Content', () => {
    it('displays customer name and location', async () => {
      render(<SocialProofPopup purchases={mockPurchases} initialDelay={100} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('John D.')).toBeInTheDocument();
        expect(screen.getByText(/from New York, NY/)).toBeInTheDocument();
      });
    });

    it('displays product name', async () => {
      render(<SocialProofPopup purchases={mockPurchases} initialDelay={100} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Premium Coffee Beans')).toBeInTheDocument();
      });
    });

    it('displays relative time', async () => {
      render(<SocialProofPopup purchases={mockPurchases} initialDelay={100} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText(/minutes ago/)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Interaction Tests
  // -------------------------------------------------------------------------

  describe('Interactions', () => {
    it('dismisses on click', async () => {
      render(
        <SocialProofPopup purchases={mockPurchases} initialDelay={100} displayDuration={5000} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('SOCIAL_PROOF_DISMISSED', {
        purchaseId: 'purchase-1',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Analytics Tests
  // -------------------------------------------------------------------------

  describe('Analytics', () => {
    it('tracks impression when popup is shown', async () => {
      render(<SocialProofPopup purchases={mockPurchases} initialDelay={100} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('SOCIAL_PROOF_SHOWN', {
          purchaseId: 'purchase-1',
          productName: 'Premium Coffee Beans',
        });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Position Tests
  // -------------------------------------------------------------------------

  describe('Position', () => {
    it('applies bottom-left position classes', async () => {
      render(
        <SocialProofPopup purchases={mockPurchases} initialDelay={100} position="bottom-left" />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const popup = screen.getByRole('status');
        expect(popup).toHaveClass('bottom-4');
        expect(popup).toHaveClass('left-4');
      });
    });

    it('applies bottom-right position classes', async () => {
      render(
        <SocialProofPopup purchases={mockPurchases} initialDelay={100} position="bottom-right" />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const popup = screen.getByRole('status');
        expect(popup).toHaveClass('bottom-4');
        expect(popup).toHaveClass('right-4');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Age Filter Tests
  // -------------------------------------------------------------------------

  describe('Purchase Age Filter', () => {
    it('filters out old purchases', () => {
      const oldPurchases = [
        {
          ...mockPurchases[0],
          timestamp: Date.now() - 48 * 60 * 60 * 1000, // 48 hours ago
        },
      ];

      render(<SocialProofPopup purchases={oldPurchases} maxPurchaseAge={86400000} />);

      act(() => {
        jest.advanceTimersByTime(15000);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// LiveVisitorCount Tests
// ============================================================================

describe('LiveVisitorCount', () => {
  it('renders with visitor count', () => {
    render(<LiveVisitorCount count={15} />);

    expect(screen.getByText(/15 people are viewing this right now/)).toBeInTheDocument();
  });

  it('does not render below minimum count', () => {
    const { container } = render(<LiveVisitorCount count={2} minCount={3} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('uses custom template', () => {
    render(<LiveVisitorCount count={10} template="{{count}} shoppers online" />);

    expect(screen.getByText('10 shoppers online')).toBeInTheDocument();
  });

  it('has animated indicator', () => {
    render(<LiveVisitorCount count={5} />);

    const animatedDot = document.querySelector('.animate-ping');
    expect(animatedDot).toBeInTheDocument();
  });

  it('has aria-live for accessibility', () => {
    render(<LiveVisitorCount count={5} />);

    const container = screen.getByText(/5 people/).closest('div');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });
});

// ============================================================================
// PurchaseCountBadge Tests
// ============================================================================

describe('PurchaseCountBadge', () => {
  it('renders with purchase count', () => {
    render(<PurchaseCountBadge count={25} />);

    expect(screen.getByText(/25\+ people purchased today/)).toBeInTheDocument();
  });

  it('does not render below minimum count', () => {
    const { container } = render(<PurchaseCountBadge count={3} minCount={5} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('uses custom period', () => {
    render(<PurchaseCountBadge count={100} period="this week" />);

    expect(screen.getByText(/100\+ people purchased this week/)).toBeInTheDocument();
  });

  it('has role=status for accessibility', () => {
    render(<PurchaseCountBadge count={10} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PurchaseCountBadge count={10} className="custom-class" />);

    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
});
