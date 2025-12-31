/**
 * Unit tests for LogoDisplay component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LogoDisplay, LogoContext, LogoSize } from './LogoDisplay';
import { BrandKit } from '@/lib/api';
import * as brandKitResolver from '@/lib/brand-kit-resolver';

// ============================================================================
// Mocks
// ============================================================================

// Mock next/image
jest.mock('next/image', () => {
  const MockImage = (props: {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    className?: string;
    loading?: string;
    onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={props.src}
        alt={props.alt}
        data-fill={props.fill ? 'true' : undefined}
        data-sizes={props.sizes}
        className={props.className}
        data-loading={props.loading}
        onError={props.onError}
      />
    );
  };
  MockImage.displayName = 'MockImage';
  return MockImage;
});

// Mock getLogoUrl function
jest.mock('@/lib/brand-kit-resolver', () => ({
  ...jest.requireActual('@/lib/brand-kit-resolver'),
  getLogoUrl: jest.fn(),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const createBrandKit = (overrides: Partial<BrandKit> = {}): BrandKit => ({
  logos: {
    fullUrl: 'https://example.com/full-logo.png',
    iconUrl: 'https://example.com/icon-logo.png',
    monochromeUrl: 'https://example.com/mono-logo.png',
    reversedUrl: 'https://example.com/reversed-logo.png',
  },
  colors: {
    primary: '#6366f1',
    secondary: '#3b82f6',
    accent: '#f97316',
    background: '#ffffff',
    text: '#1f2937',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseFontSize: 16,
    headingScale: 1.25,
  },
  preset: 'minimal',
  ...overrides,
});

const createEmptyBrandKit = (): BrandKit => ({
  logos: {},
  colors: {
    primary: '#6366f1',
  },
  typography: {},
});

// ============================================================================
// Size Map (for verification)
// ============================================================================

const SIZE_MAP: Record<LogoSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

// ============================================================================
// Tests
// ============================================================================

describe('LogoDisplay', () => {
  const mockedGetLogoUrl = brandKitResolver.getLogoUrl as jest.MockedFunction<
    typeof brandKitResolver.getLogoUrl
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Size Tests
  // ==========================================================================

  describe('renders with different sizes', () => {
    it.each<LogoSize>(['sm', 'md', 'lg', 'xl'])('should render with size "%s"', (size) => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();
      const expectedPixelSize = SIZE_MAP[size];

      const { container } = render(<LogoDisplay brandKit={brandKit} size={size} />);

      // Check the container div has correct size
      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv.style.width).toBe(`${expectedPixelSize}px`);
      expect(wrapperDiv.style.height).toBe(`${expectedPixelSize}px`);

      // Check the image has correct sizes attribute
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('data-sizes', `${expectedPixelSize}px`);
    });

    it('should use default size "md" when size prop is not provided', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      const { container } = render(<LogoDisplay brandKit={brandKit} />);

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv.style.width).toBe('48px'); // md = 48px
      expect(wrapperDiv.style.height).toBe('48px');
    });

    it('should set correct font size for placeholder based on size', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      const { container, rerender } = render(
        <LogoDisplay brandKit={brandKit} size="sm" companyName="Test" />
      );

      // sm size = 32px, font size = 32 * 0.4 = 12.8 -> 13px (rounded)
      let placeholder = container.firstChild as HTMLElement;
      expect(placeholder.style.fontSize).toBe('13px');

      rerender(<LogoDisplay brandKit={brandKit} size="xl" companyName="Test" />);

      // xl size = 96px, font size = 96 * 0.4 = 38.4 -> 38px (rounded)
      placeholder = container.firstChild as HTMLElement;
      expect(placeholder.style.fontSize).toBe('38px');
    });
  });

  // ==========================================================================
  // Context Tests
  // ==========================================================================

  describe('renders with different contexts', () => {
    it.each<LogoContext>(['full', 'icon', 'monochrome', 'reversed'])(
      'should call getLogoUrl with context "%s"',
      (context) => {
        mockedGetLogoUrl.mockReturnValue(`https://example.com/${context}-logo.png`);
        const brandKit = createBrandKit();

        render(<LogoDisplay brandKit={brandKit} context={context} />);

        expect(mockedGetLogoUrl).toHaveBeenCalledWith(brandKit.logos, context);
      }
    );

    it('should use default context "full" when context prop is not provided', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/full-logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      expect(mockedGetLogoUrl).toHaveBeenCalledWith(brandKit.logos, 'full');
    });

    it('should render the correct logo URL based on context', () => {
      const iconUrl = 'https://example.com/icon-logo.png';
      mockedGetLogoUrl.mockReturnValue(iconUrl);
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} context="icon" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', iconUrl);
    });
  });

  // ==========================================================================
  // Placeholder Tests - No Logo URL
  // ==========================================================================

  describe('shows placeholder when no logo URL available', () => {
    it('should render placeholder when getLogoUrl returns undefined', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveAttribute('aria-label', 'Company logo placeholder');
      expect(placeholder.tagName).toBe('DIV'); // Placeholder is a div with role="img"
    });

    it('should render placeholder with correct size when no logo', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      const { container } = render(<LogoDisplay brandKit={brandKit} size="lg" />);

      const placeholder = container.firstChild as HTMLElement;
      expect(placeholder.style.width).toBe('64px'); // lg = 64px
      expect(placeholder.style.height).toBe('64px');
    });

    it('should display "C" as default initial when no company name', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('C');
    });

    it('should have gradient background classes on placeholder', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      const { container } = render(<LogoDisplay brandKit={brandKit} />);

      const placeholder = container.firstChild as HTMLElement;
      expect(placeholder.className).toContain('bg-gradient-to-br');
      expect(placeholder.className).toContain('from-gray-100');
      expect(placeholder.className).toContain('to-gray-200');
    });
  });

  // ==========================================================================
  // Placeholder with Company Initial
  // ==========================================================================

  describe('shows placeholder with company initial', () => {
    it('should display first letter of company name as uppercase', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="acme corporation" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('A');
    });

    it('should display uppercase initial for already uppercase name', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="ZENITH" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('Z');
    });

    it('should display first character for single character company name', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="x" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('X');
    });

    it('should display "C" for empty company name string', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('C');
    });

    it('should include company name in placeholder aria-label', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="Acme Inc" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveAttribute('aria-label', 'Acme Inc logo placeholder');
    });
  });

  // ==========================================================================
  // Alt Text with Company Name
  // ==========================================================================

  describe('has correct alt text with company name', () => {
    it('should include company name in alt text', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="Acme Corporation" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Acme Corporation Logo');
    });

    it('should use company name with special characters in alt text', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="O'Reilly & Associates" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', "O'Reilly & Associates Logo");
    });
  });

  // ==========================================================================
  // Alt Text without Company Name
  // ==========================================================================

  describe('has correct alt text without company name', () => {
    it('should use generic alt text when no company name provided', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Company Logo');
    });

    it('should use generic alt text when company name is empty string', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Company Logo');
    });
  });

  // ==========================================================================
  // Custom className
  // ==========================================================================

  describe('applies custom className', () => {
    it('should apply custom className to image wrapper', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      const { container } = render(
        <LogoDisplay brandKit={brandKit} className="custom-class another-class" />
      );

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv.className).toContain('custom-class');
      expect(wrapperDiv.className).toContain('another-class');
    });

    it('should apply custom className to placeholder', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      const { container } = render(
        <LogoDisplay brandKit={brandKit} className="placeholder-custom" />
      );

      const placeholder = container.firstChild as HTMLElement;
      expect(placeholder.className).toContain('placeholder-custom');
    });

    it('should merge custom className with default classes', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      const { container } = render(
        <LogoDisplay brandKit={brandKit} className="my-custom-class" />
      );

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv.className).toContain('relative'); // Default class
      expect(wrapperDiv.className).toContain('my-custom-class'); // Custom class
    });

    it('should handle empty className gracefully', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      const { container } = render(<LogoDisplay brandKit={brandKit} className="" />);

      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv.className).toContain('relative');
    });
  });

  // ==========================================================================
  // Next.js Image Component Props
  // ==========================================================================

  describe('uses Next.js Image component with proper props', () => {
    it('should render with fill prop set to true', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('data-fill', 'true');
    });

    it('should render with correct sizes prop based on size', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} size="xl" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('data-sizes', '96px');
    });

    it('should render with lazy loading', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('data-loading', 'lazy');
    });

    it('should render with object-contain class', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo.png');
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      const img = screen.getByRole('img');
      expect(img.className).toContain('object-contain');
    });

    it('should render correct src from getLogoUrl result', () => {
      const expectedUrl = 'https://cdn.example.com/brand/logo.svg';
      mockedGetLogoUrl.mockReturnValue(expectedUrl);
      const brandKit = createBrandKit();

      render(<LogoDisplay brandKit={brandKit} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', expectedUrl);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle brand kit with all empty logo URLs', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit: BrandKit = {
        logos: {
          fullUrl: undefined,
          iconUrl: undefined,
          monochromeUrl: undefined,
          reversedUrl: undefined,
        },
        colors: { primary: '#6366f1' },
        typography: {},
      };

      render(<LogoDisplay brandKit={brandKit} companyName="Test" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('T');
    });

    it('should handle very long company names', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();
      const longCompanyName = 'Supercalifragilisticexpialidocious Industries International';

      render(<LogoDisplay brandKit={brandKit} companyName={longCompanyName} />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('S'); // First letter only
      expect(placeholder).toHaveAttribute('aria-label', `${longCompanyName} logo placeholder`);
    });

    it('should handle company name starting with number', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="3M Company" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('3');
    });

    it('should handle company name with unicode characters', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="Cafe Bistro" />);

      const placeholder = screen.getByRole('img');
      expect(placeholder).toHaveTextContent('C');
    });

    it('should handle whitespace-only company name', () => {
      mockedGetLogoUrl.mockReturnValue(undefined);
      const brandKit = createEmptyBrandKit();

      render(<LogoDisplay brandKit={brandKit} companyName="   " />);

      const placeholder = screen.getByRole('img');
      // charAt(0) of "   " is " ", which uppercased is still " "
      // This is edge case behavior - it will display a space
      expect(placeholder).toHaveTextContent('');
    });
  });

  // ==========================================================================
  // Component Integration
  // ==========================================================================

  describe('component integration', () => {
    it('should pass brandKit.logos to getLogoUrl', () => {
      const customLogos = {
        fullUrl: 'https://custom.com/full.png',
        iconUrl: 'https://custom.com/icon.png',
      };
      mockedGetLogoUrl.mockReturnValue(customLogos.fullUrl);
      const brandKit = createBrandKit({ logos: customLogos });

      render(<LogoDisplay brandKit={brandKit} context="full" />);

      expect(mockedGetLogoUrl).toHaveBeenCalledWith(customLogos, 'full');
    });

    it('should render different logos for different contexts', () => {
      const brandKit = createBrandKit();

      // First render with icon context
      mockedGetLogoUrl.mockReturnValue('https://example.com/icon.png');
      const { rerender } = render(<LogoDisplay brandKit={brandKit} context="icon" />);

      let img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/icon.png');

      // Re-render with monochrome context
      mockedGetLogoUrl.mockReturnValue('https://example.com/mono.png');
      rerender(<LogoDisplay brandKit={brandKit} context="monochrome" />);

      img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/mono.png');
    });

    it('should update when brandKit prop changes', () => {
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo1.png');
      const brandKit1 = createBrandKit({
        logos: { fullUrl: 'https://example.com/logo1.png' },
      });

      const { rerender } = render(<LogoDisplay brandKit={brandKit1} />);

      let img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/logo1.png');

      // Update to new brand kit
      mockedGetLogoUrl.mockReturnValue('https://example.com/logo2.png');
      const brandKit2 = createBrandKit({
        logos: { fullUrl: 'https://example.com/logo2.png' },
      });

      rerender(<LogoDisplay brandKit={brandKit2} />);

      img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/logo2.png');
    });
  });
});
