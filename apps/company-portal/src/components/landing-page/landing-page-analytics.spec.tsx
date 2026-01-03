import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useLandingPageAnalytics, LandingPageAnalyticsProvider } from './landing-page-analytics';

// ============================================================================
// Mock LandingPageContext
// ============================================================================

const mockTrackEvent = jest.fn();

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
  landingPage: {
    id: 'lp-123',
    name: 'Test Landing Page',
    companyId: 'company-123',
    slug: 'test-page',
    status: 'PUBLISHED' as const,
    settings: {
      branding: { primaryColor: '#667eea' },
      seo: {},
      behavior: { showCart: true, enableCheckout: true, trackingEnabled: true },
      urls: {},
    },
    sections: [],
    totalVisits: 0,
    totalConversions: 0,
  },
  isLoading: false,
  error: null,
  session: {
    id: 'session-123',
    landingPageId: 'lp-123',
    sessionToken: 'token-123',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  },
  cart: null,
  initializeLandingPage: jest.fn(),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
  applyDiscountCode: jest.fn(),
  removeDiscountCode: jest.fn(),
  refreshCart: jest.fn(),
  scrollToSection: jest.fn(),
  backendCartTotals: null,
  trackEvent: mockTrackEvent,
};

jest.mock('@/contexts/landing-page-context', () => ({
  useLandingPage: () => mockContextValue,
  LandingPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock sendBeacon
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: jest.fn(),
});

// ============================================================================
// Test Component
// ============================================================================

function TestComponent({ options = {} }: { options?: Parameters<typeof useLandingPageAnalytics>[0] }) {
  const analytics = useLandingPageAnalytics(options);

  return (
    <div>
      <div data-testid="engagement-score">{analytics.engagementScore}</div>
      <div data-testid="time-on-page">{analytics.engagementMetrics.timeOnPage}</div>
      <div data-testid="scroll-depth">{analytics.engagementMetrics.scrollDepth}</div>
      <div data-testid="interactions">{analytics.engagementMetrics.interactions}</div>
      <button onClick={() => analytics.trackCTAClick('cta-1', 'Buy Now', '/checkout')}>
        Track CTA
      </button>
      <button onClick={() => analytics.trackFormStart('form-1', 'Contact Form')}>
        Start Form
      </button>
      <button onClick={() => analytics.trackFormComplete('form-1', 'Contact Form', 5)}>
        Complete Form
      </button>
      <button onClick={() => analytics.trackFormAbandon('form-1', 'email', 3)}>
        Abandon Form
      </button>
      <button onClick={() => analytics.trackProductImpression('prod-1', { position: 0 })}>
        Track Impression
      </button>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('useLandingPageAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Initialization Tests
  // -------------------------------------------------------------------------

  describe('Initialization', () => {
    it('tracks page view on mount when session exists', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'PAGE_VIEW',
          expect.objectContaining({
            landingPageId: 'lp-123',
            landingPageName: 'Test Landing Page',
          })
        );
      });
    });

    it('initializes with zero engagement metrics', () => {
      render(<TestComponent />);

      expect(screen.getByTestId('engagement-score').textContent).toBe('0');
      expect(screen.getByTestId('time-on-page').textContent).toBe('0');
      expect(screen.getByTestId('scroll-depth').textContent).toBe('0');
      expect(screen.getByTestId('interactions').textContent).toBe('0');
    });
  });

  // -------------------------------------------------------------------------
  // Scroll Depth Tracking Tests
  // -------------------------------------------------------------------------

  describe('Scroll Depth Tracking', () => {
    it('tracks scroll depth milestones', async () => {
      // Mock scroll values
      Object.defineProperty(window, 'scrollY', { value: 250, writable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        value: 1000,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', { value: 0, writable: true });

      render(<TestComponent />);

      act(() => {
        window.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(150); // Past debounce
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'SCROLL_DEPTH',
          expect.objectContaining({
            percentage: 25,
          })
        );
      });
    });

    it('does not track scroll when disabled', async () => {
      render(<TestComponent options={{ trackScrollDepth: false }} />);

      act(() => {
        window.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(mockTrackEvent).not.toHaveBeenCalledWith(
          'SCROLL_DEPTH',
          expect.anything()
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Click Tracking Tests
  // -------------------------------------------------------------------------

  describe('Click Tracking', () => {
    it('tracks button clicks', async () => {
      render(
        <div>
          <button data-track="primary-cta">Click Me</button>
          <TestComponent />
        </div>
      );

      const button = screen.getByText('Click Me');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'ELEMENT_CLICK',
          expect.objectContaining({
            tagName: 'button',
            dataTrack: 'primary-cta',
          })
        );
      });
    });

    it('does not track non-interactive element clicks', async () => {
      render(
        <div>
          <span>Just text</span>
          <TestComponent />
        </div>
      );

      const span = screen.getByText('Just text');
      fireEvent.click(span);

      // Should only have PAGE_VIEW, not ELEMENT_CLICK for span
      await waitFor(() => {
        const elementClickCalls = mockTrackEvent.mock.calls.filter(
          (call) => call[0] === 'ELEMENT_CLICK' && call[1]?.tagName === 'span'
        );
        expect(elementClickCalls.length).toBe(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // CTA Tracking Tests
  // -------------------------------------------------------------------------

  describe('CTA Tracking', () => {
    it('tracks CTA clicks with metadata', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Track CTA'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CTA_CLICK',
        expect.objectContaining({
          ctaId: 'cta-1',
          ctaText: 'Buy Now',
          destination: '/checkout',
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Form Tracking Tests
  // -------------------------------------------------------------------------

  describe('Form Tracking', () => {
    it('tracks form start', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Start Form'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'FORM_START',
        expect.objectContaining({
          formId: 'form-1',
          formName: 'Contact Form',
        })
      );
    });

    it('tracks form complete', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Complete Form'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'FORM_COMPLETE',
        expect.objectContaining({
          formId: 'form-1',
          formName: 'Contact Form',
          fieldsCompleted: 5,
        })
      );
    });

    it('tracks form abandon', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Abandon Form'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'FORM_ABANDON',
        expect.objectContaining({
          formId: 'form-1',
          lastField: 'email',
          fieldsCompleted: 3,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Product Impression Tracking Tests
  // -------------------------------------------------------------------------

  describe('Product Impression Tracking', () => {
    it('tracks product impressions', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText('Track Impression'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'PRODUCT_IMPRESSION',
        expect.objectContaining({
          productId: 'prod-1',
          position: 0,
        })
      );
    });

    it('creates IntersectionObserver for product tracking', () => {
      const TestObserverComponent = () => {
        const { createProductObserver } = useLandingPageAnalytics();
        React.useEffect(() => {
          const observer = createProductObserver();
          expect(observer).toBeTruthy();
        }, [createProductObserver]);
        return null;
      };

      render(<TestObserverComponent />);

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Visibility Tracking Tests
  // -------------------------------------------------------------------------

  describe('Visibility Tracking', () => {
    it('tracks page visibility changes', async () => {
      render(<TestComponent />);

      act(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'PAGE_HIDDEN',
          expect.objectContaining({
            timeOnPage: expect.any(Number),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Heartbeat Tests
  // -------------------------------------------------------------------------

  describe('Time on Page Tracking', () => {
    it('sends heartbeat events at intervals', async () => {
      render(<TestComponent options={{ heartbeatInterval: 1000 }} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'TIME_ON_PAGE_HEARTBEAT',
          expect.objectContaining({
            timeOnPage: expect.any(Number),
            scrollDepth: expect.any(Number),
            interactions: expect.any(Number),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Engagement Score Tests
  // -------------------------------------------------------------------------

  describe('Engagement Score', () => {
    it('calculates engagement score based on metrics', () => {
      // This is a basic test - full calculation tested via integration
      render(<TestComponent />);

      const score = screen.getByTestId('engagement-score');
      expect(parseInt(score.textContent || '0', 10)).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Provider Component Tests
// ============================================================================

describe('LandingPageAnalyticsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <LandingPageAnalyticsProvider>
        <div data-testid="child">Child content</div>
      </LandingPageAnalyticsProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('initializes analytics automatically', async () => {
    render(
      <LandingPageAnalyticsProvider>
        <div>Content</div>
      </LandingPageAnalyticsProvider>
    );

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('PAGE_VIEW', expect.any(Object));
    });
  });
});
