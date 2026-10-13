import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCredentials,
  createSession,
  setSessionCookie,
  getClientIp,
  getLoginLockout,
  recordLoginFailure,
  clearLoginFailures,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const retryAfter = await getLoginLockout(email, ip);
    if (retryAfter > 0) {
      const minutes = Math.ceil(retryAfter / 60);
      return NextResponse.json(
        { error: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const admin = await verifyCredentials(email, password);
    if (!admin) {
      await recordLoginFailure(email, ip);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await clearLoginFailures(email);

    const { token, expiresAt } = await createSession(admin);
    const response = NextResponse.json({ success: true, admin });
    setSessionCookie(response, token, expiresAt);
    return response;

  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}
