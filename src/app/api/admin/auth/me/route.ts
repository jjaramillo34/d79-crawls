import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ admin });
  } catch (error) {
    console.error('Error checking admin session:', error);
    return NextResponse.json({ error: 'Failed to check session' }, { status: 500 });
  }
}
