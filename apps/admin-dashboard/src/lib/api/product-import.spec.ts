/**
 * Product Import API Client Tests
 *
 * Tests for utility functions exported from the product import API client.
 * These functions are used for formatting and display across the import UI.
 */

import {
  formatBytes,
  formatDuration,
  getStatusVariant,
  getPhaseDisplayName,
  getProvider,
  getAvailableProviders,
  getStatusColor,
  IMPORT_PROVIDERS,
  ImportJobStatus,
  ImportJobPhase,
} from './product-import';

// ═══════════════════════════════════════════════════════════════
// FORMAT BYTES TESTS
// ═══════════════════════════════════════════════════════════════

describe('formatBytes', () => {
  describe('edge cases', () => {
    it('returns "0 B" for 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('returns "0 B" for negative values', () => {
      expect(formatBytes(-100)).toBe('0 B');
    });

    it('returns "0 B" for NaN', () => {
      expect(formatBytes(NaN)).toBe('0 B');
    });

    it('returns "0 B" for Infinity', () => {
      expect(formatBytes(Infinity)).toBe('0 B');
    });

    it('returns "0 B" for undefined/null-ish values', () => {
      expect(formatBytes(undefined as any)).toBe('0 B');
      expect(formatBytes(null as any)).toBe('0 B');
    });
  });

  describe('bytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(1)).toBe('1 B');
      expect(formatBytes(100)).toBe('100 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });
  });

  describe('kilobytes', () => {
    it('formats kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2048)).toBe('2 KB');
      expect(formatBytes(1048575)).toBe('1024 KB');
    });
  });

  describe('megabytes', () => {
    it('formats megabytes correctly', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(5242880)).toBe('5 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
    });
  });

  describe('gigabytes', () => {
    it('formats gigabytes correctly', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(2147483648)).toBe('2 GB');
      expect(formatBytes(1610612736)).toBe('1.5 GB');
    });
  });

  describe('terabytes', () => {
    it('formats terabytes correctly', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
      expect(formatBytes(2199023255552)).toBe('2 TB');
    });
  });

  describe('very small values', () => {
    it('handles very small fractional values', () => {
      // Should show appropriate precision or minimum
      const result = formatBytes(0.001);
      expect(result).toMatch(/^(<0\.01 B|0 B)$/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// FORMAT DURATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('formatDuration', () => {
  describe('edge cases', () => {
    it('returns "0s" for 0 seconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('returns "0s" for null', () => {
      expect(formatDuration(null)).toBe('0s');
    });

    it('returns "0s" for undefined', () => {
      expect(formatDuration(undefined)).toBe('0s');
    });

    it('returns "0s" for negative values', () => {
      expect(formatDuration(-10)).toBe('0s');
    });

    it('returns "0s" for NaN', () => {
      expect(formatDuration(NaN)).toBe('0s');
    });

    it('returns "0s" for Infinity', () => {
      expect(formatDuration(Infinity)).toBe('0s');
    });
  });

  describe('seconds only', () => {
    it('formats seconds correctly', () => {
      expect(formatDuration(1)).toBe('1s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('rounds fractional seconds', () => {
      expect(formatDuration(1.4)).toBe('1s');
      expect(formatDuration(1.5)).toBe('2s');
      expect(formatDuration(59.9)).toBe('1m'); // Rounds to 60, converts to 1m
    });
  });

  describe('minutes', () => {
    it('formats minutes correctly', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(120)).toBe('2m');
      expect(formatDuration(300)).toBe('5m');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(61)).toBe('1m 1s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
    });
  });

  describe('hours', () => {
    it('formats hours correctly', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(7200)).toBe('2h');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(5400)).toBe('1h 30m');
      expect(formatDuration(7380)).toBe('2h 3m');
    });

    it('does not include seconds for hour-scale durations', () => {
      expect(formatDuration(3661)).toBe('1h 1m'); // 1h 1m 1s -> 1h 1m
      expect(formatDuration(3725)).toBe('1h 2m'); // 1h 2m 5s -> 1h 2m
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// STATUS VARIANT TESTS
// ═══════════════════════════════════════════════════════════════

describe('getStatusVariant', () => {
  it('returns "default" for COMPLETED', () => {
    expect(getStatusVariant('COMPLETED')).toBe('default');
  });

  it('returns "secondary" for IN_PROGRESS', () => {
    expect(getStatusVariant('IN_PROGRESS')).toBe('secondary');
  });

  it('returns "outline" for PENDING', () => {
    expect(getStatusVariant('PENDING')).toBe('outline');
  });

  it('returns "destructive" for FAILED', () => {
    expect(getStatusVariant('FAILED')).toBe('destructive');
  });

  it('returns "outline" for CANCELLED', () => {
    expect(getStatusVariant('CANCELLED')).toBe('outline');
  });

  it('returns "secondary" for unknown status', () => {
    expect(getStatusVariant('UNKNOWN' as ImportJobStatus)).toBe('secondary');
  });
});

// ═══════════════════════════════════════════════════════════════
// STATUS COLOR TESTS
// ═══════════════════════════════════════════════════════════════

describe('getStatusColor', () => {
  it('returns green for COMPLETED', () => {
    expect(getStatusColor('COMPLETED')).toBe('text-green-600');
  });

  it('returns blue for IN_PROGRESS', () => {
    expect(getStatusColor('IN_PROGRESS')).toBe('text-blue-600');
  });

  it('returns muted for PENDING', () => {
    expect(getStatusColor('PENDING')).toBe('text-muted-foreground');
  });

  it('returns red for FAILED', () => {
    expect(getStatusColor('FAILED')).toBe('text-red-600');
  });

  it('returns yellow for CANCELLED', () => {
    expect(getStatusColor('CANCELLED')).toBe('text-yellow-600');
  });

  it('returns muted for unknown status', () => {
    expect(getStatusColor('UNKNOWN' as ImportJobStatus)).toBe('text-muted-foreground');
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE DISPLAY NAME TESTS
// ═══════════════════════════════════════════════════════════════

describe('getPhaseDisplayName', () => {
  it('returns user-friendly name for QUEUED', () => {
    expect(getPhaseDisplayName('QUEUED')).toBe('Getting ready...');
  });

  it('returns user-friendly name for FETCHING', () => {
    expect(getPhaseDisplayName('FETCHING')).toBe('Fetching products');
  });

  it('returns user-friendly name for MAPPING', () => {
    expect(getPhaseDisplayName('MAPPING')).toBe('Mapping fields');
  });

  it('returns user-friendly name for CREATING', () => {
    expect(getPhaseDisplayName('CREATING')).toBe('Adding products');
  });

  it('returns user-friendly name for DOWNLOADING_IMAGES', () => {
    expect(getPhaseDisplayName('DOWNLOADING_IMAGES')).toBe('Downloading images');
  });

  it('returns user-friendly name for GENERATING_THUMBNAILS', () => {
    expect(getPhaseDisplayName('GENERATING_THUMBNAILS')).toBe('Creating thumbnails');
  });

  it('returns user-friendly name for FINALIZING', () => {
    expect(getPhaseDisplayName('FINALIZING')).toBe('Wrapping up');
  });

  it('returns raw phase for unknown phases', () => {
    expect(getPhaseDisplayName('UNKNOWN' as ImportJobPhase)).toBe('UNKNOWN');
  });
});

// ═══════════════════════════════════════════════════════════════
// PROVIDER HELPERS TESTS
// ═══════════════════════════════════════════════════════════════

describe('getProvider', () => {
  it('returns roastify provider', () => {
    const provider = getProvider('roastify');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('Roastify');
    expect(provider?.isAvailable).toBe(true);
  });

  it('returns shopify provider (coming soon)', () => {
    const provider = getProvider('shopify');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('Shopify');
    expect(provider?.isAvailable).toBe(false);
  });

  it('returns undefined for unknown provider', () => {
    expect(getProvider('nonexistent')).toBeUndefined();
  });

  it('is case-sensitive', () => {
    expect(getProvider('ROASTIFY')).toBeUndefined();
    expect(getProvider('Roastify')).toBeUndefined();
  });
});

describe('getAvailableProviders', () => {
  it('returns only available providers', () => {
    const available = getAvailableProviders();
    expect(available.every((p) => p.isAvailable)).toBe(true);
  });

  it('includes roastify', () => {
    const available = getAvailableProviders();
    expect(available.some((p) => p.id === 'roastify')).toBe(true);
  });

  it('excludes coming soon providers', () => {
    const available = getAvailableProviders();
    expect(available.some((p) => p.id === 'shopify')).toBe(false);
    expect(available.some((p) => p.id === 'woocommerce')).toBe(false);
    expect(available.some((p) => p.id === 'magento')).toBe(false);
  });
});

describe('IMPORT_PROVIDERS', () => {
  it('has required provider structure', () => {
    IMPORT_PROVIDERS.forEach((provider) => {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.description).toBeDefined();
      expect(provider.icon).toBeDefined();
      expect(provider.category).toBeDefined();
      expect(typeof provider.isAvailable).toBe('boolean');
      expect(Array.isArray(provider.requiredCredentials)).toBe(true);
    });
  });

  it('has valid categories', () => {
    const validCategories = ['fulfillment', 'ecommerce', 'erp', 'marketplace'];
    IMPORT_PROVIDERS.forEach((provider) => {
      expect(validCategories).toContain(provider.category);
    });
  });

  it('has at least one available provider', () => {
    expect(IMPORT_PROVIDERS.some((p) => p.isAvailable)).toBe(true);
  });
});
