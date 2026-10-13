import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth';
import { sendRemindersForEvent } from '@/lib/reminders';

// Manual "Send reminders" from the admin dashboard: emails every attendee of the session
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { eventId } = await request.json();
    if (typeof eventId !== 'string' || !ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const result = await sendRemindersForEvent(db, event);
    console.log(`Manual reminders for ${event.title} (${event.date}) by ${auth.email}: ${result.emailsSent} sent, ${result.errors.length} failed`);
    
    return NextResponse.json({
      success: true,
      message: result.totalRegistrations === 0
        ? `No registrations found for ${event.title}`
        : `Reminder emails processed for ${event.title}`,
      ...result
    });
    
  } catch (error) {
    console.error('Error sending reminder emails:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder emails' },
      { status: 500 }
    );
  }
}
