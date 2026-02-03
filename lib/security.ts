/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validates a Salesforce ID format (15 or 18 character alphanumeric)
 */
export function isValidSalesforceId(id: string): boolean {
  return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(id);
}

/**
 * Filters an array to only valid Salesforce IDs
 */
export function filterValidSalesforceIds(ids: string[]): string[] {
  return ids.filter(isValidSalesforceId);
}

/**
 * Safely escapes a string for use in SOQL queries
 * Escapes single quotes and backslashes
 */
export function escapeSoql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Parses an integer with bounds checking
 */
export function parseIntWithBounds(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number
): number {
  const parsed = parseInt(value || String(defaultValue), 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(parsed, max));
}

/**
 * Common bounds for API parameters
 */
export const PARAM_BOUNDS = {
  days: { min: 1, max: 90, default: 7 },
  limit: { min: 1, max: 500, default: 100 },
  months: { min: 1, max: 24, default: 6 },
} as const;
