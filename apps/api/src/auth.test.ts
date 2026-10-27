import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createApiServer } from './main.js';
import { AuthService, EmergencyDomainService, TripDomainService } from '@atent/shared';

describe('Auth & Session API HTTP Integration Test Suite', () => {
  function makeRequest(
    server: http.Server,
    path: string,
    method = 'GET',
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const address = server.address() as any;
      const port = address.port;

      const payload = body ? JSON.stringify(body) : undefined;
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (payload) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode ?? 0,
                body: data ? JSON.parse(data) : null,
              });
            } catch {
              resolve({
                status: res.statusCode ?? 0,
                body: data,
              });
            }
          });
        }
      );

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  it('manages user registration, login, profile query, refresh token rotation, and logout', async () => {
    process.env.NODE_ENV = 'test';
    const authService = new AuthService();
    const server = createApiServer(
      new EmergencyDomainService(),
      new TripDomainService(),
      authService
    );

    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      // 1. Register new user
      const registerRes = await makeRequest(server, '/api/auth/register', 'POST', {
        email: 'integration@atent.com',
        password: 'SecurePassword123!',
        fullName: 'Integration User',
        phoneNumber: '+51999111222',
      });

      assert.strictEqual(registerRes.status, 201);
      assert.strictEqual(registerRes.body.user.email, 'integration@atent.com');
      assert.ok(registerRes.body.tokens.accessToken);
      assert.ok(registerRes.body.tokens.refreshToken);

      // 2. Query /api/auth/me with valid Bearer token
      const meRes = await makeRequest(server, '/api/auth/me', 'GET', undefined, {
        Authorization: `Bearer ${registerRes.body.tokens.accessToken}`,
      });
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.user.email, 'integration@atent.com');

      // 3. Query /api/auth/me with missing or malformed token -> 401
      const unauthorizedRes = await makeRequest(server, '/api/auth/me', 'GET');
      assert.strictEqual(unauthorizedRes.status, 401);

      // 4. Login with correct credentials
      const loginRes = await makeRequest(server, '/api/auth/login', 'POST', {
        email: 'integration@atent.com',
        password: 'SecurePassword123!',
      });
      assert.strictEqual(loginRes.status, 200);
      assert.ok(loginRes.body.tokens.accessToken);
      const newRefreshToken = loginRes.body.tokens.refreshToken;

      // 5. Rotate tokens via /api/auth/refresh
      const refreshRes = await makeRequest(server, '/api/auth/refresh', 'POST', {
        refreshToken: newRefreshToken,
      });
      assert.strictEqual(refreshRes.status, 200);
      assert.ok(refreshRes.body.accessToken);
      assert.notStrictEqual(refreshRes.body.refreshToken, newRefreshToken);

      // Old refresh token must be revoked
      const reuseRes = await makeRequest(server, '/api/auth/refresh', 'POST', {
        refreshToken: newRefreshToken,
      });
      assert.strictEqual(reuseRes.status, 401);

      // 6. Logout and revoke session
      const logoutRes = await makeRequest(server, '/api/auth/logout', 'POST', undefined, {
        Authorization: `Bearer ${refreshRes.body.accessToken}`,
      });
      assert.strictEqual(logoutRes.status, 200);
      assert.strictEqual(logoutRes.body.success, true);

      // Revoked session token must now be rejected
      const afterLogoutRes = await makeRequest(server, '/api/auth/me', 'GET', undefined, {
        Authorization: `Bearer ${refreshRes.body.accessToken}`,
      });
      assert.strictEqual(afterLogoutRes.status, 401);

      // 7. Test Phone Number OTP Registration & Verification
      const otpRequest = await makeRequest(server, '/api/auth/otp/request', 'POST', {
        target: '+51999888111',
        type: 'PHONE',
      });
      assert.strictEqual(otpRequest.status, 200);
      assert.ok(otpRequest.body.targetMasked);
      assert.strictEqual(otpRequest.body.debugCode, undefined); // debugCode must never exist in API response
      assert.ok(otpRequest.body.testSandboxCode); // available only in test environment

      // 8. Test invalid OTP rejection
      const invalidVerify = await makeRequest(server, '/api/auth/otp/verify', 'POST', {
        target: '+51999888111',
        code: '000000',
      });
      assert.strictEqual(invalidVerify.status, 400);

      // 9. Verify OTP with valid test code
      const otpVerify = await makeRequest(server, '/api/auth/otp/verify', 'POST', {
        target: '+51999888111',
        code: otpRequest.body.testSandboxCode,
        fullName: 'Carlos Movil',
      });
      assert.strictEqual(otpVerify.status, 200);
      assert.strictEqual(otpVerify.body.user.phoneNumber, '+51999888111');
      assert.strictEqual(otpVerify.body.isNewUser, true);
      assert.ok(otpVerify.body.tokens.accessToken);

      // 10. Reusing same OTP must fail immediately (invalidated)
      const reuseVerify = await makeRequest(server, '/api/auth/otp/verify', 'POST', {
        target: '+51999888111',
        code: otpRequest.body.testSandboxCode,
      });
      assert.strictEqual(reuseVerify.status, 400);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
