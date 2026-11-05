import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requestCancellationLink } from '@/lib/cancellations';

// Step 1 of self-service cancellation: email a one-time link to the registered address.
// The reply is the same whether or not the email is registered, so this can't reveal who signed up.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter the email you registered with' }, { status: 400 });
    }

    const db = await getDatabase();
    await requestCancellationLink(db, email.trim(), request.nextUrl.origin);

    return NextResponse.json({
      success: true,
      message: "If that email is registered, we've sent it a link to cancel. Check your inbox (and junk folder).",
    });
  } catch (error) {
    console.error('Error requesting cancellation link:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
