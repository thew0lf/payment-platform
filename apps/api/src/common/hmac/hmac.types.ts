/**
 * HMAC Request Signing Types
 * SOC2 CC6.1 Compliance - Secure API request authentication
 */

/**
 * Supported HMAC algorithms
 */
export enum HmacAlgorithm {
  SHA256 = 'sha256',
  SHA512 = 'sha512',
}

/**
 * HMAC configuration options
 */
export interface HmacConfig {
  algorithm: HmacAlgorithm;
  /** Maximum timestamp drift in seconds (default: 300 = 5 minutes) */
  maxTimestampDrift: number;
  /** Header name for signature (default: X-Signature) */
  signatureHeader: string;
  /** Header name for timestamp (default: X-Timestamp) */
  timestampHeader: string;
  /** Optional: Header name for company-specific key ID */
  keyIdHeader: string;
}

/**
 * Default HMAC configuration
 */
export const DEFAULT_HMAC_CONFIG: HmacConfig = {
  algorithm: HmacAlgorithm.SHA256,
  maxTimestampDrift: 300, // 5 minutes
  signatureHeader: 'x-signature',
  timestampHeader: 'x-timestamp',
  keyIdHeader: 'x-key-id',
};

/**
 * HMAC verification result
 */
export interface HmacVerificationResult {
  valid: boolean;
  error?: string;
  errorCode?: HmacErrorCode;
  /** Computed signature for debugging (only in development) */
  computedSignature?: string;
}

/**
 * HMAC error codes
 */
export enum HmacErrorCode {
  MISSING_SIGNATURE = 'MISSING_SIGNATURE',
  MISSING_TIMESTAMP = 'MISSING_TIMESTAMP',
  INVALID_TIMESTAMP = 'INVALID_TIMESTAMP',
  TIMESTAMP_EXPIRED = 'TIMESTAMP_EXPIRED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * Request data for HMAC signature computation
 */
export interface HmacRequestData {
  method: string;
  path: string;
  body?: string;
  timestamp: string;
}

/**
 * HMAC decorator options
 */
export interface RequireHmacOptions {
  /** Override default algorithm */
  algorithm?: HmacAlgorithm;
  /** Override max timestamp drift */
  maxTimestampDrift?: number;
  /** Allow company-specific keys */
  allowCompanyKeys?: boolean;
}

/**
 * HMAC violation event for audit logging
 */
export interface HmacViolation {
  ip: string;
  path: string;
  method: string;
  errorCode: HmacErrorCode;
  userAgent?: string;
  timestamp: Date;
  providedTimestamp?: string;
  providedSignature?: string;
}
