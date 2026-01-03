/**
 * Unit tests for FreeShippingBar component
 *
 * Tests cover:
 * - Basic rendering for all variants (bar, compact, floating)
 * - Progress calculation and display
 * - Currency formatting with different currencies
 * - Threshold met/not met states
 * - Celebration animation when threshold is reached
 * - Accessibility (ARIA attributes, screen reader announcements)
 * - Icon visibility toggle
 * - Reduced motion preference support
 * - Dark mode support
 * - Close button functionality for floating variant
 * - Callback when threshold is reached
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { FreeShippingBar, FreeShippingBarProps } from './free-shipping-bar';

// ============================================================================
// Test Fixtures
// ============================================================================

const defaultProps: FreeShippingBarProps = {
  currentTotal: 50,
  threshold: 100,
};

const renderFreeShippingBar = (overrides: Partial<FreeShippingBarProps> = {}) => {
  const props = { ...defaultProps, ...overrides };
  return render(<FreeShippingBar {...props} />);
};

// Mock matchMedia for reduced motion tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// ============================================================================
// Tests
// ============================================================================

describe('FreeShippingBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockMatchMedia(false); // Default: motion allowed
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Basic Rendering - Bar Variant (Default)
  // ==========================================================================

  describe('Bar Variant (default)', () => {
    it('should render the bar variant by default', () => {
      renderFreeShippingBar();

      expect(screen.getByTestId('free-shipping-bar')).toBeInTheDocument();
    });

    it('should display the remaining amount message when below threshold', () => {
      renderFreeShippingBar({ currentTotal: 30, threshold: 100 });

      expect(screen.getByText(/Add/)).toBeInTheDocument();
      expect(screen.getByText('$70.00')).toBeInTheDocument();
      expect(screen.getByText(/more for FREE shipping!/)).toBeInTheDocument();
    });

    it('should display success message when threshold is met', () => {
      renderFreeShippingBar({ currentTotal: 100, threshold: 100 });

      expect(screen.getByText("You've unlocked FREE shipping!")).toBeInTheDocument();
    });

    it('should display success message when current total exceeds threshold', () => {
      renderFreeShippingBar({ currentTotal: 150, threshold: 100 });

      expect(screen.getByText("You've unlocked FREE shipping!")).toBeInTheDocument();
    });

    it('should render the progress bar', () => {
      renderFreeShippingBar();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display min and max values below progress bar', () => {
      renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('should not display min/max values when threshold is met', () => {
      renderFreeShippingBar({ currentTotal: 100, threshold: 100 });

      expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    });

    it('should show truck icon by default', () => {
      const { container } = renderFreeShippingBar();

      // Find truck icon (SVG with path for truck)
      const svg = container.querySelector('svg[aria-hidden="true"]');
      expect(svg).toBeInTheDocument();
    });

    it('should hide truck icon when showIcon is false', () => {
      const { container } = renderFreeShippingBar({ showIcon: false });

      // Should not have truck icon SVG
      const paths = container.querySelectorAll('path[d*="M13 16V6"]');
      expect(paths.length).toBe(0);
    });
  });

  // ==========================================================================
  // Compact Variant
  // ==========================================================================

  describe('Compact Variant', () => {
    it('should render compact variant when specified', () => {
      renderFreeShippingBar({ variant: 'compact' });

      expect(screen.getByTestId('free-shipping-bar')).toBeInTheDocument();
    });

    it('should show remaining amount in compact format', () => {
      renderFreeShippingBar({ variant: 'compact', currentTotal: 60, threshold: 100 });

      expect(screen.getByText('$40.00 to go')).toBeInTheDocument();
    });

    it('should show FREE shipping text when threshold met in compact variant', () => {
      renderFreeShippingBar({ variant: 'compact', currentTotal: 100, threshold: 100 });

      expect(screen.getByText('FREE shipping!')).toBeInTheDocument();
    });

    it('should have inline-flex styling for compact variant', () => {
      renderFreeShippingBar({ variant: 'compact' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('inline-flex');
    });

    it('should show smaller progress bar in compact variant', () => {
      const { container } = renderFreeShippingBar({ variant: 'compact' });

      // Compact variant uses h-1.5 height
      const progressBar = container.querySelector('.h-1\\.5');
      expect(progressBar).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Floating Variant
  // ==========================================================================

  describe('Floating Variant', () => {
    it('should render floating variant when specified', () => {
      renderFreeShippingBar({ variant: 'floating' });

      expect(screen.getByTestId('free-shipping-bar')).toBeInTheDocument();
    });

    it('should have fixed positioning for floating variant', () => {
      renderFreeShippingBar({ variant: 'floating' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('fixed');
      expect(container).toHaveClass('bottom-4');
    });

    it('should have close button in floating variant', () => {
      renderFreeShippingBar({ variant: 'floating' });

      const closeButton = screen.getByRole('button', {
        name: 'Dismiss free shipping notification',
      });
      expect(closeButton).toBeInTheDocument();
    });

    it('should hide floating variant when close button is clicked', () => {
      renderFreeShippingBar({ variant: 'floating' });

      const closeButton = screen.getByRole('button', {
        name: 'Dismiss free shipping notification',
      });
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('free-shipping-bar')).not.toBeInTheDocument();
    });

    it('should show percentage progress in floating variant', () => {
      renderFreeShippingBar({ variant: 'floating', currentTotal: 75, threshold: 100 });

      expect(screen.getByText('75% of the way there!')).toBeInTheDocument();
    });

    it('should not show percentage when threshold is met', () => {
      renderFreeShippingBar({ variant: 'floating', currentTotal: 100, threshold: 100 });

      expect(screen.queryByText(/of the way there/)).not.toBeInTheDocument();
    });

    it('should have role="status" for floating variant', () => {
      renderFreeShippingBar({ variant: 'floating' });

      const container = screen.getByRole('status', { name: /free shipping progress/i });
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Progress Calculation
  // ==========================================================================

  describe('Progress Calculation', () => {
    it('should calculate 0% progress when currentTotal is 0', () => {
      renderFreeShippingBar({ currentTotal: 0, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should calculate 50% progress correctly', () => {
      renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should calculate 75% progress correctly', () => {
      renderFreeShippingBar({ currentTotal: 75, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should cap progress at 100% when exceeding threshold', () => {
      renderFreeShippingBar({ currentTotal: 150, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should round progress percentage to nearest integer', () => {
      renderFreeShippingBar({ currentTotal: 33.33, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '33');
    });
  });

  // ==========================================================================
  // Currency Formatting
  // ==========================================================================

  describe('Currency Formatting', () => {
    it('should format USD by default', () => {
      renderFreeShippingBar({ currentTotal: 30, threshold: 100 });

      expect(screen.getByText('$70.00')).toBeInTheDocument();
    });

    it('should format EUR currency correctly', () => {
      renderFreeShippingBar({ currentTotal: 30, threshold: 100, currency: 'EUR' });

      // EUR format may vary by locale, but should contain the amount
      const container = screen.getByTestId('free-shipping-bar');
      expect(container.textContent).toMatch(/70/);
    });

    it('should format GBP currency correctly', () => {
      renderFreeShippingBar({ currentTotal: 30, threshold: 100, currency: 'GBP' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container.textContent).toMatch(/70/);
    });

    it('should format small decimal amounts correctly', () => {
      renderFreeShippingBar({ currentTotal: 99.99, threshold: 100 });

      expect(screen.getByText('$0.01')).toBeInTheDocument();
    });

    it('should show $0.00 as minimum in bar variant', () => {
      renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have role="progressbar" on progress element', () => {
      renderFreeShippingBar();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should have aria-valuenow on progress bar', () => {
      renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should have aria-valuemin on progress bar', () => {
      renderFreeShippingBar();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    });

    it('should have aria-valuemax on progress bar', () => {
      renderFreeShippingBar();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have descriptive aria-label when below threshold', () => {
      renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute(
        'aria-label',
        '50% progress to free shipping'
      );
    });

    it('should have success aria-label when threshold is met', () => {
      renderFreeShippingBar({ currentTotal: 100, threshold: 100 });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Free shipping unlocked');
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = renderFreeShippingBar();

      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should have screen reader announcement element', () => {
      renderFreeShippingBar();

      // Find sr-only element with role="status"
      const srAnnouncement = screen.getByRole('status');
      expect(srAnnouncement).toHaveClass('sr-only');
    });

    it('should have aria-live polite for screen reader announcements', () => {
      const { container } = renderFreeShippingBar({ currentTotal: 100, threshold: 100 });

      // The screen reader announcement span should have aria-live="polite"
      const srOnlySpan = container.querySelector('span.sr-only[role="status"]');
      expect(srOnlySpan).toBeInTheDocument();
      expect(srOnlySpan).toHaveAttribute('aria-live', 'polite');
      expect(srOnlySpan).toHaveAttribute('aria-atomic', 'true');
    });
  });

  // ==========================================================================
  // Threshold Reached Callback
  // ==========================================================================

  describe('Threshold Reached Callback', () => {
    it('should call onThresholdReached when threshold is first met', () => {
      const onThresholdReached = jest.fn();
      const { rerender } = renderFreeShippingBar({
        currentTotal: 90,
        threshold: 100,
        onThresholdReached,
      });

      expect(onThresholdReached).not.toHaveBeenCalled();

      // Update to meet threshold
      rerender(
        <FreeShippingBar
          currentTotal={100}
          threshold={100}
          onThresholdReached={onThresholdReached}
        />
      );

      expect(onThresholdReached).toHaveBeenCalledTimes(1);
    });

    it('should not call onThresholdReached repeatedly when already met', () => {
      const onThresholdReached = jest.fn();
      const { rerender } = renderFreeShippingBar({
        currentTotal: 100,
        threshold: 100,
        onThresholdReached,
      });

      expect(onThresholdReached).toHaveBeenCalledTimes(1);

      // Rerender with same values
      rerender(
        <FreeShippingBar
          currentTotal={110}
          threshold={100}
          onThresholdReached={onThresholdReached}
        />
      );

      expect(onThresholdReached).toHaveBeenCalledTimes(1);
    });

    it('should call onThresholdReached again after falling below and re-meeting threshold', () => {
      const onThresholdReached = jest.fn();
      const { rerender } = renderFreeShippingBar({
        currentTotal: 100,
        threshold: 100,
        onThresholdReached,
      });

      expect(onThresholdReached).toHaveBeenCalledTimes(1);

      // Drop below threshold
      rerender(
        <FreeShippingBar
          currentTotal={50}
          threshold={100}
          onThresholdReached={onThresholdReached}
        />
      );

      // Meet threshold again
      rerender(
        <FreeShippingBar
          currentTotal={100}
          threshold={100}
          onThresholdReached={onThresholdReached}
        />
      );

      expect(onThresholdReached).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Animation and Celebration
  // ==========================================================================

  describe('Animation and Celebration', () => {
    it('should show celebration particles when threshold is met', async () => {
      const { rerender, container } = renderFreeShippingBar({
        currentTotal: 90,
        threshold: 100,
      });

      // Advance initial timers
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Meet threshold
      rerender(<FreeShippingBar currentTotal={100} threshold={100} />);

      // Celebration particles should appear
      await waitFor(() => {
        const particles = container.querySelectorAll('.animate-confetti-pop');
        expect(particles.length).toBeGreaterThan(0);
      });
    });

    it('should hide celebration particles after 2 seconds', async () => {
      const { rerender, container } = renderFreeShippingBar({
        currentTotal: 90,
        threshold: 100,
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      rerender(<FreeShippingBar currentTotal={100} threshold={100} />);

      // Wait for celebration to show and then hide
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      await waitFor(() => {
        const particles = container.querySelectorAll('.animate-confetti-pop');
        expect(particles.length).toBe(0);
      });
    });

    it('should animate progress bar on mount', async () => {
      const { container } = renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      // Before animation timer
      const progressInner = container.querySelector('[style*="width"]');
      expect(progressInner).toHaveStyle({ width: '0%' });

      // After animation timer
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        const animatedProgress = container.querySelector('[style*="width: 50%"]');
        expect(animatedProgress).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Reduced Motion
  // ==========================================================================

  describe('Reduced Motion Support', () => {
    it('should skip animations when prefers-reduced-motion is enabled', () => {
      mockMatchMedia(true); // Enable reduced motion

      const { container } = renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      // Should not have transition classes when reduced motion is preferred
      const progressBar = container.querySelector('[role="progressbar"] > div');
      expect(progressBar).not.toHaveClass('transition-all');
    });

    it('should not show celebration particles when reduced motion is enabled', async () => {
      mockMatchMedia(true);

      const { rerender, container } = renderFreeShippingBar({
        currentTotal: 90,
        threshold: 100,
      });

      rerender(<FreeShippingBar currentTotal={100} threshold={100} />);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      const particles = container.querySelectorAll('.animate-confetti-pop');
      expect(particles.length).toBe(0);
    });

    it('should still function correctly with reduced motion', () => {
      mockMatchMedia(true);

      renderFreeShippingBar({ currentTotal: 100, threshold: 100 });

      expect(screen.getByText("You've unlocked FREE shipping!")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Dark Mode Support
  // ==========================================================================

  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      renderFreeShippingBar();

      const container = screen.getByTestId('free-shipping-bar');
      expect(container.className).toContain('dark:bg-gray-800');
      expect(container.className).toContain('dark:border-gray-700');
    });

    it('should have dark mode text colors', () => {
      const { container } = renderFreeShippingBar({ currentTotal: 50, threshold: 100 });

      // Check for dark mode text classes in the remaining amount display
      const textElements = container.querySelectorAll('[class*="dark:text-"]');
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Custom className
  // ==========================================================================

  describe('Custom className', () => {
    it('should apply custom className to container', () => {
      renderFreeShippingBar({ className: 'my-custom-class' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('my-custom-class');
    });

    it('should preserve default classes when custom className is added', () => {
      renderFreeShippingBar({ className: 'my-custom-class' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('bg-white');
      expect(container).toHaveClass('my-custom-class');
    });
  });

  // ==========================================================================
  // Progress Bar Color Gradient
  // ==========================================================================

  describe('Progress Bar Color Gradient', () => {
    it('should have gray gradient for low progress (0-25%)', () => {
      const { container } = renderFreeShippingBar({ currentTotal: 10, threshold: 100 });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const progressFill = container.querySelector('.from-gray-300');
      expect(progressFill).toBeInTheDocument();
    });

    it('should have indigo gradient for 25-50% progress', () => {
      const { container } = renderFreeShippingBar({ currentTotal: 30, threshold: 100 });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const progressFill = container.querySelector('.from-indigo-400');
      expect(progressFill).toBeInTheDocument();
    });

    it('should have blue gradient for 50-75% progress', () => {
      const { container } = renderFreeShippingBar({ currentTotal: 60, threshold: 100 });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const progressFill = container.querySelector('.from-blue-400');
      expect(progressFill).toBeInTheDocument();
    });

    it('should have emerald gradient for 75-100% progress', () => {
      const { container } = renderFreeShippingBar({ currentTotal: 80, threshold: 100 });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const progressFill = container.querySelector('.from-emerald-400');
      expect(progressFill).toBeInTheDocument();
    });

    it('should have green gradient when threshold is met', () => {
      const { container } = renderFreeShippingBar({ currentTotal: 100, threshold: 100 });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const progressFill = container.querySelector('.from-green-400');
      expect(progressFill).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle threshold of 0 gracefully', () => {
      renderFreeShippingBar({ currentTotal: 10, threshold: 0 });

      // Should show threshold met (anything / 0 is technically infinity, but we cap at 100%)
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should handle very large amounts', () => {
      renderFreeShippingBar({ currentTotal: 9999.99, threshold: 10000 });

      expect(screen.getByText('$0.01')).toBeInTheDocument();
    });

    it('should handle negative currentTotal as 0 remaining', () => {
      renderFreeShippingBar({ currentTotal: -10, threshold: 100 });

      // Remaining should be full threshold
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('should handle decimal threshold correctly', () => {
      renderFreeShippingBar({ currentTotal: 25.5, threshold: 50.75 });

      // Remaining should be $25.25
      expect(screen.getByText('$25.25')).toBeInTheDocument();
    });

    it('should handle exactly meeting threshold', () => {
      renderFreeShippingBar({ currentTotal: 100, threshold: 100 });

      expect(screen.getByText("You've unlocked FREE shipping!")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // CSS Classes Integrity
  // ==========================================================================

  describe('CSS Classes Integrity', () => {
    it('should have rounded corners on bar variant', () => {
      renderFreeShippingBar({ variant: 'bar' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('rounded-lg');
    });

    it('should have rounded-full on compact variant', () => {
      renderFreeShippingBar({ variant: 'compact' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('rounded-full');
    });

    it('should have shadow on floating variant', () => {
      renderFreeShippingBar({ variant: 'floating' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('shadow-lg');
    });

    it('should have z-50 on floating variant', () => {
      renderFreeShippingBar({ variant: 'floating' });

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('z-50');
    });

    it('should have border styling', () => {
      renderFreeShippingBar();

      const container = screen.getByTestId('free-shipping-bar');
      expect(container).toHaveClass('border');
      expect(container).toHaveClass('border-gray-200');
    });
  });

  // ==========================================================================
  // Icon Visibility
  // ==========================================================================

  describe('Icon Visibility', () => {
    it('should show icon by default in bar variant', () => {
      const { container } = renderFreeShippingBar({ variant: 'bar' });

      // Should have truck SVG path
      const truckPath = container.querySelector('path[d*="M13 16V6"]');
      expect(truckPath).toBeInTheDocument();
    });

    it('should show icon by default in compact variant', () => {
      const { container } = renderFreeShippingBar({ variant: 'compact' });

      const truckPath = container.querySelector('path[d*="M13 16V6"]');
      expect(truckPath).toBeInTheDocument();
    });

    it('should show icon by default in floating variant', () => {
      const { container } = renderFreeShippingBar({ variant: 'floating' });

      const truckPath = container.querySelector('path[d*="M13 16V6"]');
      expect(truckPath).toBeInTheDocument();
    });

    it('should hide icon in all variants when showIcon is false', () => {
      const variants: Array<'bar' | 'compact' | 'floating'> = [
        'bar',
        'compact',
        'floating',
      ];

      variants.forEach((variant) => {
        const { container, unmount } = renderFreeShippingBar({
          variant,
          showIcon: false,
        });

        const truckPath = container.querySelector('path[d*="M13 16V6"]');
        expect(truckPath).not.toBeInTheDocument();

        unmount();
      });
    });
  });
});
