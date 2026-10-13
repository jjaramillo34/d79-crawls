import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getActiveCrawlEvents } from '@/lib/crawls';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();
    const events = await getActiveCrawlEvents(db);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching location availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location availability' },
      { status: 500 }
    );
  }
}
