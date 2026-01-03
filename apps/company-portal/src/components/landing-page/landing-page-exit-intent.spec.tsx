import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LandingPageExitIntent } from './landing-page-exit-intent';

// ============================================================================
// Mock LandingPageContext
// ============================================================================

const mockOpenCartDrawer = jest.fn();

const mockContextValue = {
  localCart: [] as Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  cartTotal: 0,
  cartCount: 0,
  openCartDrawer: mockOpenCartDrawer,
  closeCartDrawer: jest.fn(),
  isCartDrawerOpen: false,
  landingPage: null,
  isLoading: false,
  error: null,
  session: null,
  cart: null,
  initializeLandingPage: jest.fn(),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
  trackEvent: jest.fn(),
};

jest.mock('@/contexts/landing-page-context', () => ({
  useLandingPage: () => mockContextValue,
  LandingPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sessionStorage
const mockSessionStorage: { [key: string]: string } = {};
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockSessionStorage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockSessionStorage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
    }),
  },
  writable: true,
});

// ============================================================================
// Tests
// ============================================================================

describe('LandingPageExitIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.cartCount = 0;
    Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
    document.body.style.overflow = '';
  });

  // -------------------------------------------------------------------------
  // Initial State Tests
  // -------------------------------------------------------------------------

  describe('Initial State', () => {
    it('does not render initially', () => {
      mockContextValue.cartCount = 2;
      render(<LandingPageExitIntent />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('checks sessionStorage for already shown flag', () => {
      mockContextValue.cartCount = 2;
      render(<LandingPageExitIntent showOnce={true} />);

      expect(window.sessionStorage.getItem).toHaveBeenCalledWith('lp-exit-intent-shown');
    });
  });

  // -------------------------------------------------------------------------
  // Trigger Tests (Mocked Exit Intent)
  // -------------------------------------------------------------------------

  describe('Exit Intent Trigger', () => {
    it('triggers on mouse leave to top of viewport', async () => {
      jest.useFakeTimers();
      mockContextValue.cartCount = 2;
      render(<LandingPageExitIntent enableDelay={0} />);

      // Wait for enable delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Simulate mouse leaving toward top
      act(() => {
        const event = new MouseEvent('mouseleave', { clientY: -10 });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('does not trigger when cart is empty', () => {
      jest.useFakeTimers();
      mockContextValue.cartCount = 0;
      render(<LandingPageExitIntent enableDelay={0} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        const event = new MouseEvent('mouseleave', { clientY: -10 });
        document.dispatchEvent(event);
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Content Tests
  // -------------------------------------------------------------------------

  describe('Content', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockContextValue.cartCount = 2;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const triggerExitIntent = () => {
      act(() => {
        jest.advanceTimersByTime(100);
      });
      act(() => {
        const event = new MouseEvent('mouseleave', { clientY: -10 });
        document.dispatchEvent(event);
      });
    };

    it('displays default heading', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByText('Before you go...')).toBeInTheDocument();
      });
    });

    it('displays custom heading', async () => {
      render(<LandingPageExitIntent heading="Don't go!" enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByText("Don't go!")).toBeInTheDocument();
      });
    });

    it('displays subheading', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByText("Your cart is still here whenever you're ready")).toBeInTheDocument();
      });
    });

    it('displays discount percentage when provided', async () => {
      render(<LandingPageExitIntent discountPercent={20} enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByText('20% OFF')).toBeInTheDocument();
      });
    });

    it('displays discount code when provided', async () => {
      render(<LandingPageExitIntent discountCode="SAVE20" enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByText('SAVE20')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Interaction Tests
  // -------------------------------------------------------------------------

  describe('Interactions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockContextValue.cartCount = 2;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const triggerExitIntent = () => {
      act(() => {
        jest.advanceTimersByTime(100);
      });
      act(() => {
        const event = new MouseEvent('mouseleave', { clientY: -10 });
        document.dispatchEvent(event);
      });
    };

    it('calls openCartDrawer when CTA is clicked (default)', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: /back to my cart/i });
      fireEvent.click(ctaButton);

      expect(mockOpenCartDrawer).toHaveBeenCalledTimes(1);
    });

    it('calls custom onCtaClick when provided', async () => {
      const onCtaClick = jest.fn();
      render(<LandingPageExitIntent onCtaClick={onCtaClick} enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const ctaButton = screen.getByRole('button', { name: /back to my cart/i });
      fireEvent.click(ctaButton);

      expect(onCtaClick).toHaveBeenCalledTimes(1);
      expect(mockOpenCartDrawer).not.toHaveBeenCalled();
    });

    it('closes when dismiss button is clicked', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /not right now/i });
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes when close button is clicked', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes when Escape key is pressed', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('calls onDismiss callback when dismissed', async () => {
      const onDismiss = jest.fn();
      render(<LandingPageExitIntent onDismiss={onDismiss} enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /not right now/i });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Show Once Tests
  // -------------------------------------------------------------------------

  describe('Show Once', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockContextValue.cartCount = 2;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stores shown flag in sessionStorage', async () => {
      render(<LandingPageExitIntent showOnce={true} enableDelay={0} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });
      act(() => {
        const event = new MouseEvent('mouseleave', { clientY: -10 });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('lp-exit-intent-shown', 'true');
    });

    it('does not show again if already shown in session', async () => {
      mockSessionStorage['lp-exit-intent-shown'] = 'true';

      render(<LandingPageExitIntent showOnce={true} enableDelay={0} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });
      act(() => {
        const event = new MouseEvent('mouseleave', { clientY: -10 });
        document.dispatchEvent(event);
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockContextValue.cartCount = 2;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const triggerExitIntent = () => {
      act(() => {
        jest.advanceTimersByTime(100);
      });
      act(() => {
        const event = new MouseEvent('mouseleave', { clientY: -10 });
        document.dispatchEvent(event);
      });
    };

    it('has role="dialog"', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('has aria-modal="true"', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('has aria-labelledby pointing to heading', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby', 'exit-intent-heading');
      });

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveAttribute('id', 'exit-intent-heading');
    });

    it('locks body scroll when visible', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when dismissed', async () => {
      render(<LandingPageExitIntent enableDelay={0} />);
      triggerExitIntent();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });
  });
});
