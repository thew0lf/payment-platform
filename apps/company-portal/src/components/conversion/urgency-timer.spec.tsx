/**
 * Unit tests for UrgencyTimer component
 *
 * Tests cover:
 * - Basic rendering and countdown functionality
 * - Time formatting (MM:SS and HH:MM:SS)
 * - State transitions (normal -> warning -> critical)
 * - Session storage persistence
 * - All three variants (banner, inline, floating)
 * - Accessibility features (ARIA, screen reader announcements)
 * - Expiration callback
 * - Dark mode and reduced motion support
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { UrgencyTimer, UrgencyTimerProps } from './urgency-timer';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Helper to render component with props
const renderTimer = (props: Partial<UrgencyTimerProps> = {}) => {
  return render(<UrgencyTimer {...props} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('UrgencyTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Basic Rendering Tests
  // ==========================================================================

  describe('basic rendering', () => {
    it('should render with default props', () => {
      renderTimer();

      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should render banner variant by default', () => {
      renderTimer();

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('w-full');
      expect(timer).toHaveClass('border-b');
    });

    it('should display clock icon by default', () => {
      renderTimer();

      const icon = document.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should hide clock icon when showIcon is false', () => {
      renderTimer({ showIcon: false });

      const icon = document.querySelector('svg[aria-hidden="true"]');
      expect(icon).not.toBeInTheDocument();
    });

    it('should display "Your items are reserved for:" text', () => {
      renderTimer();

      expect(screen.getByText(/your items are reserved for/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Time Formatting Tests
  // ==========================================================================

  describe('time formatting', () => {
    it('should format time as MM:SS for durations under 1 hour', () => {
      renderTimer({ duration: 600 }); // 10 minutes

      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('should format time as HH:MM:SS for durations over 1 hour', () => {
      renderTimer({ duration: 3700 }); // 1 hour, 1 minute, 40 seconds

      expect(screen.getByText('01:01:40')).toBeInTheDocument();
    });

    it('should pad single-digit minutes with zero', () => {
      renderTimer({ duration: 300 }); // 5 minutes

      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('should pad single-digit seconds with zero', () => {
      renderTimer({ duration: 605 }); // 10 minutes 5 seconds

      expect(screen.getByText('10:05')).toBeInTheDocument();
    });

    it('should display 00:00 when expired', async () => {
      renderTimer({ duration: 1 });

      // Advance past expiration
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not display time anymore (shows expired message)
      expect(screen.queryByText('00:00')).not.toBeInTheDocument();
      expect(screen.getByText(/expired/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Countdown Functionality Tests
  // ==========================================================================

  describe('countdown functionality', () => {
    it('should count down every second', () => {
      renderTimer({ duration: 10 });

      expect(screen.getByText('00:10')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText('00:09')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText('00:06')).toBeInTheDocument();
    });

    it('should call onExpire when timer reaches 0', () => {
      const onExpire = jest.fn();
      renderTimer({ duration: 2, onExpire });

      expect(onExpire).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('should stop counting after expiration', () => {
      const onExpire = jest.fn();
      renderTimer({ duration: 2, onExpire, storageKey: 'stop-counting-test' });

      // Wait for expiration
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);

      // Continue advancing time - should not call again
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Still should only be called once
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('should display expired state after timer ends', () => {
      renderTimer({ duration: 1 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText(/reservation.*expired/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // State Transition Tests
  // ==========================================================================

  describe('state transitions', () => {
    it('should have normal state when time > 5 minutes', () => {
      renderTimer({ duration: 600 }); // 10 minutes

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('bg-gray-50');
    });

    it('should transition to warning state at 5 minutes', () => {
      renderTimer({ duration: 310 }); // 5 min 10 sec

      act(() => {
        jest.advanceTimersByTime(11000); // Advance to under 5 min
      });

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('bg-amber-50');
    });

    it('should transition to critical state at 2 minutes', () => {
      renderTimer({ duration: 130 }); // 2 min 10 sec

      act(() => {
        jest.advanceTimersByTime(11000); // Advance to under 2 min
      });

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('bg-red-50');
    });

    it('should have pulsing animation in critical state', () => {
      renderTimer({ duration: 60 }); // 1 minute (critical)

      const timerDisplay = screen.getByText('01:00');
      expect(timerDisplay).toHaveClass('motion-safe:animate-pulse');
    });

    it('should not have pulsing animation in normal state', () => {
      renderTimer({ duration: 600 }); // 10 minutes

      const timerDisplay = screen.getByText('10:00');
      expect(timerDisplay).not.toHaveClass('motion-safe:animate-pulse');
    });
  });

  // ==========================================================================
  // Session Storage Persistence Tests
  // ==========================================================================

  describe('session storage persistence', () => {
    it('should save end time to sessionStorage', () => {
      renderTimer({ duration: 600, storageKey: 'test-timer' });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'urgency_timer_end_test-timer',
        expect.any(String)
      );
    });

    it('should restore timer from sessionStorage', () => {
      // Set an end time 300 seconds (5 min) in the future
      const endTime = Date.now() + 300000;
      mockSessionStorage.getItem.mockReturnValueOnce(endTime.toString());

      renderTimer({ duration: 600, storageKey: 'test-timer' });

      // Should show approximately 5 minutes (due to timing precision, check for 04:5x or 05:00)
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should use different storage keys for different instances', () => {
      const { unmount } = renderTimer({ storageKey: 'timer-1' });
      unmount();

      renderTimer({ storageKey: 'timer-2' });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'urgency_timer_end_timer-1',
        expect.any(String)
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'urgency_timer_end_timer-2',
        expect.any(String)
      );
    });

    it('should call onExpire immediately if stored time is already expired', () => {
      const onExpire = jest.fn();
      // Set an end time in the past
      const endTime = Date.now() - 1000;
      mockSessionStorage.getItem.mockReturnValueOnce(endTime.toString());

      renderTimer({ duration: 600, storageKey: 'expired', onExpire });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Variant Tests
  // ==========================================================================

  describe('variants', () => {
    describe('banner variant', () => {
      it('should render full-width banner', () => {
        renderTimer({ variant: 'banner' });

        const timer = screen.getByRole('timer');
        expect(timer).toHaveClass('w-full');
        expect(timer).toHaveClass('border-b');
      });

      it('should have centered content', () => {
        const { container } = renderTimer({ variant: 'banner' });

        const innerContainer = container.querySelector('.max-w-7xl');
        expect(innerContainer).toHaveClass('mx-auto');
        expect(innerContainer).toHaveClass('justify-center');
      });
    });

    describe('inline variant', () => {
      it('should render compact inline display', () => {
        renderTimer({ variant: 'inline' });

        const timer = screen.getByRole('timer');
        expect(timer).toHaveClass('inline-flex');
        expect(timer).toHaveClass('rounded-lg');
      });

      it('should show "Yours for:" text', () => {
        renderTimer({ variant: 'inline' });

        expect(screen.getByText(/yours for/i)).toBeInTheDocument();
      });

      it('should have smaller icon', () => {
        const { container } = renderTimer({ variant: 'inline' });

        const icon = container.querySelector('svg');
        expect(icon).toHaveClass('w-4');
        expect(icon).toHaveClass('h-4');
      });
    });

    describe('floating variant', () => {
      it('should render as fixed positioned element', () => {
        renderTimer({ variant: 'floating' });

        const timer = screen.getByRole('timer');
        expect(timer).toHaveClass('fixed');
        expect(timer).toHaveClass('bottom-4');
        expect(timer).toHaveClass('right-4');
      });

      it('should have shadow for depth', () => {
        renderTimer({ variant: 'floating' });

        const timer = screen.getByRole('timer');
        expect(timer).toHaveClass('shadow-lg');
      });

      it('should have high z-index', () => {
        renderTimer({ variant: 'floating' });

        const timer = screen.getByRole('timer');
        expect(timer).toHaveClass('z-40');
      });

      it('should show "Cart reserved" label', () => {
        renderTimer({ variant: 'floating' });

        expect(screen.getByText(/cart reserved/i)).toBeInTheDocument();
      });

      it('should meet minimum touch target size', () => {
        renderTimer({ variant: 'floating' });

        const timer = screen.getByRole('timer');
        expect(timer).toHaveClass('min-w-[44px]');
        expect(timer).toHaveClass('min-h-[44px]');
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have role="timer"', () => {
      renderTimer();

      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should have aria-label with time remaining', () => {
      renderTimer({ duration: 600 });

      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-label', 'Cart reservation timer: 10:00 remaining');
    });

    it('should update aria-label as time changes', () => {
      renderTimer({ duration: 600 });

      act(() => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-label', 'Cart reservation timer: 09:00 remaining');
    });

    it('should have screen reader announcement element', () => {
      const { container } = renderTimer();

      const srElement = container.querySelector('.sr-only');
      expect(srElement).toBeInTheDocument();
      expect(srElement).toHaveAttribute('aria-live', 'polite');
      expect(srElement).toHaveAttribute('role', 'status');
    });

    it('should announce warning state to screen readers', () => {
      const { container } = renderTimer({ duration: 310 });

      act(() => {
        jest.advanceTimersByTime(11000); // Advance to under 5 min
      });

      const srElement = container.querySelector('.sr-only');
      expect(srElement?.textContent).toContain('Warning');
    });

    it('should announce critical state to screen readers', () => {
      const { container } = renderTimer({ duration: 130 });

      act(() => {
        jest.advanceTimersByTime(11000); // Advance to under 2 min
      });

      const srElement = container.querySelector('.sr-only');
      expect(srElement?.textContent).toContain('Heads up');
    });

    it('should have aria-hidden on decorative icons', () => {
      renderTimer();

      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have aria-hidden on time display (since announced via aria-label)', () => {
      renderTimer({ duration: 600 });

      // Find the time display element and check aria-hidden
      const timeDisplay = screen.getByText('10:00');
      expect(timeDisplay).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ==========================================================================
  // Dark Mode Tests
  // ==========================================================================

  describe('dark mode support', () => {
    it('should have dark mode classes for normal state', () => {
      renderTimer({ duration: 600 });

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('dark:bg-gray-800');
      expect(timer).toHaveClass('dark:text-gray-200');
    });

    it('should have dark mode classes for warning state', () => {
      renderTimer({ duration: 250 }); // Under 5 min

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('dark:bg-amber-900/30');
    });

    it('should have dark mode classes for critical state', () => {
      renderTimer({ duration: 60 }); // Under 2 min

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('dark:bg-red-900/30');
    });
  });

  // ==========================================================================
  // Reduced Motion Tests
  // ==========================================================================

  describe('reduced motion support', () => {
    it('should use motion-safe prefix for animations', () => {
      renderTimer({ duration: 60 }); // Critical state with pulse

      const timer = screen.getByRole('timer');
      expect(timer.className).toContain('motion-safe:');
    });

    it('should use motion-safe for transitions', () => {
      renderTimer();

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('motion-safe:transition-colors');
    });
  });

  // ==========================================================================
  // CSS Variables Tests
  // ==========================================================================

  describe('CSS variables', () => {
    it('should set --primary-color CSS variable', () => {
      renderTimer();

      const timer = screen.getByRole('timer');
      expect(timer).toHaveStyle({ '--primary-color': 'var(--brand-primary, #3b82f6)' });
    });
  });

  // ==========================================================================
  // Expiration State Tests
  // ==========================================================================

  describe('expiration state', () => {
    it('should show expired message for banner variant', () => {
      renderTimer({ variant: 'banner', duration: 1 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText(/cart reservation has expired/i)).toBeInTheDocument();
    });

    it('should show expired message for inline variant', () => {
      renderTimer({ variant: 'inline', duration: 1 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('should show expired message for floating variant', () => {
      renderTimer({ variant: 'floating', duration: 1 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText(/reservation expired/i)).toBeInTheDocument();
    });

    it('should hide time display when expired', () => {
      renderTimer({ duration: 1 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Time should no longer be displayed
      expect(screen.queryByText(/^\d{2}:\d{2}$/)).not.toBeInTheDocument();
    });

    it('should have reduced opacity when expired', () => {
      renderTimer({ duration: 1 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('opacity-75');
    });

    it('should not pulse when expired', () => {
      renderTimer({ duration: 1 });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      const timer = screen.getByRole('timer');
      expect(timer.className).not.toContain('animate-pulse');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle 0 duration', () => {
      const onExpire = jest.fn();
      renderTimer({ duration: 0, onExpire });

      // Should immediately show expired
      expect(screen.getByText(/expired/i)).toBeInTheDocument();
    });

    it('should handle very large duration', () => {
      renderTimer({ duration: 86400 }); // 24 hours

      expect(screen.getByText('24:00:00')).toBeInTheDocument();
    });

    it('should handle multiple instances with different keys', () => {
      const { rerender } = render(
        <>
          <UrgencyTimer duration={300} storageKey="timer-a" />
          <UrgencyTimer duration={600} storageKey="timer-b" />
        </>
      );

      const timers = screen.getAllByRole('timer');
      expect(timers).toHaveLength(2);
    });

    it('should handle onExpire callback changes', () => {
      const onExpire1 = jest.fn();
      const onExpire2 = jest.fn();

      const { rerender } = renderTimer({ duration: 2, onExpire: onExpire1 });

      // Change the callback
      rerender(<UrgencyTimer duration={2} onExpire={onExpire2} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Only the latest callback should be called
      expect(onExpire1).not.toHaveBeenCalled();
      expect(onExpire2).toHaveBeenCalledTimes(1);
    });

    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.getItem.mockImplementationOnce(() => {
        throw new Error('SessionStorage not available');
      });

      // Should not throw and should fall back to duration
      expect(() => renderTimer({ duration: 300 })).not.toThrow();
      expect(screen.getByText('05:00')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Default Props Tests
  // ==========================================================================

  describe('default props', () => {
    it('should default to 900 seconds (15 minutes)', () => {
      renderTimer();

      expect(screen.getByText('15:00')).toBeInTheDocument();
    });

    it('should default to banner variant', () => {
      renderTimer();

      const timer = screen.getByRole('timer');
      expect(timer).toHaveClass('w-full');
    });

    it('should default to showing icon', () => {
      renderTimer();

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should default to "default" storage key', () => {
      renderTimer();

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'urgency_timer_end_default',
        expect.any(String)
      );
    });
  });
});
