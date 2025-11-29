/**
 * Order and Shipment Number Formatting Utilities
 *
 * Order Number Format:
 * - Internal: VELO-COFF-A-000000003 (CLNT-COMP-X-NNNNNNNNN)
 * - Customer (compact): A-000000003
 * - Customer (display): A-000-000-003
 */

/**
 * Format order number for customer-facing display
 * Input: VELO-COFF-A-000000003 or A-000000003
 * Output: A-000-000-003
 */
export function formatOrderNumber(orderNumber: string): string {
  // Try to match new format: X-NNNNNNNNN or CLNT-COMP-X-NNNNNNNNN
  const match = orderNumber.match(/([A-Z])-(\d{9})$/);
  if (match) {
    const [, prefix, digits] = match;
    return `${prefix}-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Fallback for legacy format or unknown
  return orderNumber;
}

/**
 * Format shipment number for customer-facing display
 * Input: VELO-COFF-SA-000000001 or SA-000000001
 * Output: SA-000-000-001
 */
export function formatShipmentNumber(shipmentNumber: string): string {
  // Match shipment format: SX-NNNNNNNNN
  const match = shipmentNumber.match(/(S[A-Z])-(\d{9})$/);
  if (match) {
    const [, prefix, digits] = match;
    return `${prefix}-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Fallback
  return shipmentNumber;
}

/**
 * Extract customer-facing number from full internal format
 * Input: VELO-COFF-A-000000003
 * Output: A-000000003
 */
export function getCustomerNumber(orderNumber: string): string {
  const parts = orderNumber.split('-');
  // New format: CLNT-COMP-X-NNNNNNNNN (4 parts)
  if (parts.length === 4) {
    return `${parts[2]}-${parts[3]}`;
  }
  // Already customer format or legacy
  return orderNumber;
}

/**
 * Parse any format of order number for search/lookup
 * Normalizes: A-834729163, A-834-729-163, 834729163, VELO-COFF-A-834729163
 */
export function parseForSearch(input: string): string {
  // Remove all dashes and spaces, uppercase
  const clean = input.replace(/[-\s]/g, '').toUpperCase();

  // If it's just digits (9), return as-is for partial match
  if (/^\d{9}$/.test(clean)) {
    return clean;
  }

  // If it's letter + 9 digits, normalize to X-NNNNNNNNN
  if (/^[A-Z]\d{9}$/.test(clean)) {
    return `${clean[0]}-${clean.slice(1)}`;
  }

  // Full internal format - extract customer portion
  return getCustomerNumber(input);
}

/**
 * Validate a customer-facing order number format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  const clean = orderNumber.replace(/-/g, '').toUpperCase();

  // Should be 1 letter + 9 digits = 10 chars
  if (clean.length !== 10) return false;

  const prefix = clean[0];
  const digits = clean.slice(1);

  // Verify prefix is valid letter (excluding confusing ones)
  const validPrefixes = 'ACEFGHJKLMNPQRUVWXYZ';
  if (!validPrefixes.includes(prefix)) return false;

  // Verify all remaining chars are digits
  if (!/^\d{9}$/.test(digits)) return false;

  return true;
}
