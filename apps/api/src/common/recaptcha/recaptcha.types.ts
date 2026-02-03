/**
 * reCAPTCHA v3 Types
 *
 * Types for Google reCAPTCHA v3 verification (invisible fraud protection).
 * Compliant with SOC2/PCI-DSS requirements for fraud detection.
 */

/**
 * reCAPTCHA verification request options
 */
export interface RecaptchaVerifyOptions {
  /** The reCAPTCHA token from the frontend */
  token: string;
  /** The action name (e.g., 'checkout', 'login') */
  action?: string;
  /** Remote IP address for additional context */
  remoteIp?: string;
}

/**
 * Google reCAPTCHA API response
 */
export interface RecaptchaApiResponse {
  /** Whether the verification was successful */
  success: boolean;
  /** Score between 0.0 and 1.0 (1.0 = very likely human) */
  score?: number;
  /** The action name this token was generated for */
  action?: string;
  /** Timestamp of the challenge load (ISO format) */
  challenge_ts?: string;
  /** Hostname of the site where the reCAPTCHA was solved */
  hostname?: string;
  /** Optional error codes */
  'error-codes'?: string[];
}

/**
 * reCAPTCHA verification result
 */
export interface RecaptchaVerifyResult {
  /** Whether the verification passed all checks */
  success: boolean;
  /** The score returned by reCAPTCHA (0.0 to 1.0) */
  score: number;
  /** The action associated with the token */
  action?: string;
  /** Whether the request appears to be a bot/fraud */
  isSuspicious: boolean;
  /** Reason for failure (if any) */
  failureReason?: string;
  /** Error codes from Google (if any) */
  errorCodes?: string[];
}

/**
 * reCAPTCHA configuration
 */
export interface RecaptchaConfig {
  /** Secret key for server-side verification */
  secretKey: string;
  /** Minimum score threshold (0.0 to 1.0) */
  scoreThreshold: number;
  /** Whether reCAPTCHA is enabled */
  enabled: boolean;
}

/**
 * reCAPTCHA error codes from Google
 */
export const RecaptchaErrorCodes = {
  MISSING_INPUT_SECRET: 'missing-input-secret',
  INVALID_INPUT_SECRET: 'invalid-input-secret',
  MISSING_INPUT_RESPONSE: 'missing-input-response',
  INVALID_INPUT_RESPONSE: 'invalid-input-response',
  BAD_REQUEST: 'bad-request',
  TIMEOUT_OR_DUPLICATE: 'timeout-or-duplicate',
} as const;

export type RecaptchaErrorCode = (typeof RecaptchaErrorCodes)[keyof typeof RecaptchaErrorCodes];
