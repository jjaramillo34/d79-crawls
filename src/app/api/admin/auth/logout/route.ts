import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, destroySession, clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      await destroySession(token);
    }
  } catch (error) {
    console.error('Error during admin logout:', error);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
