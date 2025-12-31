'use client';

import { forwardRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface BrandedButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state - shows spinner, disables interaction, and announces to screen readers. Consider updating button text (e.g., "Placing order...") */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

// ============================================================================
// Style Configuration
// ============================================================================

const SIZE_CLASSES: Record<NonNullable<BrandedButtonProps['size']>, string> = {
  sm: 'text-sm px-3 py-1.5 min-h-[44px]', // 44px minimum for WCAG touch target
  md: 'text-base px-4 py-2 min-h-[44px]',
  lg: 'text-lg px-6 py-3 min-h-[52px]',
  xl: 'text-xl px-8 py-4 min-h-[60px]',
};

// Spinner sizes matching button sizes
const SPINNER_SIZE_CLASSES: Record<NonNullable<BrandedButtonProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

const VARIANT_CLASSES: Record<NonNullable<BrandedButtonProps['variant']>, string> = {
  primary: [
    'bg-brand-primary text-white',
    'hover:bg-brand-primary/80',
  ].join(' '),
  secondary: [
    'bg-brand-secondary text-white',
    'hover:bg-brand-secondary/80',
  ].join(' '),
  accent: [
    'bg-brand-accent text-white',
    'hover:opacity-80',
  ].join(' '),
  outline: [
    'bg-transparent border-2 border-brand-primary text-brand-primary',
    'hover:bg-brand-primary/10',
  ].join(' '),
  ghost: [
    'bg-transparent text-brand-primary',
    'hover:bg-brand-primary/10',
  ].join(' '),
};

// ============================================================================
// Loading Spinner Component
// ============================================================================

function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BrandedButton - A button component that uses brand CSS variables
 *
 * This component automatically adapts to the funnel's brand kit colors,
 * making it ideal for use in public-facing funnel pages.
 *
 * **Accessibility Notes:**
 * - All sizes meet WCAG 2.1 minimum touch target requirements (44px)
 * - Loading state announces to screen readers via sr-only text
 * - Uses `text-white` for filled variants - ensure brand colors are dark enough
 *   for sufficient contrast (4.5:1 ratio per WCAG AA). Light brand colors
 *   (luminance > 0.179) may need custom styling.
 *
 * @example Basic usage
 * ```tsx
 * <BrandedButton>Click Me</BrandedButton>
 * ```
 *
 * @example With variant and size
 * ```tsx
 * <BrandedButton variant="primary" size="lg">
 *   Get Started
 * </BrandedButton>
 * ```
 *
 * @example Loading state (update text to reflect the action)
 * ```tsx
 * <BrandedButton loading={isSubmitting} disabled={isSubmitting}>
 *   {isSubmitting ? 'Securing your order...' : 'Submit Order'}
 * </BrandedButton>
 * ```
 *
 * @example Outline variant
 * ```tsx
 * <BrandedButton variant="outline" size="md">
 *   Learn More
 * </BrandedButton>
 * ```
 *
 * @example Full width submit button
 * ```tsx
 * <BrandedButton
 *   type="submit"
 *   variant="accent"
 *   size="xl"
 *   fullWidth
 * >
 *   Complete Purchase
 * </BrandedButton>
 * ```
 *
 * @example Ghost button for secondary actions
 * ```tsx
 * <BrandedButton variant="ghost" size="sm">
 *   Cancel
 * </BrandedButton>
 * ```
 */
export const BrandedButton = forwardRef<HTMLButtonElement, BrandedButtonProps>(
  function BrandedButton(
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      fullWidth = false,
      className = '',
      type = 'button',
      onClick,
    },
    ref
  ) {
    // Determine if button should be interactive
    const isDisabled = disabled || loading;

    // Build class list
    const classes = [
      // Base styles
      'inline-flex items-center justify-center',
      'font-medium rounded-lg',
      'transition-all duration-200',
      'touch-manipulation',
      // Focus styles using brand colors
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
      // Active state
      'active:scale-[0.98]',
      // Size classes
      SIZE_CLASSES[size],
      // Variant classes
      VARIANT_CLASSES[variant],
      // Full width
      fullWidth ? 'w-full' : '',
      // Disabled/loading state
      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      // Custom classes
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Get spinner size from lookup table
    const spinnerSize = SPINNER_SIZE_CLASSES[size];

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={isDisabled}
        onClick={onClick}
        tabIndex={loading ? -1 : undefined}
        aria-busy={loading}
        aria-disabled={isDisabled}
      >
        {loading && (
          <>
            <LoadingSpinner className={`${spinnerSize} mr-2`} />
            <span className="sr-only">Loading, please wait</span>
          </>
        )}
        {children}
      </button>
    );
  }
);

// Default export for convenient importing
export default BrandedButton;
