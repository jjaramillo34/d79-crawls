import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { cycleOf, formatEventDate } from '@/lib/crawls';
import { buildAnalytics } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const db = await getDatabase();
    const requested = Number(request.nextUrl.searchParams.get('cycle'));
    const activeEvent = await db.collection('events').findOne({ isActive: true });
    const cycle = requested || (activeEvent ? cycleOf(activeEvent.date) : null);
    if (!cycle) {
      return NextResponse.json({ error: 'No crawl cycle found' }, { status: 404 });
    }

    const events = await db.collection('events')
      .find({ date: { $regex: `^${cycle}-` } })
      .sort({ date: 1, time: 1, title: 1 })
      .toArray();
    const locationIds = events.flatMap(event => (event.locationIds || []) as ObjectId[]);
    const [locations, registrations, waitlistCount] = await Promise.all([
      db.collection('eventLocations').find({ _id: { $in: locationIds } }).toArray(),
      db.collection('registrations')
        .find({ crawlLocation: { $in: locationIds.map(id => id.toString()) } }, { projection: { school: 1, createdAt: 1, crawlLocation: 1 } })
        .toArray(),
      db.collection('waitlist').countDocuments({ cycle, status: 'waiting' }),
    ]);

    // Crawl locations in session order (date, then time), each with its session label
    const locationMap = new Map(locations.map(location => [location._id.toString(), location]));
    const orderedLocations = events.flatMap(event =>
      ((event.locationIds || []) as ObjectId[])
        .map(id => locationMap.get(id.toString()))
        .filter(location => location !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(location => ({
          id: location._id.toString(),
          name: location.name as string,
          session: `${formatEventDate(event.date, 'short')} · ${event.time}`,
          capacity: (location.maxCapacity as number) || 20,
        }))
    );
    const nameById = new Map(orderedLocations.map(location => [location.id, location.name]));

    const analytics = buildAnalytics(
      registrations.map(reg => ({
        school: reg.school || '',
        createdAt: new Date(reg.createdAt),
        locationName: nameById.get(reg.crawlLocation) ?? 'Unknown',
      })),
      orderedLocations.map(location => location.name)
    );

    return NextResponse.json({
      cycle,
      waitlistCount,
      locations: orderedLocations.map(location => ({
        ...location,
        registered: registrations.filter(reg => reg.crawlLocation === location.id).length,
      })),
      ...analytics,
    });

  } catch (error) {
    console.error('Error building analytics:', error);
    return NextResponse.json({ error: 'Failed to build analytics' }, { status: 500 });
  }
}
