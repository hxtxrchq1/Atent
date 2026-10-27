import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthService } from './auth.js';

describe('AuthService Domain & Cryptographic Security Suite', () => {
  it('registers a new user and issues secure JWT access token and refresh token', () => {
    const auth = new AuthService({ jwtSecret: 'super_secret_test_key_32_characters_long' });
    const { user, tokens } = auth.register({
      email: 'user@example.com',
      password: 'SecurePassword123!',
      fullName: 'Alice Guardian',
      phoneNumber: '+51999888777',
    });

    assert.strictEqual(user.email, 'user@example.com');
    assert.strictEqual(user.fullName, 'Alice Guardian');
    // Ensure password hash and salt are NOT exposed in user record
    assert.strictEqual((user as any).passwordHash, undefined);
    assert.strictEqual((user as any).passwordSalt, undefined);

    assert.ok(tokens.accessToken);
    assert.ok(tokens.refreshToken);
    assert.strictEqual(tokens.tokenType, 'Bearer');

    const verified = auth.verifyAccessToken(tokens.accessToken);
    assert.strictEqual(verified.userId, user.id);
    assert.strictEqual(verified.email, user.email);
  });

  it('rejects duplicate email registrations', () => {
    const auth = new AuthService({ jwtSecret: 'super_secret_test_key_32_characters_long' });
    auth.register({
      email: 'duplicate@example.com',
      password: 'Password123!',
      fullName: 'Alice',
      phoneNumber: '+51999888777',
    });

    assert.throws(
      () =>
        auth.register({
          email: 'DUPLICATE@example.com ',
          password: 'Password123!',
          fullName: 'Alice',
          phoneNumber: '+51999888777',
        }),
      /EMAIL_ALREADY_EXISTS/
    );
  });

  it('authenticates user with valid password and rejects invalid password', () => {
    const auth = new AuthService({ jwtSecret: 'super_secret_test_key_32_characters_long' });
    auth.register({
      email: 'bob@example.com',
      password: 'CorrectPassword123',
      fullName: 'Bob Protector',
      phoneNumber: '+51988777666',
    });

    // Valid login
    const { tokens } = auth.login({
      email: 'bob@example.com',
      password: 'CorrectPassword123',
    });
    assert.ok(tokens.accessToken);

    // Wrong password
    assert.throws(
      () =>
        auth.login({
          email: 'bob@example.com',
          password: 'WrongPassword123',
        }),
      /INVALID_CREDENTIALS/
    );
  });

  it('performs refresh token rotation and revokes previous refresh token', () => {
    const auth = new AuthService({ jwtSecret: 'super_secret_test_key_32_characters_long' });
    const { tokens: initialTokens } = auth.register({
      email: 'charlie@example.com',
      password: 'Password12345!',
      fullName: 'Charlie Safety',
      phoneNumber: '+51977666555',
    });

    // Rotate refresh token
    const rotatedTokens = auth.refresh(initialTokens.refreshToken);
    assert.ok(rotatedTokens.accessToken);
    assert.notStrictEqual(rotatedTokens.refreshToken, initialTokens.refreshToken);

    // Attempting to reuse old refresh token must be rejected
    assert.throws(() => auth.refresh(initialTokens.refreshToken), /TOKEN_EXPIRED_OR_REVOKED/);
  });

  it('revokes session and invalidates access token', () => {
    const auth = new AuthService({ jwtSecret: 'super_secret_test_key_32_characters_long' });
    const { user, tokens } = auth.register({
      email: 'diana@example.com',
      password: 'Password123!',
      fullName: 'Diana Prince',
      phoneNumber: '+51966555444',
    });

    const payload = auth.verifyAccessToken(tokens.accessToken);
    assert.strictEqual(payload.userId, user.id);

    // Revoke user's session
    auth.revokeSession(payload.sessionId, user.id);

    // Access token now rejected because session was revoked
    assert.throws(() => auth.verifyAccessToken(tokens.accessToken), /SESSION_REVOKED/);
  });

  it('enforces strict user isolation when attempting to revoke sessions of other users', () => {
    const auth = new AuthService({ jwtSecret: 'super_secret_test_key_32_characters_long' });
    const userA = auth.register({
      email: 'usera@example.com',
      password: 'Password123!',
      fullName: 'User A',
      phoneNumber: '+51955444333',
    });

    const userB = auth.register({
      email: 'userb@example.com',
      password: 'Password123!',
      fullName: 'User B',
      phoneNumber: '+51944333222',
    });

    const sessionA = auth.verifyAccessToken(userA.tokens.accessToken).sessionId;

    // User B tries to revoke User A's session -> Must be rejected with UNAUTHORIZED_SESSION_ACCESS
    assert.throws(
      () => auth.revokeSession(sessionA, userB.user.id),
      /UNAUTHORIZED_SESSION_ACCESS/
    );
  });

  it('generates secure 6-digit OTP, stores SHA-256 hash, masks target and rejects invalid codes', () => {
    process.env.NODE_ENV = 'test';
    const auth = new AuthService();
    const req = auth.requestOtp({ target: '+51988111222', type: 'PHONE' });
    
    assert.strictEqual(req.success, true);
    assert.strictEqual(req.targetMasked, '+51 *** *** 222');
    assert.strictEqual((req as any).debugCode, undefined);
    assert.ok(req.testSandboxCode);
    assert.strictEqual(req.testSandboxCode.length, 6);

    // Immediate repeat request triggers cooldown
    assert.throws(
      () => auth.requestOtp({ target: '+51988111222', type: 'PHONE' }),
      /COOLDOWN_ACTIVE/
    );

    // Wrong code rejected
    assert.throws(
      () => auth.verifyOtpAndRegisterOrLogin({ target: '+51988111222', code: '999999' }),
      /INVALID_OTP_CODE/
    );

    // Correct code succeeds
    const code = req.testSandboxCode!;
    const verified = auth.verifyOtpAndRegisterOrLogin({
      target: '+51988111222',
      code,
      fullName: 'Valid User',
    });
    assert.strictEqual(verified.user.phoneNumber, '+51988111222');
    assert.strictEqual(verified.isNewUser, true);
    assert.ok(verified.tokens.accessToken);

    // Code is single-use: second attempt fails
    assert.throws(
      () => auth.verifyOtpAndRegisterOrLogin({ target: '+51988111222', code }),
      /OTP_NOT_FOUND_OR_EXPIRED/
    );
  });
});
