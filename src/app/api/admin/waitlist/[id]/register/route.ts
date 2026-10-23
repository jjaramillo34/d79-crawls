import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { createRegistration, normalizePerson, sendRegistrationEmails } from '@/lib/registrations';

// Move someone from the waitlist into a seat (after a cancellation or a capacity increase).
// Uses the same rules as public sign-up, and sends the normal confirmation email unless notify is false.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid waitlist id' }, { status: 400 });
    }
    const { crawlLocation, notify = true } = await request.json();
    if (typeof crawlLocation !== 'string' || !crawlLocation) {
      return NextResponse.json({ error: 'Choose a location' }, { status: 400 });
    }

    const db = await getDatabase();
    const waitlist = db.collection('waitlist');
    const entry = await waitlist.findOne({ _id: new ObjectId(id) });
    if (!entry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }
    if (entry.status !== 'waiting') {
      return NextResponse.json({ error: `${entry.firstName} ${entry.lastName} is already registered` }, { status: 400 });
    }

    const input = normalizePerson({
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      school: entry.school,
      crawlLocation,
    });
    const result = await createRegistration(db, input);
    if (!result.ok) {
      const error = result.error === 'No spots available for this location'
        ? 'No seats left at this location. Raise its capacity in Crawl Sessions → Edit, or pick another location.'
        : result.error;
      return NextResponse.json({ error }, { status: result.status });
    }

    await waitlist.updateOne(
      { _id: entry._id },
      {
        $set: {
          status: 'registered',
          registeredAt: new Date(),
          registeredBy: auth.email,
          registrationId: result.id,
          registeredLocationName: result.location.name,
          updatedAt: new Date(),
        },
      }
    );

    if (notify) {
      await sendRegistrationEmails(input, result.event, result.location, result.location.availableSpots - 1);
    }

    return NextResponse.json({
      success: true,
      message: `${entry.firstName} ${entry.lastName} is registered for ${result.location.name}${notify ? ' and was sent a confirmation email' : ''}`,
    });

  } catch (error) {
    console.error('Error registering from waitlist:', error);
    return NextResponse.json({ error: 'Failed to register from waitlist' }, { status: 500 });
  }
}
