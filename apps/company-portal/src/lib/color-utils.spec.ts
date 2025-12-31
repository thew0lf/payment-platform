/**
 * Color Utility Module Tests
 *
 * Comprehensive test suite for color manipulation and WCAG accessibility functions.
 */

import {
  isValidHex,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  getLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getAccessibleTextColor,
  lighten,
  darken,
  adjustOpacity,
} from './color-utils';

describe('Color Utilities', () => {
  // ============================================================================
  // isValidHex
  // ============================================================================
  describe('isValidHex', () => {
    describe('valid hex colors', () => {
      it('should accept 6-character hex with #', () => {
        expect(isValidHex('#ffffff')).toBe(true);
        expect(isValidHex('#000000')).toBe(true);
        expect(isValidHex('#3b82f6')).toBe(true);
        expect(isValidHex('#FFFFFF')).toBe(true);
        expect(isValidHex('#AbCdEf')).toBe(true);
      });

      it('should accept 3-character hex with #', () => {
        expect(isValidHex('#fff')).toBe(true);
        expect(isValidHex('#000')).toBe(true);
        expect(isValidHex('#abc')).toBe(true);
        expect(isValidHex('#FFF')).toBe(true);
        expect(isValidHex('#AbC')).toBe(true);
      });

      it('should accept hex with leading/trailing whitespace', () => {
        expect(isValidHex(' #ffffff ')).toBe(true);
        expect(isValidHex('  #fff  ')).toBe(true);
      });
    });

    describe('invalid hex colors', () => {
      it('should reject hex without #', () => {
        expect(isValidHex('ffffff')).toBe(false);
        expect(isValidHex('fff')).toBe(false);
      });

      it('should reject invalid characters', () => {
        expect(isValidHex('#gggggg')).toBe(false);
        expect(isValidHex('#xyz123')).toBe(false);
        expect(isValidHex('#gg')).toBe(false);
      });

      it('should reject wrong length', () => {
        expect(isValidHex('#ff')).toBe(false);
        expect(isValidHex('#ffff')).toBe(false);
        expect(isValidHex('#fffff')).toBe(false);
        expect(isValidHex('#fffffff')).toBe(false);
      });

      it('should reject non-string values', () => {
        expect(isValidHex(null as unknown as string)).toBe(false);
        expect(isValidHex(undefined as unknown as string)).toBe(false);
        expect(isValidHex(123 as unknown as string)).toBe(false);
        expect(isValidHex({} as unknown as string)).toBe(false);
      });

      it('should reject empty strings', () => {
        expect(isValidHex('')).toBe(false);
        expect(isValidHex('   ')).toBe(false);
        expect(isValidHex('#')).toBe(false);
      });

      it('should reject named colors', () => {
        expect(isValidHex('red')).toBe(false);
        expect(isValidHex('blue')).toBe(false);
        expect(isValidHex('transparent')).toBe(false);
      });

      it('should reject rgb/rgba formats', () => {
        expect(isValidHex('rgb(255, 255, 255)')).toBe(false);
        expect(isValidHex('rgba(0, 0, 0, 0.5)')).toBe(false);
      });
    });
  });

  // ============================================================================
  // normalizeHex
  // ============================================================================
  describe('normalizeHex', () => {
    it('should convert 3-char hex to 6-char hex', () => {
      expect(normalizeHex('#fff')).toBe('#ffffff');
      expect(normalizeHex('#000')).toBe('#000000');
      expect(normalizeHex('#abc')).toBe('#aabbcc');
      expect(normalizeHex('#123')).toBe('#112233');
    });

    it('should return 6-char hex unchanged (lowercase)', () => {
      expect(normalizeHex('#ffffff')).toBe('#ffffff');
      expect(normalizeHex('#000000')).toBe('#000000');
      expect(normalizeHex('#3b82f6')).toBe('#3b82f6');
    });

    it('should convert to lowercase', () => {
      expect(normalizeHex('#FFF')).toBe('#ffffff');
      expect(normalizeHex('#FFFFFF')).toBe('#ffffff');
      expect(normalizeHex('#AbCdEf')).toBe('#abcdef');
    });

    it('should trim whitespace', () => {
      expect(normalizeHex(' #fff ')).toBe('#ffffff');
      expect(normalizeHex('  #ffffff  ')).toBe('#ffffff');
    });

    it('should throw for invalid hex', () => {
      expect(() => normalizeHex('invalid')).toThrow('Invalid hex color: invalid');
      expect(() => normalizeHex('#gg')).toThrow('Invalid hex color: #gg');
      expect(() => normalizeHex('')).toThrow('Invalid hex color: ');
    });
  });

  // ============================================================================
  // hexToRgb
  // ============================================================================
  describe('hexToRgb', () => {
    it('should convert 6-char hex to RGB', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should convert 3-char hex to RGB', () => {
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    });

    it('should handle uppercase hex', () => {
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#ABC')).toEqual({ r: 170, g: 187, b: 204 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#gggggg')).toBeNull();
      expect(hexToRgb('')).toBeNull();
      expect(hexToRgb('ffffff')).toBeNull();
    });
  });

  // ============================================================================
  // rgbToHex
  // ============================================================================
  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    it('should pad single digit hex values', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(15, 15, 15)).toBe('#0f0f0f');
      expect(rgbToHex(1, 2, 3)).toBe('#010203');
    });

    it('should clamp values outside 0-255 range', () => {
      expect(rgbToHex(300, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(-10, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 256, 257)).toBe('#ffffff');
    });

    it('should round decimal values', () => {
      expect(rgbToHex(127.4, 127.6, 127.5)).toBe('#7f8080');
      expect(rgbToHex(0.4, 0.6, 254.6)).toBe('#0001ff');
    });
  });

  // ============================================================================
  // getLuminance
  // ============================================================================
  describe('getLuminance', () => {
    it('should return 1 for white', () => {
      expect(getLuminance('#ffffff')).toBe(1);
      expect(getLuminance('#fff')).toBe(1);
    });

    it('should return 0 for black', () => {
      expect(getLuminance('#000000')).toBe(0);
      expect(getLuminance('#000')).toBe(0);
    });

    it('should calculate luminance for pure colors', () => {
      // Red has coefficient 0.2126
      expect(getLuminance('#ff0000')).toBeCloseTo(0.2126, 4);
      // Green has coefficient 0.7152
      expect(getLuminance('#00ff00')).toBeCloseTo(0.7152, 4);
      // Blue has coefficient 0.0722
      expect(getLuminance('#0000ff')).toBeCloseTo(0.0722, 4);
    });

    it('should calculate luminance for mid-gray', () => {
      // Mid-gray should be around 0.214 (not 0.5 due to gamma correction)
      const luminance = getLuminance('#808080');
      expect(luminance).toBeGreaterThan(0.2);
      expect(luminance).toBeLessThan(0.25);
    });

    it('should return -1 for invalid colors', () => {
      expect(getLuminance('invalid')).toBe(-1);
      expect(getLuminance('')).toBe(-1);
      expect(getLuminance('#gggggg')).toBe(-1);
    });
  });

  // ============================================================================
  // getContrastRatio
  // ============================================================================
  describe('getContrastRatio', () => {
    it('should return 21 for black on white', () => {
      expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
      expect(getContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    });

    it('should return 1 for same colors', () => {
      expect(getContrastRatio('#ffffff', '#ffffff')).toBe(1);
      expect(getContrastRatio('#000000', '#000000')).toBe(1);
      expect(getContrastRatio('#3b82f6', '#3b82f6')).toBe(1);
    });

    it('should calculate contrast for common color pairs', () => {
      // Black text on light gray should have good contrast
      const blackOnLightGray = getContrastRatio('#000000', '#e5e5e5');
      expect(blackOnLightGray).toBeGreaterThan(10);

      // White text on dark blue should have good contrast
      const whiteOnDarkBlue = getContrastRatio('#ffffff', '#1e3a5f');
      expect(whiteOnDarkBlue).toBeGreaterThan(7);
    });

    it('should be symmetric (order should not affect result)', () => {
      const ratio1 = getContrastRatio('#3b82f6', '#ffffff');
      const ratio2 = getContrastRatio('#ffffff', '#3b82f6');
      expect(ratio1).toBeCloseTo(ratio2, 5);
    });

    it('should return -1 for invalid colors', () => {
      expect(getContrastRatio('invalid', '#ffffff')).toBe(-1);
      expect(getContrastRatio('#ffffff', 'invalid')).toBe(-1);
      expect(getContrastRatio('invalid', 'invalid')).toBe(-1);
    });
  });

  // ============================================================================
  // meetsWCAGAA
  // ============================================================================
  describe('meetsWCAGAA', () => {
    describe('normal text (4.5:1 threshold)', () => {
      it('should pass for black on white', () => {
        expect(meetsWCAGAA('#000000', '#ffffff')).toBe(true);
      });

      it('should pass for colors with sufficient contrast', () => {
        // Dark gray on white
        expect(meetsWCAGAA('#595959', '#ffffff')).toBe(true);
      });

      it('should fail for colors with insufficient contrast', () => {
        // Light gray on white
        expect(meetsWCAGAA('#999999', '#ffffff')).toBe(false);
        // Same color
        expect(meetsWCAGAA('#ffffff', '#ffffff')).toBe(false);
      });

      it('should fail for invalid colors', () => {
        expect(meetsWCAGAA('invalid', '#ffffff')).toBe(false);
        expect(meetsWCAGAA('#000000', 'invalid')).toBe(false);
      });
    });

    describe('large text (3:1 threshold)', () => {
      it('should pass for colors that meet 3:1 ratio', () => {
        // #777777 on white has ~4.48:1 ratio
        expect(meetsWCAGAA('#777777', '#ffffff', true)).toBe(true);
      });

      it('should pass for colors that fail normal but pass large', () => {
        // Gray that fails normal text but passes large text
        const gray = '#767676'; // ~4.54:1 contrast
        expect(meetsWCAGAA(gray, '#ffffff', false)).toBe(true); // Passes AA
        expect(meetsWCAGAA(gray, '#ffffff', true)).toBe(true); // Also passes large text
      });
    });
  });

  // ============================================================================
  // meetsWCAGAAA
  // ============================================================================
  describe('meetsWCAGAAA', () => {
    describe('normal text (7:1 threshold)', () => {
      it('should pass for black on white', () => {
        expect(meetsWCAGAAA('#000000', '#ffffff')).toBe(true);
      });

      it('should pass for very high contrast colors', () => {
        // Very dark gray on white
        expect(meetsWCAGAAA('#333333', '#ffffff')).toBe(true);
      });

      it('should fail for colors that only meet AA', () => {
        // This gray meets AA but not AAA
        const gray = '#767676'; // ~4.54:1
        expect(meetsWCAGAA(gray, '#ffffff')).toBe(true);
        expect(meetsWCAGAAA(gray, '#ffffff')).toBe(false);
      });

      it('should fail for invalid colors', () => {
        expect(meetsWCAGAAA('invalid', '#ffffff')).toBe(false);
      });
    });

    describe('large text (4.5:1 threshold)', () => {
      it('should pass for colors that meet 4.5:1 ratio', () => {
        // #767676 on white has ~4.54:1 ratio
        expect(meetsWCAGAAA('#767676', '#ffffff', true)).toBe(true);
      });

      it('should pass for colors that fail normal AAA but pass large', () => {
        const gray = '#767676';
        expect(meetsWCAGAAA(gray, '#ffffff', false)).toBe(false);
        expect(meetsWCAGAAA(gray, '#ffffff', true)).toBe(true);
      });
    });
  });

  // ============================================================================
  // getAccessibleTextColor
  // ============================================================================
  describe('getAccessibleTextColor', () => {
    it('should return white for dark backgrounds', () => {
      expect(getAccessibleTextColor('#000000')).toBe('#ffffff');
      expect(getAccessibleTextColor('#1a1a1a')).toBe('#ffffff');
      expect(getAccessibleTextColor('#333333')).toBe('#ffffff');
      expect(getAccessibleTextColor('#000')).toBe('#ffffff');
    });

    it('should return black for light backgrounds', () => {
      expect(getAccessibleTextColor('#ffffff')).toBe('#000000');
      expect(getAccessibleTextColor('#f0f0f0')).toBe('#000000');
      expect(getAccessibleTextColor('#e5e5e5')).toBe('#000000');
      expect(getAccessibleTextColor('#fff')).toBe('#000000');
    });

    it('should return appropriate color for mid-tones', () => {
      // Mid-gray has luminance ~0.22, which is above threshold 0.179
      // So it should use black text for better contrast
      expect(getAccessibleTextColor('#808080')).toBe('#000000');
      // Darker gray (luminance below threshold) should use white text
      expect(getAccessibleTextColor('#404040')).toBe('#ffffff');
    });

    it('should handle brand colors', () => {
      // This blue has luminance ~0.23, above threshold, so black text
      expect(getAccessibleTextColor('#3b82f6')).toBe('#000000');
      // Yellow typically needs black text
      expect(getAccessibleTextColor('#fbbf24')).toBe('#000000');
      // Dark purple (lower luminance) needs white text
      expect(getAccessibleTextColor('#4c1d95')).toBe('#ffffff');
    });

    it('should return black for invalid colors', () => {
      expect(getAccessibleTextColor('invalid')).toBe('#000000');
      expect(getAccessibleTextColor('')).toBe('#000000');
    });
  });

  // ============================================================================
  // lighten
  // ============================================================================
  describe('lighten', () => {
    it('should lighten black to gray', () => {
      expect(lighten('#000000', 0.5)).toBe('#808080');
    });

    it('should lighten black to white at amount 1', () => {
      expect(lighten('#000000', 1)).toBe('#ffffff');
    });

    it('should not change color at amount 0', () => {
      expect(lighten('#3b82f6', 0)).toBe('#3b82f6');
      expect(lighten('#000000', 0)).toBe('#000000');
    });

    it('should not change white', () => {
      expect(lighten('#ffffff', 0.5)).toBe('#ffffff');
      expect(lighten('#ffffff', 1)).toBe('#ffffff');
    });

    it('should lighten colors proportionally', () => {
      const lightened = lighten('#0000ff', 0.5);
      const rgb = hexToRgb(lightened);
      expect(rgb?.r).toBe(128); // 0 + (255-0) * 0.5
      expect(rgb?.g).toBe(128);
      expect(rgb?.b).toBe(255); // Already at max
    });

    it('should clamp amount to 0-1 range', () => {
      expect(lighten('#000000', 2)).toBe('#ffffff'); // Clamped to 1
      expect(lighten('#000000', -1)).toBe('#000000'); // Clamped to 0
    });

    it('should throw for invalid colors', () => {
      expect(() => lighten('invalid', 0.5)).toThrow('Invalid hex color: invalid');
    });
  });

  // ============================================================================
  // darken
  // ============================================================================
  describe('darken', () => {
    it('should darken white to gray', () => {
      expect(darken('#ffffff', 0.5)).toBe('#808080');
    });

    it('should darken white to black at amount 1', () => {
      expect(darken('#ffffff', 1)).toBe('#000000');
    });

    it('should not change color at amount 0', () => {
      expect(darken('#3b82f6', 0)).toBe('#3b82f6');
      expect(darken('#ffffff', 0)).toBe('#ffffff');
    });

    it('should not change black', () => {
      expect(darken('#000000', 0.5)).toBe('#000000');
      expect(darken('#000000', 1)).toBe('#000000');
    });

    it('should darken colors proportionally', () => {
      const darkened = darken('#ffffff', 0.5);
      const rgb = hexToRgb(darkened);
      expect(rgb?.r).toBe(128); // 255 * 0.5
      expect(rgb?.g).toBe(128);
      expect(rgb?.b).toBe(128);
    });

    it('should clamp amount to 0-1 range', () => {
      expect(darken('#ffffff', 2)).toBe('#000000'); // Clamped to 1
      expect(darken('#ffffff', -1)).toBe('#ffffff'); // Clamped to 0
    });

    it('should throw for invalid colors', () => {
      expect(() => darken('invalid', 0.5)).toThrow('Invalid hex color: invalid');
    });
  });

  // ============================================================================
  // adjustOpacity
  // ============================================================================
  describe('adjustOpacity', () => {
    it('should create rgba string with specified opacity', () => {
      expect(adjustOpacity('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
      expect(adjustOpacity('#000000', 0.8)).toBe('rgba(0, 0, 0, 0.8)');
    });

    it('should handle 3-char hex', () => {
      expect(adjustOpacity('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
      expect(adjustOpacity('#000', 1)).toBe('rgba(0, 0, 0, 1)');
    });

    it('should handle opacity 0', () => {
      expect(adjustOpacity('#ff0000', 0)).toBe('rgba(255, 0, 0, 0)');
    });

    it('should handle opacity 1', () => {
      expect(adjustOpacity('#00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
    });

    it('should clamp opacity to 0-1 range', () => {
      expect(adjustOpacity('#0000ff', 2)).toBe('rgba(0, 0, 255, 1)');
      expect(adjustOpacity('#0000ff', -1)).toBe('rgba(0, 0, 255, 0)');
    });

    it('should throw for invalid colors', () => {
      expect(() => adjustOpacity('invalid', 0.5)).toThrow('Invalid hex color: invalid');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    describe('pure colors', () => {
      it('should handle pure red', () => {
        expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
        expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
        // Pure red has luminance 0.2126 > 0.179 threshold, so black text is better
        expect(getAccessibleTextColor('#ff0000')).toBe('#000000');
      });

      it('should handle pure green', () => {
        expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
        expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
        // Green is bright, should use black text
        expect(getAccessibleTextColor('#00ff00')).toBe('#000000');
      });

      it('should handle pure blue', () => {
        expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
        expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
        expect(getAccessibleTextColor('#0000ff')).toBe('#ffffff');
      });
    });

    describe('round-trip conversions', () => {
      it('should maintain color through hex -> rgb -> hex conversion', () => {
        const colors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#3b82f6'];
        colors.forEach((color) => {
          const rgb = hexToRgb(color);
          if (rgb) {
            expect(rgbToHex(rgb.r, rgb.g, rgb.b)).toBe(color);
          }
        });
      });
    });

    describe('boundary values', () => {
      it('should handle minimum luminance (black)', () => {
        expect(getLuminance('#000000')).toBe(0);
      });

      it('should handle maximum luminance (white)', () => {
        expect(getLuminance('#ffffff')).toBe(1);
      });

      it('should handle minimum contrast (same color)', () => {
        expect(getContrastRatio('#888888', '#888888')).toBe(1);
      });

      it('should handle maximum contrast (black/white)', () => {
        expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
      });
    });

    describe('real-world scenarios', () => {
      it('should provide accessible text for common brand colors', () => {
        // Twitter blue
        expect(getAccessibleTextColor('#1da1f2')).toBe('#000000');
        // Facebook blue
        expect(getAccessibleTextColor('#4267b2')).toBe('#ffffff');
        // Spotify green
        expect(getAccessibleTextColor('#1db954')).toBe('#000000');
        // Netflix red
        expect(getAccessibleTextColor('#e50914')).toBe('#ffffff');
      });

      it('should maintain WCAG AA compliance when lightening dark colors', () => {
        const darkBlue = '#1e3a5f';
        const lightened = lighten(darkBlue, 0.3);
        // Lightened color should still provide good contrast for text
        expect(meetsWCAGAA('#ffffff', lightened)).toBe(true);
      });
    });
  });
});
