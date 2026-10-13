import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  getAdminSession,
  verifyCredentials,
  validateNewPassword,
  changePassword,
  getClientIp,
  getLoginLockout,
  recordLoginFailure,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Uses getAdminSession rather than requireAdmin so accounts with mustChangePassword can reach it
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    // Wrong current passwords count toward the same lockout as failed logins
    const ip = getClientIp(request);
    if (await getLoginLockout(admin.email, ip) > 0) {
      return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 });
    }

    if (!await verifyCredentials(admin.email, currentPassword)) {
      await recordLoginFailure(admin.email, ip);
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const validationError = validateNewPassword(newPassword, currentPassword);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await changePassword(admin.email, newPassword, request.cookies.get(SESSION_COOKIE)?.value);

    return NextResponse.json({ success: true, admin: { ...admin, mustChangePassword: false } });

  } catch (error) {
    console.error('Error changing admin password:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
