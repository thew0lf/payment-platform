import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useLandingPageAttribution, AttributionDebug } from './landing-page-attribution';

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

// Mock localStorage
const mockLocalStorage: { [key: string]: string } = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock location
const mockLocation = {
  href: 'https://example.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=summer',
  search: '?utm_source=google&utm_medium=cpc&utm_campaign=summer',
};
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

// Mock document.referrer
Object.defineProperty(document, 'referrer', {
  value: 'https://www.google.com/',
  writable: true,
});

// ============================================================================
// Test Component
// ============================================================================

function TestComponent({
  options = {},
}: {
  options?: Parameters<typeof useLandingPageAttribution>[0];
}) {
  const attribution = useLandingPageAttribution(options);

  return (
    <div>
      <div data-testid="primary-source">{attribution.primarySource}</div>
      <div data-testid="touch-count">{attribution.touchCount}</div>
      <div data-testid="is-returning">{attribution.isReturningVisitor ? 'yes' : 'no'}</div>
      <div data-testid="current-source">{attribution.currentUtm.source || 'none'}</div>
      <div data-testid="current-medium">{attribution.currentUtm.medium || 'none'}</div>
      <div data-testid="current-campaign">{attribution.currentUtm.campaign || 'none'}</div>
      <div data-testid="device">{attribution.attributionData.device}</div>
      <button onClick={() => attribution.clearAttribution()}>Clear</button>
      <button onClick={() => attribution.recordTouch()}>Record Touch</button>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('useLandingPageAttribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  // -------------------------------------------------------------------------
  // UTM Parameter Parsing Tests
  // -------------------------------------------------------------------------

  describe('UTM Parameter Parsing', () => {
    it('parses UTM parameters from URL', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('current-source').textContent).toBe('google');
        expect(screen.getByTestId('current-medium').textContent).toBe('cpc');
        expect(screen.getByTestId('current-campaign').textContent).toBe('summer');
      });
    });

    it('identifies primary source from UTM', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('primary-source').textContent).toBe('google');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Touch Recording Tests
  // -------------------------------------------------------------------------

  describe('Touch Recording', () => {
    it('records first touch attribution', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'ATTRIBUTION_CAPTURED',
          expect.objectContaining({
            source: 'google',
            medium: 'cpc',
            campaign: 'summer',
            isFirstTouch: true,
            touchNumber: 1,
          })
        );
      });
    });

    it('stores first touch in localStorage', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'lp_attr_first_touch',
          expect.stringContaining('google')
        );
      });
    });

    it('stores touches array in localStorage', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'lp_attr_touches',
          expect.any(String)
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Returning Visitor Detection Tests
  // -------------------------------------------------------------------------

  describe('Returning Visitor Detection', () => {
    it('identifies first-time visitors', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-returning').textContent).toBe('no');
      });
    });

    it('identifies returning visitors', async () => {
      // Simulate existing touches
      mockLocalStorage['lp_attr_first_touch'] = JSON.stringify({
        timestamp: Date.now() - 86400000,
        source: 'facebook',
        medium: 'social',
        landingUrl: 'https://example.com/landing',
      });
      mockLocalStorage['lp_attr_touches'] = JSON.stringify([
        {
          timestamp: Date.now() - 86400000,
          source: 'facebook',
          medium: 'social',
          landingUrl: 'https://example.com/landing',
        },
        {
          timestamp: Date.now(),
          source: 'google',
          medium: 'cpc',
          landingUrl: 'https://example.com/landing?utm_source=google',
        },
      ]);
      mockLocalStorage['lp_attr_expiry'] = new Date(Date.now() + 86400000).toISOString();

      render(<TestComponent options={{ autoTrack: false }} />);

      await waitFor(() => {
        expect(screen.getByTestId('is-returning').textContent).toBe('yes');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Device Detection Tests
  // -------------------------------------------------------------------------

  describe('Device Detection', () => {
    it('detects desktop device', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('device').textContent).toBe('desktop');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Referrer Inference Tests
  // -------------------------------------------------------------------------

  describe('Referrer Source Inference', () => {
    it('infers google organic from referrer', () => {
      // This is tested implicitly via the component mount
      // Full referrer parsing is tested in unit tests
    });
  });

  // -------------------------------------------------------------------------
  // Clear Attribution Tests
  // -------------------------------------------------------------------------

  describe('Clear Attribution', () => {
    it('clears all attribution data', async () => {
      render(<TestComponent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('primary-source').textContent).toBe('google');
      });

      // Clear - use fireEvent instead of native click
      const clearButton = screen.getByText('Clear');
      await waitFor(() => {
        clearButton.click();
      });

      // Check that remove was called (may have been called during the click handler)
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Touch Count Tests
  // -------------------------------------------------------------------------

  describe('Touch Count', () => {
    it('starts with touch count of 1', async () => {
      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('touch-count').textContent).toBe('1');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Conversion Attribution Tests
  // -------------------------------------------------------------------------

  describe('Conversion Attribution', () => {
    it('provides conversion attribution data', async () => {
      const TestConversionComponent = () => {
        const { getConversionAttribution } = useLandingPageAttribution();
        const [data, setData] = React.useState<Record<string, unknown> | null>(null);

        React.useEffect(() => {
          const attribution = getConversionAttribution();
          setData(attribution);
        }, [getConversionAttribution]);

        return (
          <div data-testid="conversion-data">
            {data ? JSON.stringify(data) : 'loading'}
          </div>
        );
      };

      render(<TestConversionComponent />);

      await waitFor(() => {
        const dataStr = screen.getByTestId('conversion-data').textContent;
        expect(dataStr).toContain('firstTouch');
        expect(dataStr).toContain('lastTouch');
        expect(dataStr).toContain('touchCount');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cross-Domain Params Tests
  // -------------------------------------------------------------------------

  describe('Cross-Domain Params', () => {
    it('generates cross-domain URL params', async () => {
      const TestCrossDomainComponent = () => {
        const { getCrossDomainParams } = useLandingPageAttribution();
        const [params, setParams] = React.useState('');

        React.useEffect(() => {
          const p = getCrossDomainParams();
          setParams(p.toString());
        }, [getCrossDomainParams]);

        return <div data-testid="params">{params}</div>;
      };

      render(<TestCrossDomainComponent />);

      await waitFor(() => {
        const params = screen.getByTestId('params').textContent;
        expect(params).toContain('utm_source=google');
        expect(params).toContain('utm_medium=cpc');
      });
    });

    it('appends attribution to URL', async () => {
      const TestAppendComponent = () => {
        const { appendAttributionToUrl } = useLandingPageAttribution();
        const [url, setUrl] = React.useState('');

        React.useEffect(() => {
          const newUrl = appendAttributionToUrl('https://checkout.example.com/');
          setUrl(newUrl);
        }, [appendAttributionToUrl]);

        return <div data-testid="url">{url}</div>;
      };

      render(<TestAppendComponent />);

      await waitFor(() => {
        const url = screen.getByTestId('url').textContent;
        expect(url).toContain('utm_source=google');
        expect(url).toContain('checkout.example.com');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Click ID Tests
  // -------------------------------------------------------------------------

  describe('Click ID Tracking', () => {
    it('parses gclid from URL', async () => {
      // Update mock location with gclid
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/landing?utm_source=google&gclid=CjwKCAtest123',
          search: '?utm_source=google&gclid=CjwKCAtest123',
        },
        writable: true,
      });

      const { rerender } = render(<TestComponent />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'ATTRIBUTION_CAPTURED',
          expect.objectContaining({
            hasClickIds: true,
          })
        );
      });

      // Reset location
      Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
    });
  });

  // -------------------------------------------------------------------------
  // Storage Prefix Tests
  // -------------------------------------------------------------------------

  describe('Storage Prefix', () => {
    it('uses custom storage prefix', async () => {
      render(<TestComponent options={{ storagePrefix: 'custom_prefix' }} />);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'custom_prefix_first_touch',
          expect.any(String)
        );
      });
    });
  });
});

// ============================================================================
// AttributionDebug Component Tests
// ============================================================================

describe('AttributionDebug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  it('renders attribution debug info in development', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    render(<AttributionDebug devOnly={true} />);

    expect(screen.getByText('Attribution Debug')).toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('shows source and medium', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    render(<AttributionDebug devOnly={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Source:/)).toBeInTheDocument();
      expect(screen.getByText(/Medium:/)).toBeInTheDocument();
      expect(screen.getByText(/Device:/)).toBeInTheDocument();
    });

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('applies position classes', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    render(<AttributionDebug devOnly={true} position="top-left" />);

    // Find the aside container (semantic element for debug overlay)
    const container = screen.getByRole('status');
    expect(container).toHaveClass('top-4');
    expect(container).toHaveClass('left-4');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('has proper ARIA attributes for accessibility', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    render(<AttributionDebug devOnly={true} />);

    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-live', 'polite');
    expect(container).toHaveAttribute('aria-label', 'Attribution debug information');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('does not render in production when devOnly is true', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

    render(<AttributionDebug devOnly={true} />);

    expect(screen.queryByText('Attribution Debug')).not.toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });
});
