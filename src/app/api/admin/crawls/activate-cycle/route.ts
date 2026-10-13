import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

// Opens every session in the given cycle (year) for registration and closes all others
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { cycle } = await request.json();
    if (!Number.isInteger(cycle) || cycle < 2000 || cycle > 2100) {
      return NextResponse.json({ error: 'cycle must be a 4-digit year' }, { status: 400 });
    }

    const db = await getDatabase();
    const events = db.collection('events');
    const inCycle = { date: { $regex: `^${cycle}-` } };

    const sessionCount = await events.countDocuments(inCycle);
    if (sessionCount === 0) {
      return NextResponse.json({ error: `No sessions found for ${cycle}` }, { status: 404 });
    }

    const now = new Date();
    const opened = await events.updateMany(
      { ...inCycle, isActive: { $ne: true } },
      { $set: { isActive: true, updatedAt: now, updatedBy: auth.email } }
    );
    const closed = await events.updateMany(
      { date: { $not: { $regex: `^${cycle}-` } }, isActive: true },
      { $set: { isActive: false, updatedAt: now, updatedBy: auth.email } }
    );

    return NextResponse.json({
      success: true,
      cycle,
      sessionsOpened: opened.modifiedCount,
      sessionsClosed: closed.modifiedCount,
      message: `${cycle} is now open for registration (${sessionCount} session${sessionCount === 1 ? '' : 's'}). Other cycles are closed.`,
    });

  } catch (error) {
    console.error('Error activating crawl cycle:', error);
    return NextResponse.json({ error: 'Failed to activate cycle' }, { status: 500 });
  }
}
