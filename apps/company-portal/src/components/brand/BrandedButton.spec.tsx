/**
 * Unit tests for BrandedButton component
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandedButton, BrandedButtonProps } from './BrandedButton';

// ============================================================================
// Test Fixtures
// ============================================================================

const defaultProps: BrandedButtonProps = {
  children: 'Click Me',
};

// Helper to render with default props
const renderButton = (props: Partial<BrandedButtonProps> = {}) => {
  return render(<BrandedButton {...defaultProps} {...props} />);
};

// ============================================================================
// Tests
// ============================================================================

describe('BrandedButton', () => {
  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe('basic rendering', () => {
    it('should render children correctly', () => {
      renderButton({ children: 'Submit Order' });

      expect(screen.getByRole('button')).toHaveTextContent('Submit Order');
    });

    it('should render as a button element', () => {
      renderButton();

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should apply default type="button"', () => {
      renderButton();

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should apply custom type attribute', () => {
      renderButton({ type: 'submit' });

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should apply custom className', () => {
      renderButton({ className: 'custom-class another-class' });

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
      expect(button.className).toContain('another-class');
    });
  });

  // ==========================================================================
  // Variant Tests
  // ==========================================================================

  describe('renders with different variants', () => {
    it.each<NonNullable<BrandedButtonProps['variant']>>([
      'primary',
      'secondary',
      'accent',
      'outline',
      'ghost',
    ])('should render with variant "%s"', (variant) => {
      renderButton({ variant });

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply primary variant classes by default', () => {
      renderButton();

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-brand-primary');
      expect(button.className).toContain('text-white');
    });

    it('should apply secondary variant classes', () => {
      renderButton({ variant: 'secondary' });

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-brand-secondary');
      expect(button.className).toContain('text-white');
    });

    it('should apply accent variant classes', () => {
      renderButton({ variant: 'accent' });

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-brand-accent');
      expect(button.className).toContain('text-white');
    });

    it('should apply outline variant classes', () => {
      renderButton({ variant: 'outline' });

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('border-2');
      expect(button.className).toContain('border-brand-primary');
      expect(button.className).toContain('text-brand-primary');
    });

    it('should apply ghost variant classes', () => {
      renderButton({ variant: 'ghost' });

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('text-brand-primary');
    });
  });

  // ==========================================================================
  // Size Tests
  // ==========================================================================

  describe('renders with different sizes', () => {
    const SIZE_EXPECTATIONS: Record<
      NonNullable<BrandedButtonProps['size']>,
      { textClass: string; minHeight: string }
    > = {
      sm: { textClass: 'text-sm', minHeight: 'min-h-[44px]' }, // 44px for WCAG touch target
      md: { textClass: 'text-base', minHeight: 'min-h-[44px]' },
      lg: { textClass: 'text-lg', minHeight: 'min-h-[52px]' },
      xl: { textClass: 'text-xl', minHeight: 'min-h-[60px]' },
    };

    it.each<NonNullable<BrandedButtonProps['size']>>(['sm', 'md', 'lg', 'xl'])(
      'should render with size "%s"',
      (size) => {
        renderButton({ size });

        const button = screen.getByRole('button');
        const expected = SIZE_EXPECTATIONS[size];
        expect(button.className).toContain(expected.textClass);
        expect(button.className).toContain(expected.minHeight);
      }
    );

    it('should use default size "md" when size prop is not provided', () => {
      renderButton();

      const button = screen.getByRole('button');
      expect(button.className).toContain('text-base');
      expect(button.className).toContain('min-h-[44px]');
    });
  });

  // ==========================================================================
  // Disabled State Tests
  // ==========================================================================

  describe('disabled state', () => {
    it('should apply disabled attribute when disabled is true', () => {
      renderButton({ disabled: true });

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not be disabled by default', () => {
      renderButton();

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should apply disabled styling classes', () => {
      renderButton({ disabled: true });

      const button = screen.getByRole('button');
      expect(button.className).toContain('opacity-50');
      expect(button.className).toContain('cursor-not-allowed');
    });

    it('should set aria-disabled when disabled', () => {
      renderButton({ disabled: true });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not trigger onClick when disabled', () => {
      const handleClick = jest.fn();
      renderButton({ disabled: true, onClick: handleClick });

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('loading state', () => {
    it('should show loading spinner when loading is true', () => {
      renderButton({ loading: true });

      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should not show loading spinner when loading is false', () => {
      renderButton({ loading: false });

      const spinner = screen.getByRole('button').querySelector('svg.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      renderButton({ loading: true });

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should set aria-busy when loading', () => {
      renderButton({ loading: true });

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('should set aria-disabled when loading', () => {
      renderButton({ loading: true });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should set tabIndex to -1 when loading', () => {
      renderButton({ loading: true });

      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1');
    });

    it('should not set tabIndex when not loading', () => {
      renderButton({ loading: false });

      expect(screen.getByRole('button')).not.toHaveAttribute('tabIndex');
    });

    it('should apply disabled styling when loading', () => {
      renderButton({ loading: true });

      const button = screen.getByRole('button');
      expect(button.className).toContain('opacity-50');
      expect(button.className).toContain('cursor-not-allowed');
    });

    it('should still show children alongside spinner when loading', () => {
      renderButton({ loading: true, children: 'Processing...' });

      expect(screen.getByRole('button')).toHaveTextContent('Processing...');
    });

    it('should not trigger onClick when loading', () => {
      const handleClick = jest.fn();
      renderButton({ loading: true, onClick: handleClick });

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should render correct spinner size for sm button', () => {
      renderButton({ loading: true, size: 'sm' });

      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('should render correct spinner size for md button', () => {
      renderButton({ loading: true, size: 'md' });

      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toHaveClass('h-5', 'w-5');
    });

    it('should render correct spinner size for lg button', () => {
      renderButton({ loading: true, size: 'lg' });

      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toHaveClass('h-5', 'w-5');
    });

    it('should render correct spinner size for xl button', () => {
      renderButton({ loading: true, size: 'xl' });

      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('should have aria-hidden on spinner svg', () => {
      renderButton({ loading: true });

      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('should include sr-only text for screen readers when loading', () => {
      renderButton({ loading: true });

      const srText = screen.getByText('Loading, please wait');
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass('sr-only');
    });
  });

  // ==========================================================================
  // Full Width Tests
  // ==========================================================================

  describe('fullWidth prop', () => {
    it('should apply full width class when fullWidth is true', () => {
      renderButton({ fullWidth: true });

      expect(screen.getByRole('button').className).toContain('w-full');
    });

    it('should not apply full width class when fullWidth is false', () => {
      renderButton({ fullWidth: false });

      expect(screen.getByRole('button').className).not.toContain('w-full');
    });

    it('should not be full width by default', () => {
      renderButton();

      expect(screen.getByRole('button').className).not.toContain('w-full');
    });
  });

  // ==========================================================================
  // Click Handler Tests
  // ==========================================================================

  describe('onClick handler', () => {
    it('should call onClick when button is clicked', () => {
      const handleClick = jest.fn();
      renderButton({ onClick: handleClick });

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should pass event to onClick handler', () => {
      const handleClick = jest.fn();
      renderButton({ onClick: handleClick });

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should work without onClick handler', () => {
      expect(() => {
        renderButton();
        fireEvent.click(screen.getByRole('button'));
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have aria-busy="true" when loading', () => {
      renderButton({ loading: true });

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-busy="false" when not loading', () => {
      renderButton({ loading: false });

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
    });

    it('should have aria-disabled="true" when disabled', () => {
      renderButton({ disabled: true });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have aria-disabled="false" when not disabled', () => {
      renderButton({ disabled: false });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'false');
    });

    it('should have aria-disabled="true" when loading (even if disabled prop is false)', () => {
      renderButton({ loading: true, disabled: false });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have focus-visible ring classes', () => {
      renderButton();

      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-brand-primary');
    });

    it('should have touch-manipulation class for mobile accessibility', () => {
      renderButton();

      expect(screen.getByRole('button').className).toContain('touch-manipulation');
    });
  });

  // ==========================================================================
  // Ref Forwarding Tests
  // ==========================================================================

  describe('ref forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = createRef<HTMLButtonElement>();

      render(<BrandedButton ref={ref}>Click Me</BrandedButton>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.tagName).toBe('BUTTON');
    });

    it('should allow accessing button methods via ref', () => {
      const ref = createRef<HTMLButtonElement>();

      render(<BrandedButton ref={ref}>Click Me</BrandedButton>);

      expect(ref.current?.focus).toBeDefined();
      expect(ref.current?.click).toBeDefined();
    });

    it('should allow programmatic focus via ref', () => {
      const ref = createRef<HTMLButtonElement>();

      render(<BrandedButton ref={ref}>Click Me</BrandedButton>);

      ref.current?.focus();

      expect(document.activeElement).toBe(ref.current);
    });
  });

  // ==========================================================================
  // Combined States Tests
  // ==========================================================================

  describe('combined states', () => {
    it('should be disabled when both disabled and loading are true', () => {
      renderButton({ disabled: true, loading: true });

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show spinner and children when loading', () => {
      renderButton({ loading: true, children: 'Loading...' });

      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
      expect(button).toHaveTextContent('Loading...');
    });

    it('should apply all props correctly in combination', () => {
      renderButton({
        variant: 'outline',
        size: 'lg',
        fullWidth: true,
        className: 'custom-class',
      });

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('border-brand-primary');
      expect(button.className).toContain('text-lg');
      expect(button.className).toContain('w-full');
      expect(button.className).toContain('custom-class');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty children gracefully', () => {
      render(<BrandedButton>{''}</BrandedButton>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle React node children', () => {
      render(
        <BrandedButton>
          <span data-testid="icon">Icon</span>
          <span>Text</span>
        </BrandedButton>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveTextContent('IconText');
    });

    it('should handle undefined className gracefully', () => {
      renderButton({ className: undefined });

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle reset button type', () => {
      renderButton({ type: 'reset' });

      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });

    it('should maintain correct class order (custom classes last)', () => {
      renderButton({ className: 'custom-override' });

      const button = screen.getByRole('button');
      // Custom classes should be at the end, allowing potential overrides
      expect(button.className.endsWith('custom-override')).toBe(true);
    });
  });

  // ==========================================================================
  // CSS Classes Integrity
  // ==========================================================================

  describe('CSS classes integrity', () => {
    it('should always have base styling classes', () => {
      renderButton();

      const button = screen.getByRole('button');
      expect(button.className).toContain('inline-flex');
      expect(button.className).toContain('items-center');
      expect(button.className).toContain('justify-center');
      expect(button.className).toContain('font-medium');
      expect(button.className).toContain('rounded-lg');
      expect(button.className).toContain('transition-all');
    });

    it('should have cursor-pointer when interactive', () => {
      renderButton();

      expect(screen.getByRole('button').className).toContain('cursor-pointer');
    });

    it('should have cursor-not-allowed when not interactive', () => {
      renderButton({ disabled: true });

      expect(screen.getByRole('button').className).toContain('cursor-not-allowed');
    });

    it('should have active scale effect class', () => {
      renderButton();

      expect(screen.getByRole('button').className).toContain('active:scale-[0.98]');
    });
  });
});
