/**
 * Unit tests for ScarcityBadge component
 *
 * Tests cover:
 * - Display logic (out of stock, critical, low stock, available)
 * - Variants (badge, inline, tooltip)
 * - Animation behavior
 * - Accessibility (ARIA labels, role="status")
 * - Dark mode support (CSS classes)
 * - showExact prop behavior
 * - Custom threshold
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScarcityBadge, ScarcityBadgeProps } from './scarcity-badge';

// ============================================================================
// Test Fixtures
// ============================================================================

const defaultProps: ScarcityBadgeProps = {
  quantity: 5,
};

// Helper to render ScarcityBadge with default props
const renderScarcityBadge = (propsOverrides: Partial<ScarcityBadgeProps> = {}) => {
  return render(<ScarcityBadge {...defaultProps} {...propsOverrides} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('ScarcityBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Display Logic - Out of Stock (quantity <= 0)
  // ==========================================================================

  describe('display logic - out of stock (quantity <= 0)', () => {
    it('should display "Out of Stock" when quantity is 0', () => {
      renderScarcityBadge({ quantity: 0 });

      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('should display "Out of Stock" when quantity is negative', () => {
      renderScarcityBadge({ quantity: -5 });

      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('should use red styling for out of stock', () => {
      const { container } = renderScarcityBadge({ quantity: 0 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });

    it('should include dark mode classes for out of stock', () => {
      const { container } = renderScarcityBadge({ quantity: 0 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('dark:bg-red-900/30');
      expect(badge).toHaveClass('dark:text-red-300');
    });

    it('should have ExclamationTriangleIcon for out of stock', () => {
      const { container } = renderScarcityBadge({ quantity: 0 });

      // Find SVG icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ==========================================================================
  // Display Logic - Critical Stock (quantity <= 3)
  // ==========================================================================

  describe('display logic - critical stock (quantity <= 3)', () => {
    it('should display "Only X left!" when quantity is 1', () => {
      renderScarcityBadge({ quantity: 1, showExact: true });

      expect(screen.getByText('Only 1 left!')).toBeInTheDocument();
    });

    it('should display "Only X left!" when quantity is 2', () => {
      renderScarcityBadge({ quantity: 2, showExact: true });

      expect(screen.getByText('Only 2 left!')).toBeInTheDocument();
    });

    it('should display "Only X left!" when quantity is 3', () => {
      renderScarcityBadge({ quantity: 3, showExact: true });

      expect(screen.getByText('Only 3 left!')).toBeInTheDocument();
    });

    it('should display "Only a few left!" when showExact is false', () => {
      renderScarcityBadge({ quantity: 2, showExact: false });

      expect(screen.getByText('Only a few left!')).toBeInTheDocument();
    });

    it('should use red styling for critical stock', () => {
      const { container } = renderScarcityBadge({ quantity: 2 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });

    it('should have FireIcon for critical stock', () => {
      const { container } = renderScarcityBadge({ quantity: 2 });

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-red-600');
    });

    it('should have pulse animation for critical stock when animate is true', () => {
      const { container } = renderScarcityBadge({ quantity: 2, animate: true });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('motion-safe:animate-pulse');
    });

    it('should not have pulse animation for critical stock when animate is false', () => {
      const { container } = renderScarcityBadge({ quantity: 2, animate: false });

      const badge = container.querySelector('[role="status"]');
      expect(badge).not.toHaveClass('motion-safe:animate-pulse');
    });
  });

  // ==========================================================================
  // Display Logic - Low Stock (quantity <= threshold)
  // ==========================================================================

  describe('display logic - low stock (quantity <= threshold)', () => {
    it('should display "Low stock - X remaining" when showExact is true', () => {
      renderScarcityBadge({ quantity: 7, threshold: 10, showExact: true });

      expect(screen.getByText('Low stock - 7 remaining')).toBeInTheDocument();
    });

    it('should display "Low stock" when showExact is false', () => {
      renderScarcityBadge({ quantity: 7, threshold: 10, showExact: false });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should use amber styling for low stock', () => {
      const { container } = renderScarcityBadge({ quantity: 5, threshold: 10 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-800');
    });

    it('should include dark mode classes for low stock', () => {
      const { container } = renderScarcityBadge({ quantity: 5, threshold: 10 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('dark:bg-amber-900/30');
      expect(badge).toHaveClass('dark:text-amber-300');
    });

    it('should not have pulse animation for low stock', () => {
      const { container } = renderScarcityBadge({ quantity: 5, threshold: 10, animate: true });

      const badge = container.querySelector('[role="status"]');
      expect(badge).not.toHaveClass('motion-safe:animate-pulse');
    });

    it('should show low stock at threshold boundary', () => {
      renderScarcityBadge({ quantity: 10, threshold: 10 });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should show low stock at quantity 4 (just above critical)', () => {
      renderScarcityBadge({ quantity: 4 });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Display Logic - Available (quantity > threshold)
  // ==========================================================================

  describe('display logic - available (quantity > threshold)', () => {
    it('should return null when quantity is above threshold', () => {
      const { container } = renderScarcityBadge({ quantity: 15, threshold: 10 });

      expect(container.firstChild).toBeNull();
    });

    it('should return null when quantity is 11 with default threshold 10', () => {
      const { container } = renderScarcityBadge({ quantity: 11 });

      expect(container.firstChild).toBeNull();
    });

    it('should return null when quantity is 100', () => {
      const { container } = renderScarcityBadge({ quantity: 100 });

      expect(container.firstChild).toBeNull();
    });

    it('should not render any content when quantity is above threshold', () => {
      const { container } = renderScarcityBadge({ quantity: 50 });

      expect(container.innerHTML).toBe('');
    });
  });

  // ==========================================================================
  // Variant - Badge (default)
  // ==========================================================================

  describe('variant - badge (default)', () => {
    it('should render as badge by default', () => {
      const { container } = renderScarcityBadge({ quantity: 5 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-1');
    });

    it('should render as badge when variant is "badge"', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'badge' });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('rounded-full');
    });

    it('should have pill styling with inline-flex', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'badge' });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
    });

    it('should have text-xs font size', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'badge' });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
    });

    it('should have gap between icon and text', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'badge' });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('gap-1.5');
    });
  });

  // ==========================================================================
  // Variant - Inline
  // ==========================================================================

  describe('variant - inline', () => {
    it('should render inline variant with text and icon', () => {
      renderScarcityBadge({ quantity: 5, variant: 'inline' });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should have text-sm font size for inline variant', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'inline' });

      const inline = container.querySelector('[role="status"]');
      expect(inline).toHaveClass('text-sm');
    });

    it('should not have background for inline variant', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'inline' });

      const inline = container.querySelector('[role="status"]');
      expect(inline).not.toHaveClass('bg-amber-100');
    });

    it('should have inline-flex layout for inline variant', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'inline' });

      const inline = container.querySelector('[role="status"]');
      expect(inline).toHaveClass('inline-flex');
      expect(inline).toHaveClass('items-center');
    });

    it('should have gap between icon and text in inline variant', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'inline' });

      const inline = container.querySelector('[role="status"]');
      expect(inline).toHaveClass('gap-2');
    });

    it('should have pulse animation in inline variant for critical stock', () => {
      const { container } = renderScarcityBadge({ quantity: 2, variant: 'inline', animate: true });

      const inline = container.querySelector('[role="status"]');
      expect(inline).toHaveClass('motion-safe:animate-pulse');
    });
  });

  // ==========================================================================
  // Variant - Tooltip
  // ==========================================================================

  describe('variant - tooltip', () => {
    it('should render tooltip variant with icon button', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const button = container.querySelector('button[role="status"]');
      expect(button).toBeInTheDocument();
    });

    it('should have circular button style', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const button = container.querySelector('button[role="status"]');
      expect(button).toHaveClass('w-6');
      expect(button).toHaveClass('h-6');
      expect(button).toHaveClass('rounded-full');
    });

    it('should have cursor-help style', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const button = container.querySelector('button[role="status"]');
      expect(button).toHaveClass('cursor-help');
    });

    it('should show tooltip on mouse enter', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(wrapper);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should show tooltip on focus', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.focus(wrapper);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('should hide tooltip on blur', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.focus(wrapper);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.blur(wrapper);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should have tooltip arrow', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const arrow = container.querySelector('.border-t-gray-900');
      expect(arrow).toBeInTheDocument();
    });

    it('should have tooltip positioned above button', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('bottom-full');
      expect(tooltip).toHaveClass('mb-2');
    });

    it('should have tooltip centered horizontally', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('left-1/2');
      expect(tooltip).toHaveClass('-translate-x-1/2');
    });

    it('should have focus ring styles on button', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const button = container.querySelector('button[role="status"]');
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-offset-2');
      expect(button).toHaveClass('focus:ring-amber-500');
    });

    it('should not show tooltip by default', () => {
      renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have role="status" for all variants', () => {
      renderScarcityBadge({ quantity: 5 });

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label for out of stock', () => {
      renderScarcityBadge({ quantity: 0 });

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'This item is currently out of stock');
    });

    it('should have aria-label for critical stock (singular)', () => {
      renderScarcityBadge({ quantity: 1 });

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Low stock warning: Only 1 item remaining');
    });

    it('should have aria-label for critical stock (plural)', () => {
      renderScarcityBadge({ quantity: 2 });

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Low stock warning: Only 2 items remaining');
    });

    it('should have aria-label for low stock', () => {
      renderScarcityBadge({ quantity: 5 });

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Low stock warning: 5 items remaining');
    });

    it('should have aria-hidden on icons', () => {
      const { container } = renderScarcityBadge({ quantity: 5 });

      const icons = container.querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have aria-describedby on tooltip variant when shown', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const button = container.querySelector('button[role="status"]');
      expect(button).toHaveAttribute('aria-describedby', 'scarcity-tooltip');
    });

    it('should not have aria-describedby on tooltip variant when hidden', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const button = container.querySelector('button[role="status"]');
      expect(button).not.toHaveAttribute('aria-describedby');
    });

    it('should have id on tooltip for aria-describedby reference', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('id', 'scarcity-tooltip');
    });
  });

  // ==========================================================================
  // Custom Threshold
  // ==========================================================================

  describe('custom threshold', () => {
    it('should use default threshold of 10', () => {
      renderScarcityBadge({ quantity: 10 });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should respect custom threshold of 5', () => {
      renderScarcityBadge({ quantity: 5, threshold: 5 });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should not show badge when quantity exceeds custom threshold', () => {
      const { container } = renderScarcityBadge({ quantity: 6, threshold: 5 });

      expect(container.firstChild).toBeNull();
    });

    it('should show badge at custom threshold boundary', () => {
      renderScarcityBadge({ quantity: 20, threshold: 20 });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should handle threshold of 0', () => {
      const { container } = renderScarcityBadge({ quantity: 1, threshold: 0 });

      // quantity 1 is critical (<=3), so should still show
      expect(screen.getByText('Only a few left!')).toBeInTheDocument();
    });

    it('should handle very high threshold', () => {
      renderScarcityBadge({ quantity: 99, threshold: 100 });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // showExact Prop
  // ==========================================================================

  describe('showExact prop', () => {
    it('should show generic message when showExact is false (default)', () => {
      renderScarcityBadge({ quantity: 5 });

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('should show exact count when showExact is true', () => {
      renderScarcityBadge({ quantity: 5, showExact: true });

      expect(screen.getByText('Low stock - 5 remaining')).toBeInTheDocument();
    });

    it('should show "Only X left!" for critical with showExact', () => {
      renderScarcityBadge({ quantity: 2, showExact: true });

      expect(screen.getByText('Only 2 left!')).toBeInTheDocument();
    });

    it('should show "Only a few left!" for critical without showExact', () => {
      renderScarcityBadge({ quantity: 2, showExact: false });

      expect(screen.getByText('Only a few left!')).toBeInTheDocument();
    });

    it('should always show "Out of Stock" regardless of showExact', () => {
      renderScarcityBadge({ quantity: 0, showExact: true });

      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Animation Prop
  // ==========================================================================

  describe('animate prop', () => {
    it('should have animation enabled by default', () => {
      const { container } = renderScarcityBadge({ quantity: 2 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('motion-safe:animate-pulse');
    });

    it('should disable animation when animate is false', () => {
      const { container } = renderScarcityBadge({ quantity: 2, animate: false });

      const badge = container.querySelector('[role="status"]');
      expect(badge).not.toHaveClass('motion-safe:animate-pulse');
    });

    it('should only animate for critical stock level', () => {
      const { container } = renderScarcityBadge({ quantity: 5, animate: true });

      const badge = container.querySelector('[role="status"]');
      expect(badge).not.toHaveClass('motion-safe:animate-pulse');
    });

    it('should animate icon for critical stock', () => {
      const { container } = renderScarcityBadge({ quantity: 2, animate: true });

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('motion-safe:animate-pulse');
    });
  });

  // ==========================================================================
  // Custom className
  // ==========================================================================

  describe('custom className', () => {
    it('should apply custom className to badge variant', () => {
      const { container } = renderScarcityBadge({ quantity: 5, className: 'custom-class' });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('custom-class');
    });

    it('should apply custom className to inline variant', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'inline', className: 'my-class' });

      const inline = container.querySelector('[role="status"]');
      expect(inline).toHaveClass('my-class');
    });

    it('should apply custom className to tooltip wrapper', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip', className: 'tooltip-class' });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('tooltip-class');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle quantity of exactly 3 (critical boundary)', () => {
      renderScarcityBadge({ quantity: 3, showExact: true });

      expect(screen.getByText('Only 3 left!')).toBeInTheDocument();
    });

    it('should handle quantity of exactly 4 (low stock boundary)', () => {
      renderScarcityBadge({ quantity: 4, showExact: true });

      expect(screen.getByText('Low stock - 4 remaining')).toBeInTheDocument();
    });

    it('should handle very large quantities gracefully', () => {
      const { container } = renderScarcityBadge({ quantity: 1000000 });

      expect(container.firstChild).toBeNull();
    });

    it('should handle rapid mouse enter/leave on tooltip', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;

      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);
      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should handle threshold equal to 3 (critical boundary)', () => {
      renderScarcityBadge({ quantity: 3, threshold: 3, showExact: true });

      // Should be critical since quantity <= 3
      expect(screen.getByText('Only 3 left!')).toBeInTheDocument();
    });

    it('should handle threshold less than 3', () => {
      renderScarcityBadge({ quantity: 2, threshold: 1 });

      // Should be critical regardless of threshold
      expect(screen.getByText('Only a few left!')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // CSS Classes Integrity
  // ==========================================================================

  describe('CSS classes integrity', () => {
    it('should have proper badge styling classes', () => {
      const { container } = renderScarcityBadge({ quantity: 5 });

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('gap-1.5');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
      expect(badge).toHaveClass('rounded-full');
    });

    it('should have proper tooltip styling classes', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('absolute');
      expect(tooltip).toHaveClass('z-10');
      expect(tooltip).toHaveClass('px-3');
      expect(tooltip).toHaveClass('py-2');
      expect(tooltip).toHaveClass('text-xs');
      expect(tooltip).toHaveClass('font-medium');
      expect(tooltip).toHaveClass('text-white');
      expect(tooltip).toHaveClass('bg-gray-900');
      expect(tooltip).toHaveClass('rounded-lg');
      expect(tooltip).toHaveClass('shadow-lg');
    });

    it('should have icon sizing classes', () => {
      const { container } = renderScarcityBadge({ quantity: 5 });

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('h-4');
      expect(icon).toHaveClass('w-4');
    });

    it('should have transition classes on tooltip button', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const button = container.querySelector('button[role="status"]');
      expect(button).toHaveClass('transition-colors');
    });

    it('should have pointer-events-none on tooltip to prevent flicker', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('pointer-events-none');
    });

    it('should have animation classes on tooltip', () => {
      const { container } = renderScarcityBadge({ quantity: 5, variant: 'tooltip' });

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(wrapper);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('animate-in');
      expect(tooltip).toHaveClass('fade-in');
      expect(tooltip).toHaveClass('duration-150');
    });
  });

  // ==========================================================================
  // Integration with Different Stock Levels
  // ==========================================================================

  describe('integration - full stock level progression', () => {
    it('should correctly transition through stock levels', () => {
      // Out of stock
      const { rerender } = render(<ScarcityBadge quantity={0} showExact />);
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();

      // Critical
      rerender(<ScarcityBadge quantity={2} showExact />);
      expect(screen.getByText('Only 2 left!')).toBeInTheDocument();

      // Low stock
      rerender(<ScarcityBadge quantity={7} showExact />);
      expect(screen.getByText('Low stock - 7 remaining')).toBeInTheDocument();

      // Available (no render)
      rerender(<ScarcityBadge quantity={15} showExact />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
