/**
 * Unit tests for DemoBadge component
 *
 * Tests cover:
 * 1. Badge visibility when isVisible=true
 * 2. Badge hidden when isVisible=false
 * 3. Badge hidden after dismiss button clicked
 * 4. Different positions (top-right, top-left, bottom-right, bottom-left)
 * 5. Tooltip appears on hover
 * 6. Tooltip hidden by default
 * 7. Custom tooltip message
 * 8. shouldShowDemoMode helper function with various slug patterns
 * 9. shouldShowDemoMode returns false for normal slugs
 * 10. Dismiss button works with dismissible=true
 * 11. No dismiss button when dismissible=false
 * 12. Accessibility - proper ARIA labels
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemoBadge, shouldShowDemoMode } from './demo-badge';

// ============================================================================
// Test Fixtures
// ============================================================================

interface TestDemoBadgeProps {
  isVisible?: boolean;
  tooltipMessage?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  dismissible?: boolean;
}

const defaultProps: TestDemoBadgeProps = {
  isVisible: true,
  tooltipMessage: 'This is a demo funnel. Data resets periodically.',
  position: 'top-right',
  dismissible: true,
};

// Helper to render DemoBadge with default props
const renderDemoBadge = (propsOverrides: TestDemoBadgeProps = {}) => {
  return render(<DemoBadge {...defaultProps} {...propsOverrides} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('DemoBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Badge Visibility - isVisible=true
  // ==========================================================================

  describe('badge visibility when isVisible=true', () => {
    it('should render the badge when isVisible is true', () => {
      renderDemoBadge({ isVisible: true });

      expect(screen.getByText('DEMO')).toBeInTheDocument();
    });

    it('should render the badge by default (isVisible defaults to true)', () => {
      render(<DemoBadge />);

      expect(screen.getByText('DEMO')).toBeInTheDocument();
    });

    it('should render the information icon', () => {
      const { container } = renderDemoBadge({ isVisible: true });

      // Find the InformationCircleIcon SVG
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have fixed positioning', () => {
      const { container } = renderDemoBadge({ isVisible: true });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('fixed');
    });

    it('should have high z-index (z-50)', () => {
      const { container } = renderDemoBadge({ isVisible: true });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('z-50');
    });
  });

  // ==========================================================================
  // Badge Visibility - isVisible=false
  // ==========================================================================

  describe('badge hidden when isVisible=false', () => {
    it('should not render the badge when isVisible is false', () => {
      renderDemoBadge({ isVisible: false });

      expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
    });

    it('should return null when isVisible is false', () => {
      const { container } = renderDemoBadge({ isVisible: false });

      expect(container.firstChild).toBeNull();
    });

    it('should not render any content when isVisible is false', () => {
      const { container } = renderDemoBadge({ isVisible: false });

      expect(container.innerHTML).toBe('');
    });
  });

  // ==========================================================================
  // Badge Dismissal
  // ==========================================================================

  describe('badge hidden after dismiss button clicked', () => {
    it('should hide the badge after dismiss button is clicked', () => {
      renderDemoBadge({ dismissible: true });

      // Badge should be visible initially
      expect(screen.getByText('DEMO')).toBeInTheDocument();

      // Click dismiss button
      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      fireEvent.click(dismissButton);

      // Badge should be hidden
      expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
    });

    it('should remain hidden after dismiss', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      fireEvent.click(dismissButton);

      // Verify it stays hidden
      expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Dismiss demo badge' })).not.toBeInTheDocument();
    });

    it('should hide tooltip when badge is dismissed', () => {
      const { container } = renderDemoBadge({ dismissible: true });

      // Trigger hover to show tooltip
      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      // Dismiss the badge
      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      fireEvent.click(dismissButton);

      // Everything should be hidden
      expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Position Classes
  // ==========================================================================

  describe('different positions', () => {
    it('should position at top-right by default', () => {
      const { container } = renderDemoBadge({ position: 'top-right' });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('top-4');
      expect(wrapper).toHaveClass('right-4');
    });

    it('should position at top-left when specified', () => {
      const { container } = renderDemoBadge({ position: 'top-left' });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('top-4');
      expect(wrapper).toHaveClass('left-4');
    });

    it('should position at bottom-right when specified', () => {
      const { container } = renderDemoBadge({ position: 'bottom-right' });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bottom-4');
      expect(wrapper).toHaveClass('right-4');
    });

    it('should position at bottom-left when specified', () => {
      const { container } = renderDemoBadge({ position: 'bottom-left' });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bottom-4');
      expect(wrapper).toHaveClass('left-4');
    });

    it('should default to top-right when no position is specified', () => {
      const { container } = render(<DemoBadge />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('top-4');
      expect(wrapper).toHaveClass('right-4');
    });
  });

  // ==========================================================================
  // Tooltip on Hover
  // ==========================================================================

  describe('tooltip appears on hover', () => {
    it('should show tooltip on mouseEnter', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    });

    it('should show tooltip message on hover', () => {
      const { container } = renderDemoBadge({
        tooltipMessage: 'Test message for tooltip',
      });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText('Test message for tooltip')).toBeInTheDocument();
    });

    it('should show test card number in tooltip', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText('4111 1111 1111 1111')).toBeInTheDocument();
    });

    it('should show "Test card:" label in tooltip', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText('Test card:')).toBeInTheDocument();
    });

    it('should hide tooltip on mouseLeave', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;

      // Show tooltip
      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText('Demo Mode')).toBeInTheDocument();

      // Hide tooltip
      fireEvent.mouseLeave(wrapper);
      expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Tooltip Hidden by Default
  // ==========================================================================

  describe('tooltip hidden by default', () => {
    it('should not show tooltip without hover', () => {
      renderDemoBadge();

      expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument();
    });

    it('should not show tooltip message without hover', () => {
      renderDemoBadge({ tooltipMessage: 'Custom message' });

      expect(screen.queryByText('Custom message')).not.toBeInTheDocument();
    });

    it('should not show test card info without hover', () => {
      renderDemoBadge();

      expect(screen.queryByText('4111 1111 1111 1111')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Custom Tooltip Message
  // ==========================================================================

  describe('custom tooltip message', () => {
    it('should display custom tooltip message', () => {
      const customMessage = 'This is a custom demo message for testing purposes.';
      const { container } = renderDemoBadge({ tooltipMessage: customMessage });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should use default message when no custom message provided', () => {
      const { container } = render(<DemoBadge isVisible={true} />);

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText('This is a demo funnel. Data resets periodically.')).toBeInTheDocument();
    });

    it('should handle empty tooltip message', () => {
      const { container } = renderDemoBadge({ tooltipMessage: '' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      // Tooltip should still show with Demo Mode header
      expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    });

    it('should handle long tooltip message', () => {
      const longMessage = 'This is a very long tooltip message that contains a lot of information about the demo mode and how it works and why data resets periodically.';
      const { container } = renderDemoBadge({ tooltipMessage: longMessage });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Tooltip Position Classes
  // ==========================================================================

  describe('tooltip position matches badge position', () => {
    it('should position tooltip below badge for top-right', () => {
      const { container } = renderDemoBadge({ position: 'top-right' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = container.querySelector('.w-64');
      expect(tooltip).toHaveClass('top-full');
      expect(tooltip).toHaveClass('mt-2');
      expect(tooltip).toHaveClass('right-0');
    });

    it('should position tooltip below badge for top-left', () => {
      const { container } = renderDemoBadge({ position: 'top-left' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = container.querySelector('.w-64');
      expect(tooltip).toHaveClass('top-full');
      expect(tooltip).toHaveClass('mt-2');
      expect(tooltip).toHaveClass('left-0');
    });

    it('should position tooltip above badge for bottom-right', () => {
      const { container } = renderDemoBadge({ position: 'bottom-right' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = container.querySelector('.w-64');
      expect(tooltip).toHaveClass('bottom-full');
      expect(tooltip).toHaveClass('mb-2');
      expect(tooltip).toHaveClass('right-0');
    });

    it('should position tooltip above badge for bottom-left', () => {
      const { container } = renderDemoBadge({ position: 'bottom-left' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = container.querySelector('.w-64');
      expect(tooltip).toHaveClass('bottom-full');
      expect(tooltip).toHaveClass('mb-2');
      expect(tooltip).toHaveClass('left-0');
    });
  });

  // ==========================================================================
  // Dismiss Button with dismissible=true
  // ==========================================================================

  describe('dismiss button works with dismissible=true', () => {
    it('should render dismiss button when dismissible is true', () => {
      renderDemoBadge({ dismissible: true });

      expect(screen.getByRole('button', { name: 'Dismiss demo badge' })).toBeInTheDocument();
    });

    it('should have XMarkIcon in dismiss button', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      const icon = dismissButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should dismiss badge on button click', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      fireEvent.click(dismissButton);

      expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
    });

    it('should have hover styles on dismiss button', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      expect(dismissButton).toHaveClass('hover:bg-amber-600/50');
    });

    it('should have transition class on dismiss button', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      expect(dismissButton).toHaveClass('transition-colors');
    });
  });

  // ==========================================================================
  // No Dismiss Button when dismissible=false
  // ==========================================================================

  describe('no dismiss button when dismissible=false', () => {
    it('should not render dismiss button when dismissible is false', () => {
      renderDemoBadge({ dismissible: false });

      expect(screen.queryByRole('button', { name: 'Dismiss demo badge' })).not.toBeInTheDocument();
    });

    it('should still render the badge without dismiss button', () => {
      renderDemoBadge({ dismissible: false });

      expect(screen.getByText('DEMO')).toBeInTheDocument();
    });

    it('should still show tooltip when dismissible is false', () => {
      const { container } = renderDemoBadge({ dismissible: false });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    });

    it('should default dismissible to true', () => {
      render(<DemoBadge isVisible={true} />);

      expect(screen.getByRole('button', { name: 'Dismiss demo badge' })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility - proper ARIA labels', () => {
    it('should have aria-label on dismiss button', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss demo badge');
    });

    it('should have button role on dismiss element', () => {
      renderDemoBadge({ dismissible: true });

      expect(screen.getByRole('button', { name: 'Dismiss demo badge' })).toBeInTheDocument();
    });

    it('should have aria-hidden on decorative icons in badge', () => {
      const { container } = renderDemoBadge();

      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        // All icons should be decorative
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have semantic structure for tooltip content', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      // Demo Mode should be a heading-like element
      const demoModeText = screen.getByText('Demo Mode');
      expect(demoModeText).toHaveClass('font-medium');
    });

    it('should be keyboard focusable via dismiss button', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      dismissButton.focus();

      expect(document.activeElement).toBe(dismissButton);
    });

    it('should have rounded-full class for proper visual button indication', () => {
      renderDemoBadge({ dismissible: true });

      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      expect(dismissButton).toHaveClass('rounded-full');
    });
  });

  // ==========================================================================
  // CSS Classes Integrity
  // ==========================================================================

  describe('CSS classes integrity', () => {
    it('should have proper badge styling', () => {
      const { container } = renderDemoBadge();

      const badge = container.querySelector('.bg-amber-500\\/90');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('backdrop-blur-sm');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('shadow-lg');
    });

    it('should have proper tooltip styling', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = container.querySelector('.bg-gray-900\\/95');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveClass('backdrop-blur-sm');
      expect(tooltip).toHaveClass('rounded-lg');
      expect(tooltip).toHaveClass('shadow-xl');
    });

    it('should have animation classes on tooltip', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = container.querySelector('.animate-in');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveClass('fade-in');
      expect(tooltip).toHaveClass('duration-200');
    });

    it('should have flex layout on wrapper', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('gap-2');
    });

    it('should have relative positioning on badge container', () => {
      const { container } = renderDemoBadge();

      const badgeContainer = container.querySelector('.relative');
      expect(badgeContainer).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid mouseEnter/mouseLeave', () => {
      const { container } = renderDemoBadge();

      const wrapper = container.firstChild as HTMLElement;

      // Rapid hover in/out
      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);
      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);

      // Tooltip should not be shown
      expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument();
    });

    it('should handle dismiss followed by re-render', () => {
      const { rerender } = renderDemoBadge({ dismissible: true });

      // Dismiss the badge
      const dismissButton = screen.getByRole('button', { name: 'Dismiss demo badge' });
      fireEvent.click(dismissButton);

      expect(screen.queryByText('DEMO')).not.toBeInTheDocument();

      // Re-render with same props (component state persists)
      rerender(<DemoBadge {...defaultProps} dismissible={true} />);

      // Badge should still be hidden due to internal state
      expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
    });

    it('should handle both isVisible false and dismissed state', () => {
      renderDemoBadge({ isVisible: false, dismissible: true });

      // Should not render anything
      expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// shouldShowDemoMode Helper Function Tests
// ============================================================================

describe('shouldShowDemoMode', () => {
  // ==========================================================================
  // Demo Patterns
  // ==========================================================================

  describe('detects demo patterns in slugs', () => {
    it('should return true for slug containing "demo"', () => {
      expect(shouldShowDemoMode('demo-funnel')).toBe(true);
    });

    it('should return true for slug containing "test"', () => {
      expect(shouldShowDemoMode('test-funnel')).toBe(true);
    });

    it('should return true for slug containing "sample"', () => {
      expect(shouldShowDemoMode('sample-funnel')).toBe(true);
    });

    it('should return true for slug containing "example"', () => {
      expect(shouldShowDemoMode('example-funnel')).toBe(true);
    });

    it('should be case insensitive for "DEMO"', () => {
      expect(shouldShowDemoMode('DEMO-FUNNEL')).toBe(true);
    });

    it('should be case insensitive for "Test"', () => {
      expect(shouldShowDemoMode('Test-Funnel')).toBe(true);
    });

    it('should be case insensitive for "SAMPLE"', () => {
      expect(shouldShowDemoMode('SAMPLE-PAGE')).toBe(true);
    });

    it('should be case insensitive for "Example"', () => {
      expect(shouldShowDemoMode('Example-Page')).toBe(true);
    });

    it('should detect pattern anywhere in slug', () => {
      expect(shouldShowDemoMode('my-demo-page')).toBe(true);
      expect(shouldShowDemoMode('funnel-test-v2')).toBe(true);
      expect(shouldShowDemoMode('product-sample-1')).toBe(true);
      expect(shouldShowDemoMode('checkout-example')).toBe(true);
    });

    it('should detect pattern at the end of slug', () => {
      expect(shouldShowDemoMode('page-demo')).toBe(true);
      expect(shouldShowDemoMode('funnel-test')).toBe(true);
    });

    it('should detect exact pattern match', () => {
      expect(shouldShowDemoMode('demo')).toBe(true);
      expect(shouldShowDemoMode('test')).toBe(true);
      expect(shouldShowDemoMode('sample')).toBe(true);
      expect(shouldShowDemoMode('example')).toBe(true);
    });
  });

  // ==========================================================================
  // Normal Slugs
  // ==========================================================================

  describe('returns false for normal slugs', () => {
    it('should return false for regular slug', () => {
      expect(shouldShowDemoMode('my-awesome-funnel')).toBe(false);
    });

    it('should return false for product slug', () => {
      expect(shouldShowDemoMode('premium-coffee-bundle')).toBe(false);
    });

    it('should return false for numeric slug', () => {
      expect(shouldShowDemoMode('funnel-12345')).toBe(false);
    });

    it('should return false for empty slug', () => {
      expect(shouldShowDemoMode('')).toBe(false);
    });

    it('should return false for undefined slug without isDemoMode', () => {
      expect(shouldShowDemoMode(undefined)).toBe(false);
    });

    it('should return false for slug without demo patterns', () => {
      expect(shouldShowDemoMode('checkout-flow')).toBe(false);
      expect(shouldShowDemoMode('landing-page-v2')).toBe(false);
      expect(shouldShowDemoMode('product-launch')).toBe(false);
    });

    it('should match substrings containing the pattern', () => {
      expect(shouldShowDemoMode('demonstration')).toBe(true); // Contains 'demo'
      expect(shouldShowDemoMode('testimony')).toBe(true); // Contains 'test'
      expect(shouldShowDemoMode('sampler')).toBe(true); // Contains 'sample'
      expect(shouldShowDemoMode('forexample')).toBe(true); // Contains 'example'
    });

    it('should return false for words that do not contain patterns', () => {
      expect(shouldShowDemoMode('production')).toBe(false);
      expect(shouldShowDemoMode('live-funnel')).toBe(false);
      expect(shouldShowDemoMode('real-checkout')).toBe(false);
    });
  });

  // ==========================================================================
  // Explicit isDemoMode Flag
  // ==========================================================================

  describe('explicit isDemoMode flag takes precedence', () => {
    it('should return true when isDemoMode is true regardless of slug', () => {
      expect(shouldShowDemoMode('production-funnel', true)).toBe(true);
    });

    it('should return false when isDemoMode is false regardless of slug', () => {
      expect(shouldShowDemoMode('demo-funnel', false)).toBe(false);
    });

    it('should return true when isDemoMode is true with undefined slug', () => {
      expect(shouldShowDemoMode(undefined, true)).toBe(true);
    });

    it('should return false when isDemoMode is false with undefined slug', () => {
      expect(shouldShowDemoMode(undefined, false)).toBe(false);
    });

    it('should check slug when isDemoMode is undefined', () => {
      expect(shouldShowDemoMode('demo-page', undefined)).toBe(true);
      expect(shouldShowDemoMode('live-page', undefined)).toBe(false);
    });

    it('should prioritize isDemoMode over slug pattern', () => {
      // isDemoMode true overrides non-demo slug
      expect(shouldShowDemoMode('live-funnel', true)).toBe(true);

      // isDemoMode false overrides demo slug
      expect(shouldShowDemoMode('test-funnel', false)).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle slug with only whitespace', () => {
      expect(shouldShowDemoMode('   ')).toBe(false);
    });

    it('should handle slug with special characters', () => {
      expect(shouldShowDemoMode('demo_funnel')).toBe(true);
      expect(shouldShowDemoMode('test.funnel')).toBe(true);
      expect(shouldShowDemoMode('sample+page')).toBe(true);
    });

    it('should handle slug with mixed case patterns', () => {
      expect(shouldShowDemoMode('DeMo-FuNnEl')).toBe(true);
      expect(shouldShowDemoMode('TeSt-PaGe')).toBe(true);
    });

    it('should handle very long slugs', () => {
      const longSlug = 'this-is-a-very-long-slug-that-contains-many-words-and-eventually-has-demo-somewhere-in-it';
      expect(shouldShowDemoMode(longSlug)).toBe(true);
    });

    it('should handle slugs with numbers mixed with patterns', () => {
      expect(shouldShowDemoMode('demo123')).toBe(true);
      expect(shouldShowDemoMode('123test456')).toBe(true);
      expect(shouldShowDemoMode('sample2024')).toBe(true);
    });

    it('should correctly identify pattern boundaries', () => {
      // Pattern as substring of other words
      expect(shouldShowDemoMode('demotion')).toBe(true); // Contains 'demo'
      expect(shouldShowDemoMode('contest')).toBe(true); // Contains 'test'
    });
  });
});
