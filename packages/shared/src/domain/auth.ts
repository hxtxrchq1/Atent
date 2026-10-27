import crypto from 'node:crypto';
import { AuthSession, AuthTokenPayload, AuthTokens, User } from '@atent/types';

export interface RegisterUserDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

export interface LoginDto {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface StoredUserRecord extends User {
  passwordHash: string;
  passwordSalt: string;
}

export interface RequestOtpDto {
  target: string; // phone number or email
  type: 'PHONE' | 'EMAIL';
}

export interface VerifyOtpDto {
  target: string;
  code: string;
  fullName?: string;
  password?: string;
}

export interface OtpRecord {
  target: string;
  codeHash: string;
  type: 'PHONE' | 'EMAIL';
  expiresAt: number;
  lastRequestedAt: number;
  attempts: number;
}

export interface RequestOtpResponse {
  success: boolean;
  targetMasked: string;
  type: 'PHONE' | 'EMAIL';
  expiresInSeconds: number;
  cooldownSeconds: number;
  // Test/Sandbox isolated: only defined when NODE_ENV === 'test'
  testSandboxCode?: string;
}

export class AuthService {
  private usersByEmail = new Map<string, StoredUserRecord>();
  private usersByPhone = new Map<string, StoredUserRecord>();
  private usersById = new Map<string, StoredUserRecord>();
  private sessions = new Map<string, AuthSession>();
  private pendingOtps = new Map<string, OtpRecord>();

  private readonly jwtSecret: string;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;

  constructor(options: {
    jwtSecret?: string;
    accessTokenTtlSeconds?: number;
    refreshTokenTtlSeconds?: number;
  } = {}) {
    this.jwtSecret = options.jwtSecret || 'atent_dev_secret_key_change_in_production_min_32_chars';
    this.accessTokenTtlSeconds = options.accessTokenTtlSeconds || 900; // 15 minutes
    this.refreshTokenTtlSeconds = options.refreshTokenTtlSeconds || 604800; // 7 days
  }

