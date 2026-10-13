import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { addDays, todayInNewYork } from '@/lib/crawls';
import { sendRemindersForEvent } from '@/lib/reminders';

// Called once a day by the Power Automate "reminder scheduler" flow (docs/power-automate.md).
// Sends reminders for active sessions happening `daysAhead` days from today (New York time).
// Safe to call repeatedly: attendees who were already reminded are skipped.
export const maxDuration = 300;

const DEFAULT_DAYS_AHEAD = 2;
// Per call; at ~2s per email (Power Automate pacing) this stays well under Power Automate's
// 2-minute HTTP action timeout. Schedule several runs that morning to cover larger sessions.
const DEFAULT_LIMIT = 25;

function isAuthorized(request: NextRequest) {
  const expected = process.env.REMINDERS_API_KEY;
  if (!expected) return false;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REMINDERS_API_KEY) {
      return NextResponse.json({ error: 'Scheduled reminders are not configured (REMINDERS_API_KEY is not set)' }, { status: 503 });
    }
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const daysAhead = body.daysAhead ?? DEFAULT_DAYS_AHEAD;
    if (!Number.isInteger(daysAhead) || daysAhead < 0 || daysAhead > 14) {
      return NextResponse.json({ error: 'daysAhead must be a whole number between 0 and 14' }, { status: 400 });
    }
    const limit = body.limit ?? DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return NextResponse.json({ error: 'limit must be a whole number between 1 and 200' }, { status: 400 });
    }
    const dryRun = body.dryRun === true;

    const today = todayInNewYork();
    const targetDate = addDays(today, daysAhead);

    const db = await getDatabase();
    const events = await db.collection('events').find({ isActive: true, date: targetDate }).toArray();

    if (dryRun) {
      const sessions = await Promise.all(events.map(async event => {
        const locationIds = (event.locationIds || []).map((id: { toString(): string }) => id.toString());
        const [total, pending] = await Promise.all([
          db.collection('registrations').countDocuments({ crawlLocation: { $in: locationIds } }),
          db.collection('registrations').countDocuments({ crawlLocation: { $in: locationIds }, reminderSentAt: { $exists: false } }),
        ]);
        return { eventId: event._id.toString(), title: event.title, date: event.date, totalRegistrations: total, wouldSend: pending };
      }));
      return NextResponse.json({ dryRun: true, today, targetDate, sessions });
    }

    const sessions = [];
    let budget = limit;
    for (const event of events) {
      const result = await sendRemindersForEvent(db, event, { skipAlreadyReminded: true, limit: budget });
      budget -= result.emailsSent + result.errors.length;
      sessions.push(result);
    }

    const emailsSent = sessions.reduce((sum, session) => sum + session.emailsSent, 0);
    const remaining = sessions.reduce((sum, session) => sum + session.remaining, 0);
    const failures = sessions.reduce((sum, session) => sum + session.errors.length, 0);
    console.log(`Scheduled reminders for ${targetDate}: ${sessions.length} session(s), ${emailsSent} sent, ${failures} failed, ${remaining} remaining`);

    return NextResponse.json({
      success: failures === 0,
      today,
      targetDate,
      message: sessions.length === 0
        ? `No active sessions on ${targetDate}; nothing to send`
        : `Sent ${emailsSent} reminder(s) for ${sessions.length} session(s) on ${targetDate}${failures ? `, ${failures} failed` : ''}${remaining ? `, ${remaining} still to send` : ''}`,
      emailsSent,
      failures,
      remaining,
      sessions,
    });

  } catch (error) {
    console.error('Error sending scheduled reminders:', error);
    return NextResponse.json({ error: 'Failed to send scheduled reminders' }, { status: 500 });
  }
}
