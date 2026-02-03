import { SetMetadata, applyDecorators } from '@nestjs/common';
import { RequireHmacOptions, HmacAlgorithm } from './hmac.types';

/**
 * Metadata key for HMAC requirement
 */
export const REQUIRE_HMAC_METADATA_KEY = 'hmac:required';

/**
 * Metadata key for HMAC options
 */
export const HMAC_OPTIONS_METADATA_KEY = 'hmac:options';

/**
 * Metadata key to skip HMAC verification
 */
export const SKIP_HMAC_METADATA_KEY = 'hmac:skip';

/**
 * Require HMAC signature verification for a route
 *
 * Usage:
 * @RequireHmac() - Use default settings (SHA256, 5 min drift)
 * @RequireHmac({ algorithm: HmacAlgorithm.SHA512 }) - Use SHA512
 * @RequireHmac({ maxTimestampDrift: 60 }) - Allow only 1 minute drift
 * @RequireHmac({ allowCompanyKeys: true }) - Allow per-company keys
 */
export function RequireHmac(options?: RequireHmacOptions): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(REQUIRE_HMAC_METADATA_KEY, true),
    SetMetadata(HMAC_OPTIONS_METADATA_KEY, options || {}),
  );
}

/**
 * Skip HMAC verification for a specific route (when class has @RequireHmac)
 *
 * Usage:
 * @SkipHmac() - Exclude this route from HMAC verification
 */
export function SkipHmac(): MethodDecorator {
  return SetMetadata(SKIP_HMAC_METADATA_KEY, true);
}

/**
 * Preset decorator for SHA256 HMAC with strict timing (1 minute)
 */
export function RequireHmacStrict(): MethodDecorator & ClassDecorator {
  return RequireHmac({
    algorithm: HmacAlgorithm.SHA256,
    maxTimestampDrift: 60,
  });
}

/**
 * Preset decorator for SHA512 HMAC (higher security)
 */
export function RequireHmac512(): MethodDecorator & ClassDecorator {
  return RequireHmac({
    algorithm: HmacAlgorithm.SHA512,
  });
}

/**
 * Preset decorator allowing company-specific keys
 */
export function RequireHmacWithCompanyKeys(): MethodDecorator & ClassDecorator {
  return RequireHmac({
    allowCompanyKeys: true,
  });
}
