import React from 'react';
import { render, screen } from '@testing-library/react';
import { LandingPageScarcityBadge } from './landing-page-scarcity-badge';

// ============================================================================
// Tests
// ============================================================================

describe('LandingPageScarcityBadge', () => {
  // -------------------------------------------------------------------------
  // Visibility Tests
  // -------------------------------------------------------------------------

  describe('Visibility', () => {
    it('does not render when stock is healthy (above threshold)', () => {
      render(<LandingPageScarcityBadge stock={50} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders when stock is low (at threshold)', () => {
      render(<LandingPageScarcityBadge stock={10} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders when stock is very low', () => {
      render(<LandingPageScarcityBadge stock={2} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders when out of stock', () => {
      render(<LandingPageScarcityBadge stock={0} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Message Tests
  // -------------------------------------------------------------------------

  describe('Messages', () => {
    it('shows exact count for low stock by default', () => {
      render(<LandingPageScarcityBadge stock={7} />);

      expect(screen.getByText('Only 7 left')).toBeInTheDocument();
    });

    it('shows exact count for very low stock with exclamation', () => {
      render(<LandingPageScarcityBadge stock={2} />);

      expect(screen.getByText('Only 2 left!')).toBeInTheDocument();
    });

    it('shows out of stock message', () => {
      render(<LandingPageScarcityBadge stock={0} />);

      expect(screen.getByText('Out of stock')).toBeInTheDocument();
    });

    it('shows vague message when showExactCount is false', () => {
      render(<LandingPageScarcityBadge stock={5} showExactCount={false} />);

      expect(screen.getByText('Low stock')).toBeInTheDocument();
    });

    it('shows "Almost gone!" for very low stock without exact count', () => {
      render(<LandingPageScarcityBadge stock={2} showExactCount={false} />);

      expect(screen.getByText('Almost gone!')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Threshold Tests
  // -------------------------------------------------------------------------

  describe('Thresholds', () => {
    it('uses custom lowStockThreshold', () => {
      // Stock of 15 should not show with default threshold (10)
      const { rerender } = render(<LandingPageScarcityBadge stock={15} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      // Stock of 15 should show with higher threshold (20)
      rerender(<LandingPageScarcityBadge stock={15} lowStockThreshold={20} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('uses custom veryLowThreshold', () => {
      // Stock of 4 shows as "low" by default (veryLow is 3)
      const { rerender } = render(<LandingPageScarcityBadge stock={4} />);
      expect(screen.getByText('Only 4 left')).toBeInTheDocument();

      // Stock of 4 shows as "very low" with higher threshold (5)
      rerender(<LandingPageScarcityBadge stock={4} veryLowThreshold={5} />);
      expect(screen.getByText('Only 4 left!')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Variant Tests
  // -------------------------------------------------------------------------

  describe('Variants', () => {
    it('applies badge variant styles', () => {
      render(<LandingPageScarcityBadge stock={5} variant="badge" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('rounded-md');
    });

    it('applies inline variant styles', () => {
      render(<LandingPageScarcityBadge stock={5} variant="inline" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('inline-flex');
    });

    it('applies pill variant styles', () => {
      render(<LandingPageScarcityBadge stock={5} variant="pill" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('rounded-full');
    });
  });

  // -------------------------------------------------------------------------
  // Styling Tests
  // -------------------------------------------------------------------------

  describe('Styling', () => {
    it('applies amber color for low stock', () => {
      render(<LandingPageScarcityBadge stock={5} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-amber-50');
    });

    it('applies red color for very low stock', () => {
      render(<LandingPageScarcityBadge stock={2} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-red-50');
    });

    it('applies gray color for out of stock', () => {
      render(<LandingPageScarcityBadge stock={0} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-gray-100');
    });

    it('applies pulse animation for very low stock', () => {
      render(<LandingPageScarcityBadge stock={2} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('does not apply pulse animation for low stock', () => {
      render(<LandingPageScarcityBadge stock={7} />);

      const badge = screen.getByRole('status');
      expect(badge).not.toHaveClass('animate-pulse');
    });

    it('applies custom className', () => {
      render(<LandingPageScarcityBadge stock={5} className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility Tests
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<LandingPageScarcityBadge stock={5} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      render(<LandingPageScarcityBadge stock={5} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });
  });
});
