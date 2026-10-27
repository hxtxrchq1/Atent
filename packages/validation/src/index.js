export const LAT_MIN = -90;
export const LAT_MAX = 90;
export const LNG_MIN = -180;
export const LNG_MAX = 180;
export function isValidGeoPoint(point) {
    if (!point || typeof point !== 'object')
        return false;
    const p = point;
    if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number' || typeof p.timestamp !== 'number') {
        return false;
    }
    if (Number.isNaN(p.latitude) || Number.isNaN(p.longitude)) {
        return false;
    }
    return (p.latitude >= LAT_MIN &&
        p.latitude <= LAT_MAX &&
        p.longitude >= LNG_MIN &&
        p.longitude <= LNG_MAX);
}
export function isValidPhoneNumber(phone) {
    if (typeof phone !== 'string')
        return false;
    // Basic E.164 phone regex (e.g. +51987654321, min 8 digits)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    return phoneRegex.test(phone.trim());
}
export function isValidEmergencyToken(token) {
    if (typeof token !== 'string')
        return false;
    // UUIDv4 or hex string 32-64 chars
    return /^[0-9a-fA-F-]{32,64}$/.test(token.trim());
}
//# sourceMappingURL=index.js.map