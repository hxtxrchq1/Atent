import { SYSTEM_LIMITS, SENSITIVE_KEYS } from '../constants/index.js';
/**
 * Validates geographical coordinates within physical Earth boundaries.
 */
export function isValidCoordinates(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return false;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return false;
    }
    return (lat >= SYSTEM_LIMITS.MIN_LATITUDE &&
        lat <= SYSTEM_LIMITS.MAX_LATITUDE &&
        lng >= SYSTEM_LIMITS.MIN_LONGITUDE &&
        lng <= SYSTEM_LIMITS.MAX_LONGITUDE);
}
/**
 * Checks if a given ISO timestamp string or Date is expired relative to a reference time.
 */
export function isTokenExpired(expiresAt, referenceDate = new Date()) {
    const targetDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    if (Number.isNaN(targetDate.getTime())) {
        return true; // Malformed timestamps are treated as expired for safety
    }
    return targetDate.getTime() <= referenceDate.getTime();
}
/**
 * Masks a telephone number preserving only country/prefix and last 3 digits.
 * Example: "+1234567890" -> "+123***890"
 */
export function maskPhoneNumber(phone) {
    if (!phone || phone.length < 6) {
        return '***';
    }
    const start = phone.slice(0, 4);
    const end = phone.slice(-3);
    return `${start}***${end}`;
}
/**
 * Recursively sanitizes an object to ensure no sensitive credentials,
 * coordinates, or PII leak into application logs (Rule 9 and Rule 10).
 */
export function sanitizeObjectForLogging(input, depth = 0) {
    if (depth > 5)
        return '[MAX_DEPTH_REACHED]';
    if (input === null || input === undefined)
        return input;
    if (typeof input !== 'object')
        return input;
    if (Array.isArray(input)) {
        return input.map((item) => sanitizeObjectForLogging(item, depth + 1));
    }
    const record = input;
    const sanitized = {};
    for (const [key, val] of Object.entries(record)) {
        const isSensitive = SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()));
        if (isSensitive) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof val === 'object' && val !== null) {
            sanitized[key] = sanitizeObjectForLogging(val, depth + 1);
        }
        else {
            sanitized[key] = val;
        }
    }
    return sanitized;
}
//# sourceMappingURL=index.js.map