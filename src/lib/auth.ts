import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const SESSION_COOKIE = 'd79_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const MIN_PASSWORD_LENGTH = 12;
const BCRYPT_ROUNDS = 12;

// Failed-login lockout: too many failures within the window blocks further attempts
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

// Compared against when the email is unknown so failed logins take the same time either way
const DUMMY_HASH = '$2b$12$NflPHpANf4oGwy2yXNSJO.V06RrY0w0MvMio4GVAoEy6yc9HG2GKm';

export interface AdminUser {
  _id?: unknown;
  email: string;
  name?: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  mustChangePassword?: boolean;
  passwordChangedAt?: Date;
}

export interface AdminSession {
  email: string;
  name?: string;
  mustChangePassword: boolean;
}

function toSession(user: AdminUser): AdminSession {
  return { email: user.email, name: user.name, mustChangePassword: !!user.mustChangePassword };
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

let indexesReady: Promise<unknown> | null = null;
async function getAuthCollections() {
  const db = await getDatabase();
  const users = db.collection<AdminUser>('adminUsers');
  const sessions = db.collection('adminSessions');
  const loginFailures = db.collection('adminLoginFailures');
  if (!indexesReady) {
    indexesReady = Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      sessions.createIndex({ tokenHash: 1 }, { unique: true }),
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      loginFailures.createIndex({ key: 1, createdAt: 1 }),
      loginFailures.createIndex({ createdAt: 1 }, { expireAfterSeconds: LOGIN_WINDOW_SECONDS }),
    ]).catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  await indexesReady;
  return { users, sessions, loginFailures };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

/** Returns seconds until another attempt is allowed, or 0 if not locked out. */
export async function getLoginLockout(email: string, ip: string): Promise<number> {
  const { loginFailures } = await getAuthCollections();
  const since = new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000);

  const checks: [string, number][] = [[`email:${normalizeEmail(email)}`, MAX_FAILURES_PER_EMAIL], [`ip:${ip}`, MAX_FAILURES_PER_IP]];
  let retryAfter = 0;
  for (const [key, limit] of checks) {
    const failures = await loginFailures
      .find({ key, createdAt: { $gt: since } }, { projection: { createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    if (failures.length >= limit) {
      // Locked until the oldest of the most recent `limit` failures leaves the window
      const unlockAt = failures[limit - 1].createdAt.getTime() + LOGIN_WINDOW_SECONDS * 1000;
      retryAfter = Math.max(retryAfter, Math.ceil((unlockAt - Date.now()) / 1000));
    }
  }
  return retryAfter;
}

export async function recordLoginFailure(email: string, ip: string) {
  const { loginFailures } = await getAuthCollections();
  const createdAt = new Date();
  await loginFailures.insertMany([
    { key: `email:${normalizeEmail(email)}`, createdAt },
    { key: `ip:${ip}`, createdAt },
  ]);
}

export async function clearLoginFailures(email: string) {
  const { loginFailures } = await getAuthCollections();
  await loginFailures.deleteMany({ key: `email:${normalizeEmail(email)}` });
}

export async function verifyCredentials(email: string, password: string): Promise<AdminSession | null> {
  const { users } = await getAuthCollections();
  const user = await users.findOne({ email: normalizeEmail(email), isActive: true });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return null;

  await users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return toSession(user);
}

/** Returns an error message if the new password is not acceptable. */
export function validateNewPassword(newPassword: unknown, currentPassword: string): string | null {
  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (newPassword.length > 72) {
    // bcrypt ignores anything past 72 bytes
    return 'New password must be at most 72 characters';
  }
  if (newPassword === currentPassword) {
    return 'New password must be different from the current password';
  }
  return null;
}

/** Updates the password and signs the user out of every other session. */
export async function changePassword(email: string, newPassword: string, keepToken?: string) {
  const { users, sessions } = await getAuthCollections();
  const now = new Date();
  await users.updateOne(
    { email },
    { $set: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), mustChangePassword: false, passwordChangedAt: now, updatedAt: now } }
  );
  await sessions.deleteMany({
    email,
    ...(keepToken ? { tokenHash: { $ne: hashToken(keepToken) } } : {}),
  });
}

export async function createSession(admin: AdminSession) {
  const { sessions } = await getAuthCollections();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sessions.insertOne({ tokenHash: hashToken(token), email: admin.email, createdAt: new Date(), expiresAt });
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  const { sessions } = await getAuthCollections();
  await sessions.deleteOne({ tokenHash: hashToken(token) });
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Returns the signed-in admin for this request, or null if the session is missing/expired/revoked. */
export async function getAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { users, sessions } = await getAuthCollections();
  const session = await sessions.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;

  // Deactivating a user revokes their existing sessions too
  const user = await users.findOne({ email: session.email, isActive: true });
  if (!user) return null;

  return toSession(user);
}

/**
 * Use at the top of admin API routes:
 *   const auth = await requireAdmin(request);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireAdmin(request: NextRequest): Promise<AdminSession | NextResponse> {
  const admin = await getAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Accounts with a one-time password must set their own before doing anything else
  if (admin.mustChangePassword) {
    return NextResponse.json({ error: 'Password change required', mustChangePassword: true }, { status: 403 });
  }
  return admin;
}
