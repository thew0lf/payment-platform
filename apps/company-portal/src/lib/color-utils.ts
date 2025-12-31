/**
 * Color Utility Module
 *
 * Provides color manipulation and WCAG accessibility functions for the company portal.
 * All functions are pure TypeScript with no external dependencies.
 */

/**
 * RGB color representation
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Validates if a string is a valid hex color format (#RGB or #RRGGBB)
 *
 * @param color - The color string to validate
 * @returns True if the color is a valid hex format
 *
 * @example
 * isValidHex('#fff') // true
 * isValidHex('#ffffff') // true
 * isValidHex('ffffff') // false (missing #)
 * isValidHex('#gggggg') // false (invalid characters)
 */
export function isValidHex(color: string): boolean {
  if (typeof color !== 'string') {
    return false;
  }
  const hex = color.trim();
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/**
 * Normalizes a 3-character hex color to 6-character format
 *
 * @param color - The hex color to normalize (must include #)
 * @returns The 6-character hex color (e.g., '#ffffff')
 * @throws Error if the color is not a valid hex format
 *
 * @example
 * normalizeHex('#fff') // '#ffffff'
 * normalizeHex('#abc') // '#aabbcc'
 * normalizeHex('#ffffff') // '#ffffff'
 */
export function normalizeHex(color: string): string {
  if (!isValidHex(color)) {
    throw new Error(`Invalid hex color: ${color}`);
  }

  const hex = color.trim().toLowerCase();

  if (hex.length === 4) {
    // Convert #RGB to #RRGGBB
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return hex;
}

/**
 * Converts a hex color to RGB values
 *
 * @param hex - The hex color to convert (with or without #)
 * @returns RGB object or null if invalid
 *
 * @example
 * hexToRgb('#ffffff') // { r: 255, g: 255, b: 255 }
 * hexToRgb('#000') // { r: 0, g: 0, b: 0 }
 * hexToRgb('invalid') // null
 */
export function hexToRgb(hex: string): RGB | null {
  if (!isValidHex(hex)) {
    return null;
  }

  const normalized = normalizeHex(hex);
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);

  if (!result) {
    return null;
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Converts RGB values to a hex color string
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string (e.g., '#ffffff')
 *
 * @example
 * rgbToHex(255, 255, 255) // '#ffffff'
 * rgbToHex(0, 0, 0) // '#000000'
 * rgbToHex(255, 0, 128) // '#ff0080'
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

  const toHex = (value: number): string => {
    const hex = clamp(value).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates the relative luminance of a color according to WCAG 2.1
 *
 * @param hex - The hex color to calculate luminance for
 * @returns Relative luminance value (0-1), or -1 if invalid color
 *
 * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
 *
 * @example
 * getLuminance('#ffffff') // 1 (white)
 * getLuminance('#000000') // 0 (black)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return -1;
  }

  // Convert RGB to sRGB
  const sRGB = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  // Calculate relative luminance using WCAG formula
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Calculates the contrast ratio between two colors according to WCAG 2.1
 *
 * @param foreground - The foreground (text) color in hex format
 * @param background - The background color in hex format
 * @returns Contrast ratio (1-21), or -1 if invalid colors
 *
 * @see https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 *
 * @example
 * getContrastRatio('#000000', '#ffffff') // 21 (maximum contrast)
 * getContrastRatio('#ffffff', '#ffffff') // 1 (no contrast)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const luminance1 = getLuminance(foreground);
  const luminance2 = getLuminance(background);

  if (luminance1 === -1 || luminance2 === -1) {
    return -1;
  }

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if the contrast ratio between two colors meets WCAG AA standards
 *
 * WCAG AA requires:
 * - 4.5:1 for normal text (< 18pt or < 14pt bold)
 * - 3:1 for large text (>= 18pt or >= 14pt bold)
 *
 * @param foreground - The foreground (text) color in hex format
 * @param background - The background color in hex format
 * @param isLargeText - Whether the text is considered "large" (default: false)
 * @returns True if the contrast meets WCAG AA requirements
 *
 * @example
 * meetsWCAGAA('#000000', '#ffffff') // true
 * meetsWCAGAA('#777777', '#ffffff') // false (4.48:1 ratio)
 * meetsWCAGAA('#777777', '#ffffff', true) // true (passes large text threshold)
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (ratio === -1) {
    return false;
  }

  const threshold = isLargeText ? 3 : 4.5;
  return ratio >= threshold;
}

/**
 * Checks if the contrast ratio between two colors meets WCAG AAA standards
 *
 * WCAG AAA requires:
 * - 7:1 for normal text
 * - 4.5:1 for large text
 *
 * @param foreground - The foreground (text) color in hex format
 * @param background - The background color in hex format
 * @param isLargeText - Whether the text is considered "large" (default: false)
 * @returns True if the contrast meets WCAG AAA requirements
 *
 * @example
 * meetsWCAGAAA('#000000', '#ffffff') // true
 * meetsWCAGAAA('#595959', '#ffffff') // true (7:1 ratio)
 * meetsWCAGAAA('#666666', '#ffffff') // false (5.74:1 ratio)
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (ratio === -1) {
    return false;
  }

  const threshold = isLargeText ? 4.5 : 7;
  return ratio >= threshold;
}

/**
 * Returns the most accessible text color (black or white) for a given background
 *
 * @param backgroundColor - The background color in hex format
 * @returns '#ffffff' or '#000000' based on which provides better contrast
 *
 * @example
 * getAccessibleTextColor('#000000') // '#ffffff'
 * getAccessibleTextColor('#ffffff') // '#000000'
 * getAccessibleTextColor('#3b82f6') // '#ffffff' (blue background)
 */
export function getAccessibleTextColor(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor);

  if (luminance === -1) {
    // Default to black text if color is invalid
    return '#000000';
  }

  // Use the luminance threshold of 0.179 (derived from the contrast ratio formula)
  // Colors with luminance > 0.179 have better contrast with black text
  // Colors with luminance <= 0.179 have better contrast with white text
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Lightens a color by a specified amount
 *
 * @param hex - The hex color to lighten
 * @param amount - Amount to lighten (0-1, where 1 is fully white)
 * @returns The lightened hex color
 * @throws Error if the color is invalid
 *
 * @example
 * lighten('#000000', 0.5) // '#808080' (50% lighter)
 * lighten('#3b82f6', 0.2) // lighter blue
 */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const clampedAmount = Math.max(0, Math.min(1, amount));

  // Lighten by interpolating towards white (255, 255, 255)
  const r = rgb.r + (255 - rgb.r) * clampedAmount;
  const g = rgb.g + (255 - rgb.g) * clampedAmount;
  const b = rgb.b + (255 - rgb.b) * clampedAmount;

  return rgbToHex(r, g, b);
}

/**
 * Darkens a color by a specified amount
 *
 * @param hex - The hex color to darken
 * @param amount - Amount to darken (0-1, where 1 is fully black)
 * @returns The darkened hex color
 * @throws Error if the color is invalid
 *
 * @example
 * darken('#ffffff', 0.5) // '#808080' (50% darker)
 * darken('#3b82f6', 0.2) // darker blue
 */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const clampedAmount = Math.max(0, Math.min(1, amount));

  // Darken by interpolating towards black (0, 0, 0)
  const r = rgb.r * (1 - clampedAmount);
  const g = rgb.g * (1 - clampedAmount);
  const b = rgb.b * (1 - clampedAmount);

  return rgbToHex(r, g, b);
}

/**
 * Adjusts the opacity of a hex color and returns an rgba string
 *
 * @param hex - The hex color
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string (e.g., 'rgba(255, 255, 255, 0.5)')
 * @throws Error if the color is invalid
 *
 * @example
 * adjustOpacity('#ffffff', 0.5) // 'rgba(255, 255, 255, 0.5)'
 * adjustOpacity('#000', 0.8) // 'rgba(0, 0, 0, 0.8)'
 */
export function adjustOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const clampedOpacity = Math.max(0, Math.min(1, opacity));

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedOpacity})`;
}
