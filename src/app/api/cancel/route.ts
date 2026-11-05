import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { cancelWithToken, findRegistrationByToken, registrationDetails } from '@/lib/cancellations';

const INVALID = 'This cancellation link is invalid, expired, or was already used.';

// Step 2: show what the link would cancel
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: INVALID }, { status: 400 });

    const db = await getDatabase();
    const found = await findRegistrationByToken(db, token);
    if (!found) return NextResponse.json({ error: INVALID }, { status: 404 });

    const { firstName, lastName, locationName, dateLabel, time } = await registrationDetails(db, found.registration);
    return NextResponse.json({ registration: { firstName, lastName, locationName, dateLabel, time } });
  } catch (error) {
    console.error('Error reading cancellation link:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

// Step 3: confirm and cancel
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (typeof token !== 'string' || !token) return NextResponse.json({ error: INVALID }, { status: 400 });

    const db = await getDatabase();
    const cancelled = await cancelWithToken(db, token);
    if (!cancelled) return NextResponse.json({ error: INVALID }, { status: 404 });

    console.log(`Registration for ${cancelled.email} at ${cancelled.locationName} cancelled by the attendee`);
    return NextResponse.json({ success: true, message: 'Your registration has been cancelled. We sent a confirmation email.' });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
