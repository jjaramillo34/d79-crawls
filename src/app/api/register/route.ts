import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createRegistration, normalizePerson, sendRegistrationEmails, validatePersonFields } from '@/lib/registrations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationError = validatePersonFields(body);
    if (validationError || typeof body.crawlLocation !== 'string' || !body.crawlLocation) {
      return NextResponse.json(
        { error: validationError || 'All fields are required' },
        { status: 400 }
      );
    }

    const input = normalizePerson({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      school: body.school,
      crawlLocation: body.crawlLocation,
    });

    const db = await getDatabase();
    const result = await createRegistration(db, input);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await sendRegistrationEmails(input, result.event, result.location, result.location.availableSpots - 1);

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Registration successful! Check your email for confirmation.'
    });

  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}
