import http from 'node:http';
import { ENV_DEFAULTS } from '@atent/config';
import { EmergencyDomainService, TripDomainService, AuthService } from '@atent/shared';
// In-Memory Rate Limiter with sliding window for DoS and abuse protection
export class SimpleRateLimiter {
    windowMs;
    maxRequests;
    requests = new Map();
    constructor(windowMs = 60000, // 1 minute
    maxRequests = 60 // 60 requests / min default
    ) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }
    isAllowed(clientKey, customLimit) {
        const limit = customLimit ?? this.maxRequests;
        const now = Date.now();
        const timestamps = this.requests.get(clientKey) ?? [];
        const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);
        if (validTimestamps.length >= limit) {
            this.requests.set(clientKey, validTimestamps);
            return false;
        }
        validTimestamps.push(now);
        this.requests.set(clientKey, validTimestamps);
        return true;
    }
}
export function createApiServer(emergencyService = new EmergencyDomainService(), tripService = new TripDomainService(), authService = new AuthService(), rateLimiter = new SimpleRateLimiter()) {
    const MAX_BODY_BYTES = 65536; // 64 KB protection against body flooding
    return http.createServer(async (req, res) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const method = req.method ?? 'GET';
        const clientIp = req.socket.remoteAddress ?? 'unknown_client';
        // CORS Whitelist Validation
        const origin = req.headers.origin;
        const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        else if (!origin) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // Rate Limiting check on all incoming requests
        const isRateLimited = url.pathname.startsWith('/api/emergency/initiate')
            ? !rateLimiter.isAllowed(clientIp, 10) // 10/min max for SOS trigger
            : !rateLimiter.isAllowed(clientIp);
        if (isRateLimited) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Too Many Requests: Rate limit exceeded. Please wait.' }));
            return;
        }
        // Health Check
        if (url.pathname === '/health' || url.pathname === '/api/health') {
            const payload = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'atent-api',
                version: '0.1.0',
                uptime: process.uptime(),
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(payload));
            return;
        }
        // Read Request Body with Strict Size Limit
        const readBody = async () => {
            return new Promise((resolve, reject) => {
                let body = '';
                let bytesCount = 0;
                req.on('data', (chunk) => {
                    bytesCount += chunk.length;
                    if (bytesCount > MAX_BODY_BYTES) {
                        res.writeHead(413, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Payload Too Large: request body exceeds 64KB limit' }));
                        req.destroy();
                        return;
                    }
                    body += chunk;
                });
                req.on('end', () => {
                    try {
                        resolve(body ? JSON.parse(body) : {});
                    }
                    catch (err) {
                        reject(new Error('Invalid JSON payload'));
                    }
                });
                req.on('error', reject);
            });
        };
        // Emergency Endpoints
        try {
            if (url.pathname === '/api/emergency/initiate' && method === 'POST') {
                const body = await readBody();
                const aggregate = await emergencyService.initiateEmergency(body, body.userFullName);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(aggregate));
                return;
            }
            if (url.pathname === '/api/emergency/telemetry' && method === 'POST') {
                const body = await readBody();
                const point = emergencyService.ingestTelemetry(body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, point }));
                return;
            }
            if (url.pathname === '/api/emergency/resolve' && method === 'POST') {
                const body = await readBody();
                const alert = emergencyService.resolveEmergency(body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(alert));
                return;
            }
            if (url.pathname === '/api/emergency/contacts' && method === 'POST') {
                const body = await readBody();
                emergencyService.registerContacts(body.userId, body.contacts);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: body.contacts.length }));
                return;
            }
            if (url.pathname === '/api/emergency/push-token' && method === 'POST') {
                const body = await readBody();
                emergencyService.registerPushToken(body.userId, body.deviceToken);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Push token successfully registered' }));
                return;
            }
            if (url.pathname === '/api/emergency/acknowledge' && method === 'POST') {
                const body = await readBody();
                const ack = emergencyService.acknowledgeAlert(body.alertId, body.contactId, body.contactName, body.note);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, acknowledgement: ack }));
                return;
            }
            if (url.pathname === '/api/emergency/safety-link' && method === 'GET') {
                const token = url.searchParams.get('token');
                if (!token) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Token is required' }));
                    return;
                }
                const data = emergencyService.getPublicLiveSafetyLinkData(token);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
                return;
            }
            // Trip Mode (Modo Viaje) Endpoints
            if (url.pathname === '/api/trip/start' && method === 'POST') {
                const body = await readBody();
                const aggregate = tripService.startTrip(body);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(aggregate));
                return;
            }
            if (url.pathname === '/api/trip/location' && method === 'POST') {
                const body = await readBody();
                const point = tripService.updateTripLocation(body.tripId, body.userId, body.latitude, body.longitude, body.accuracy);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, point }));
                return;
            }
            if (url.pathname === '/api/trip/checkin' && method === 'POST') {
                const body = await readBody();
                const trip = tripService.checkinSafe(body.tripId, body.userId, body.intervalMinutes);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(trip));
                return;
            }
            if (url.pathname === '/api/trip/complete' && method === 'POST') {
                const body = await readBody();
                const trip = tripService.completeTrip(body.tripId, body.userId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(trip));
                return;
            }
            if (url.pathname === '/api/trip/safety-link' && method === 'GET') {
                const token = url.searchParams.get('token');
                if (!token) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Token is required' }));
                    return;
                }
                const data = tripService.getPublicTripTrackingData(token);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
                return;
            }
            // Authentication & User Session Endpoints
            if (url.pathname === '/api/auth/register' && method === 'POST') {
                const body = await readBody();
                const result = authService.register(body);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                return;
            }
            if (url.pathname === '/api/auth/login' && method === 'POST') {
                const body = await readBody();
                const result = authService.login({
                    ...body,
                    ipAddress: clientIp,
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                return;
            }
            if (url.pathname === '/api/auth/refresh' && method === 'POST') {
                const body = await readBody();
                if (!body.refreshToken) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'refreshToken is required' }));
                    return;
                }
                const tokens = authService.refresh(body.refreshToken);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(tokens));
                return;
            }
            if (url.pathname === '/api/auth/me' && method === 'GET') {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing or invalid Authorization header' }));
                    return;
                }
                const token = authHeader.substring(7);
                const payload = authService.verifyAccessToken(token);
                const user = authService.getUserById(payload.userId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ user, session: payload }));
                return;
            }
            if (url.pathname === '/api/auth/logout' && method === 'POST') {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing or invalid Authorization header' }));
                    return;
                }
                const token = authHeader.substring(7);
                const payload = authService.verifyAccessToken(token);
                authService.revokeSession(payload.sessionId, payload.userId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Session successfully revoked' }));
                return;
            }
        }
        catch (err) {
            const isAuthError = err.message.includes('INVALID_CREDENTIALS') ||
                err.message.includes('MALFORMED_TOKEN') ||
                err.message.includes('INVALID_TOKEN_SIGNATURE') ||
                err.message.includes('TOKEN_EXPIRED') ||
                err.message.includes('SESSION_REVOKED') ||
                err.message.includes('UNAUTHORIZED');
            let statusCode = 400;
            if (err.message.includes('Payload Too Large'))
                statusCode = 413;
            else if (isAuthError)
                statusCode = 401;
            else if (err.message.includes('EMAIL_ALREADY_EXISTS'))
                statusCode = 409;
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found', path: url.pathname }));
    });
}
if (process.argv[1]?.endsWith('main.js') && !process.env.SUPPRESS_API_LISTEN) {
    const server = createApiServer();
    const port = Number(process.env.API_PORT ?? ENV_DEFAULTS.API_PORT);
    server.listen(port, () => {
        console.log(`[Atent API] Server listening on http://localhost:${port}`);
    });
}
//# sourceMappingURL=main.js.map