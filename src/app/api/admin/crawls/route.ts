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

    const events = await db.collection('events').find({}).sort({ date: 1, title: 1 }).toArray();
    const locationIds = events.flatMap(event => (event.locationIds || []) as ObjectId[]);
    const locations = await db.collection('eventLocations').find({ _id: { $in: locationIds } }).toArray();
    const locationMap = new Map(locations.map(location => [location._id.toString(), location]));

    const registrationCounts = await db.collection('registrations').aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$crawlLocation', count: { $sum: 1 } } }
    ]).toArray();
    const countMap = new Map(registrationCounts.map(row => [String(row._id), row.count]));

    const sessions = events.map(event => {
      const eventLocations = ((event.locationIds || []) as ObjectId[])
        .map(id => locationMap.get(id.toString()))
        .filter(location => location !== undefined)
        .map(location => ({
          _id: location._id.toString(),
          name: location.name,
          borough: location.borough,
          maxCapacity: location.maxCapacity || 20,
          registrationCount: countMap.get(location._id.toString()) || 0,
        }));

      return {
        _id: event._id.toString(),
        title: event.title,
        date: event.date,
        dateLabel: formatEventDate(event.date, 'short'),
        cycle: cycleOf(event.date),
        time: event.time,
        description: event.description ?? '',
        isActive: !!event.isActive,
        clonedFromEventId: event.clonedFromEventId?.toString() ?? null,
        locations: eventLocations,
        totalCapacity: eventLocations.reduce((sum, location) => sum + location.maxCapacity, 0),
        registrationCount: eventLocations.reduce((sum, location) => sum + location.registrationCount, 0),
      };
    });

    // Years that have active sessions, i.e. valid sources for a clone
    const sourceYears = [...new Set(
      sessions.filter(session => session.isActive).map(session => Number(String(session.date).slice(0, 4)))
    )].filter(year => !Number.isNaN(year)).sort((a, b) => b - a);

    const activeCycle = sessions.find(session => session.isActive)?.cycle ?? null;

    return NextResponse.json({ sessions, sourceYears, activeCycle });

  } catch (error) {
    console.error('Error fetching crawl sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch crawl sessions' }, { status: 500 });
  }
}
