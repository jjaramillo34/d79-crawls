import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { cycleOf, formatEventDate } from '@/lib/crawls';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await getDatabase();
    const requested = Number(request.nextUrl.searchParams.get('cycle'));
    const activeEvent = await db.collection('events').findOne({ isActive: true });
    const cycle = requested || (activeEvent ? cycleOf(activeEvent.date) : null);
    if (!cycle) {
      return NextResponse.json({ cycle: null, entries: [], byPreference: [] });
    }

    const entries = await db.collection('waitlist').find({ cycle }).sort({ createdAt: 1 }).toArray();

    // Resolve preferred locations to "Name · date"
    const preferenceIds = [...new Set(entries.map(entry => entry.preference).filter(id => id && id !== 'any' && ObjectId.isValid(id)))];
    const locations = await db.collection('eventLocations').find({ _id: { $in: preferenceIds.map(id => new ObjectId(id)) } }).toArray();
    const events = await db.collection('events').find({ locationIds: { $in: locations.map(location => location._id) } }).toArray();
    const labels = new Map(locations.map(location => {
      const event = events.find(e => (e.locationIds as ObjectId[]).some(id => id.equals(location._id)));
      return [location._id.toString(), event ? `${location.name} · ${formatEventDate(event.date, 'short')}` : location.name];
    }));

    let position = 0;
    const result = entries.map(entry => ({
      _id: entry._id.toString(),
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      school: entry.school,
      preference: entry.preference,
      preferenceLabel: entry.preference === 'any' ? 'Any location' : labels.get(entry.preference) ?? 'Unknown location',
      status: entry.status,
      position: entry.status === 'waiting' ? ++position : null,
      createdAt: entry.createdAt,
      registeredAt: entry.registeredAt ?? null,
      registeredLocationName: entry.registeredLocationName ?? null,
    }));

    const counts = new Map<string, number>();
    for (const entry of result.filter(e => e.status === 'waiting')) {
      counts.set(entry.preferenceLabel, (counts.get(entry.preferenceLabel) || 0) + 1);
    }

    return NextResponse.json({
      cycle,
      entries: result,
      byPreference: [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    });

  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
  }
}
