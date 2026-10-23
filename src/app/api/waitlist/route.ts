import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { cycleOf, getActiveCrawlEvents } from '@/lib/crawls';
import { sendEmail, getWaitlistEmail } from '@/lib/email';
import { emailPattern, findActiveRegistration, validatePersonFields } from '@/lib/registrations';

// Join the waitlist for the cycle that is open. No seat is reserved; admins register people
// from the waitlist when a seat opens up (Admin -> Waitlist).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationError = validatePersonFields(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const email = body.email.trim();
    const preference = typeof body.preference === 'string' && body.preference ? body.preference : 'any';

    const db = await getDatabase();
    const activeEvents = await getActiveCrawlEvents(db);
    if (activeEvents.length === 0) {
      return NextResponse.json({ error: 'Registration is not open right now' }, { status: 400 });
    }
    const cycle = cycleOf(activeEvents[0].date);

    let preferenceLabel = 'Any location';
    if (preference !== 'any') {
      const event = activeEvents.find(e => e.locations.some(location => location._id === preference));
      const location = event?.locations.find(l => l._id === preference);
      if (!event || !location) {
        return NextResponse.json({ error: 'Please choose a location from the list' }, { status: 400 });
      }
      preferenceLabel = `${location.name} (${event.dateLabel}, ${event.time})`;
    }

    if (await findActiveRegistration(db, email, activeEvents)) {
      return NextResponse.json(
        { error: 'You are already registered for a crawl. Check your email for your confirmation.' },
        { status: 400 }
      );
    }

    const waitlist = db.collection('waitlist');
    const now = new Date();
    const person = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      school: body.school.trim(),
      preference,
    };

    // Joining again just updates the details; the person keeps their place in line
    const existing = await waitlist.findOne({ email: emailPattern(email), cycle, status: 'waiting' });
    if (existing) {
      await waitlist.updateOne({ _id: existing._id }, { $set: { ...person, updatedAt: now } });
      return NextResponse.json({
        success: true,
        updated: true,
        message: "You're already on the waitlist. We've updated your details and kept your place in line.",
      });
    }

    await waitlist.insertOne({ email, ...person, cycle, status: 'waiting', createdAt: now, updatedAt: now });

    await sendEmail({
      to: email,
      subject: "You're on the waitlist - District 79 Fall Crawls",
      html: getWaitlistEmail({ firstName: person.firstName, lastName: person.lastName, preferenceLabel }),
    });

    return NextResponse.json({
      success: true,
      message: "You're on the waitlist! We'll email you if a seat opens up.",
    });

  } catch (error) {
    console.error('Error joining waitlist:', error);
    return NextResponse.json({ error: 'Failed to join the waitlist' }, { status: 500 });
  }
}