  public requestOtp(dto: RequestOtpDto): RequestOtpResponse {
    const normalizedTarget = dto.target.trim().toLowerCase();
    const now = Date.now();
    const existing = this.pendingOtps.get(normalizedTarget);

    // Rate Limiting: 60-second cooldown between resend requests for the same target
    if (existing && now - existing.lastRequestedAt < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - existing.lastRequestedAt)) / 1000);
      throw new Error(`COOLDOWN_ACTIVE: Espere ${waitSeconds} segundos antes de solicitar otro código`);
    }

    // Cryptographically secure 6-digit numeric OTP generation (Rule 1: No Math.random())
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes TTL

    this.pendingOtps.set(normalizedTarget, {
      target: normalizedTarget,
      codeHash,
      type: dto.type,
      expiresAt,
      lastRequestedAt: now,
      attempts: 0,
    });

    const isTestEnv = process.env.NODE_ENV === 'test';
    const targetMasked =
      dto.type === 'PHONE'
        ? (normalizedTarget.length > 6
            ? `${normalizedTarget.slice(0, 3)} *** *** ${normalizedTarget.slice(-3)}`
            : '***')
        : normalizedTarget.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    return {
      success: true,
      targetMasked,
      type: dto.type,
      expiresInSeconds: 300,
      cooldownSeconds: 60,
      ...(isTestEnv ? { testSandboxCode: rawCode } : {}),
    };
  }

  public verifyOtpAndRegisterOrLogin(dto: VerifyOtpDto): { user: User; tokens: AuthTokens; isNewUser: boolean } {
    const normalizedTarget = dto.target.trim().toLowerCase();
    const otp = this.pendingOtps.get(normalizedTarget);

    if (!otp) {
      throw new Error('OTP_NOT_FOUND_OR_EXPIRED');
    }

    if (Date.now() > otp.expiresAt) {
      this.pendingOtps.delete(normalizedTarget);
      throw new Error('OTP_EXPIRED');
    }

    if (otp.attempts >= 5) {
      this.pendingOtps.delete(normalizedTarget);
      throw new Error('MAX_OTP_ATTEMPTS_EXCEEDED');
    }

    // Verify SHA-256 hash using constant-time comparison against brute-force timing attacks
    const inputHash = crypto.createHash('sha256').update(dto.code.trim()).digest('hex');
    const inputBuf = Buffer.from(inputHash, 'hex');
    const expectedBuf = Buffer.from(otp.codeHash, 'hex');

    if (inputBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(inputBuf, expectedBuf)) {
      otp.attempts += 1;
      throw new Error('INVALID_OTP_CODE');
    }

    // OTP verified successfully, invalidate immediately
    this.pendingOtps.delete(normalizedTarget);

    // Check if user already exists by phone or email
    let record = otp.type === 'EMAIL'
      ? this.usersByEmail.get(normalizedTarget)
      : this.usersByPhone.get(normalizedTarget);

    let isNewUser = false;
    const now = new Date().toISOString();

    if (!record) {
      isNewUser = true;
      const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
      const salt = crypto.randomBytes(16).toString('hex');
      const password = dto.password || crypto.randomBytes(12).toString('hex');
      const hash = this.hashPassword(password, salt);
      const email = otp.type === 'EMAIL' ? normalizedTarget : `${userId}@atent.app`;
      const fullName = dto.fullName?.trim() || (otp.type === 'EMAIL' ? (normalizedTarget.split('@')[0] ?? 'Usuario') : `Usuario ${normalizedTarget.slice(-4)}`);
      const phoneNumber = otp.type === 'PHONE' ? normalizedTarget : '+000000000';

      const newRecord: StoredUserRecord = {
        id: userId,
        email,
        fullName,
        phoneNumber,
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: now,
        updatedAt: now,
      };

      this.usersByEmail.set(email, newRecord);
      this.usersByPhone.set(phoneNumber, newRecord);
      this.usersById.set(userId, newRecord);
      record = newRecord;
    }

    const tokens = this.createSession(record);
    const { passwordHash, passwordSalt, ...safeUser } = record;
    return { user: safeUser, tokens, isNewUser };
  }

  public register(dto: RegisterUserDto): { user: User; tokens: AuthTokens } {
    const normalizedEmail = dto.email.trim().toLowerCase();
    if (this.usersByEmail.has(normalizedEmail)) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    if (!dto.password || dto.password.length < 8) {
      throw new Error('PASSWORD_TOO_WEAK');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = this.hashPassword(dto.password, salt);

    const now = new Date().toISOString();
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;

    const record: StoredUserRecord = {
      id: userId,
      email: normalizedEmail,
      fullName: dto.fullName.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      updatedAt: now,
    };

    this.usersByEmail.set(normalizedEmail, record);
    this.usersById.set(userId, record);

    const tokens = this.createSession(record);
    const { passwordHash, passwordSalt, ...safeUser } = record;
    return { user: safeUser, tokens };
  }

  public login(dto: LoginDto): { user: User; tokens: AuthTokens } {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const record = this.usersByEmail.get(normalizedEmail);
    if (!record) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const inputHash = this.hashPassword(dto.password, record.passwordSalt);
    const inputBuf = Buffer.from(inputHash, 'hex');
    const expectedBuf = Buffer.from(record.passwordHash, 'hex');

    if (inputBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(inputBuf, expectedBuf)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const tokens = this.createSession(record, dto.deviceInfo, dto.ipAddress);
    const { passwordHash, passwordSalt, ...safeUser } = record;
    return { user: safeUser, tokens };
  }

  public refresh(refreshToken: string): AuthTokens {
    const rawHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Find session matching refresh token hash
    let matchedSession: AuthSession | null = null;
    for (const session of this.sessions.values()) {
      if (session.refreshTokenHash === rawHash) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const now = Date.now();
    if (matchedSession.revokedAt || matchedSession.expiresAt < now) {
      throw new Error('TOKEN_EXPIRED_OR_REVOKED');
    }

    const user = this.usersById.get(matchedSession.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Refresh Token Rotation: revoke old session, generate brand new session and tokens
    matchedSession.revokedAt = now;
    return this.createSession(user, matchedSession.deviceInfo, matchedSession.ipAddress);
  }

  public revokeSession(sessionId: string, requestingUserId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Strict user isolation: cannot revoke another user's session
    if (session.userId !== requestingUserId) {
      throw new Error('UNAUTHORIZED_SESSION_ACCESS');
    }

    session.revokedAt = Date.now();
    return true;
  }

  public revokeAllUserSessions(userId: string): number {
    let count = 0;
    const now = Date.now();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = now;
        count += 1;
      }
    }
    return count;
  }

  public verifyAccessToken(token: string): AuthTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('MALFORMED_TOKEN');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    if (!headerB64 || !payloadB64 || !signatureB64) {
      throw new Error('MALFORMED_TOKEN');
    }
    const dataToSign = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(dataToSign)
      .digest('base64url');

    const sigBuf = Buffer.from(signatureB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new Error('INVALID_TOKEN_SIGNATURE');
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as AuthTokenPayload;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSeconds) {
      throw new Error('TOKEN_EXPIRED');
    }

    // Validate that the underlying session hasn't been revoked
    const session = this.sessions.get(payload.sessionId);
    if (!session || session.revokedAt) {
      throw new Error('SESSION_REVOKED');
    }

    return payload;
  }

  public getUserById(userId: string): User | null {
    const record = this.usersById.get(userId);
    if (!record) return null;
    const { passwordHash, passwordSalt, ...safeUser } = record;
    return safeUser;
  }

  private createSession(user: StoredUserRecord, deviceInfo?: string, ipAddress?: string): AuthTokens {
    const sessionId = `ses_${crypto.randomBytes(12).toString('hex')}`;
    const rawRefreshToken = `rft_${crypto.randomBytes(32).toString('hex')}`;
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const now = Date.now();
    const expiresAt = now + this.refreshTokenTtlSeconds * 1000;

    const session: AuthSession = {
      sessionId,
      userId: user.id,
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      createdAt: now,
      expiresAt,
      revokedAt: null,
    };

    this.sessions.set(sessionId, session);

    const nowSeconds = Math.floor(now / 1000);
    const expSeconds = nowSeconds + this.accessTokenTtlSeconds;

    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: 'USER',
      sessionId,
      iat: nowSeconds,
      exp: expSeconds,
    };

    const accessToken = this.signJwt(payload);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.accessTokenTtlSeconds,
      tokenType: 'Bearer',
    };
  }

  private signJwt(payload: AuthTokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const dataToSign = `${headerB64}.${payloadB64}`;
    const signatureB64 = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(dataToSign)
      .digest('base64url');

    return `${dataToSign}.${signatureB64}`;
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }
}
