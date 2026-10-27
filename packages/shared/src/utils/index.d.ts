/**
 * Validates geographical coordinates within physical Earth boundaries.
 */
export declare function isValidCoordinates(lat: unknown, lng: unknown): boolean;
/**
 * Checks if a given ISO timestamp string or Date is expired relative to a reference time.
 */
export declare function isTokenExpired(expiresAt: string | Date, referenceDate?: Date): boolean;
/**
 * Masks a telephone number preserving only country/prefix and last 3 digits.
 * Example: "+1234567890" -> "+123***890"
 */
export declare function maskPhoneNumber(phone: string): string;
/**
 * Recursively sanitizes an object to ensure no sensitive credentials,
 * coordinates, or PII leak into application logs (Rule 9 and Rule 10).
 */
export declare function sanitizeObjectForLogging(input: unknown, depth?: number): unknown;
//# sourceMappingURL=index.d.ts.map