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
    const allEvents = await db.collection('events').find({}).sort({ date: 1, title: 1 }).toArray();
    
    const cycles = [...new Set(allEvents.map(event => cycleOf(event.date)))]
      .filter(cycle => !Number.isNaN(cycle))
      .sort((a, b) => b - a);
    const activeEvent = allEvents.find(event => event.isActive);
    const activeCycle = activeEvent ? cycleOf(activeEvent.date) : null;
    
    // Default to the cycle that is open for registration, else the most recent one
    const requested = Number(request.nextUrl.searchParams.get('cycle'));
    const cycle = cycles.includes(requested) ? requested : (activeCycle ?? cycles[0] ?? null);
    
    const events = allEvents.filter(event => cycleOf(event.date) === cycle);
    const locationIds = events.flatMap(event => (event.locationIds || []) as ObjectId[]);
    const [locations, registrations] = await Promise.all([
      db.collection('eventLocations').find({ _id: { $in: locationIds } }).toArray(),
      db.collection('registrations').find({ crawlLocation: { $in: locationIds.map(id => id.toString()) } }).toArray(),
    ]);
    const locationMap = new Map(locations.map(location => [location._id.toString(), location]));
    
    const locationStats = events.flatMap(event =>
      ((event.locationIds || []) as ObjectId[])
        .map(id => locationMap.get(id.toString()))
        .filter(location => location !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(location => {
          const locationId = location._id.toString();
          const regs = registrations.filter(reg => reg.crawlLocation === locationId);
          const maxCapacity = location.maxCapacity || 20;
          
          return {
            _id: locationId,
            name: location.name,
            address: location.address,
            eventId: event._id.toString(),
            eventTitle: event.title,
            eventDate: formatEventDate(event.date, 'short'),
            eventTime: event.time,
            registrationCount: regs.length,
            maxCapacity,
            availableSpots: Math.max(0, maxCapacity - regs.length),
            registrations: regs.map(reg => ({
              _id: reg._id.toString(),
              firstName: reg.firstName,
              lastName: reg.lastName,
              email: reg.email,
              phone: reg.phone,
              school: reg.school,
              registeredAt: reg.createdAt,
              reminderSentAt: reg.reminderSentAt ?? null
            }))
          };
        })
    );
    
    const waitlistCount = cycle ? await db.collection('waitlist').countDocuments({ cycle, status: 'waiting' }) : 0;
    
    return NextResponse.json({
      cycle,
      cycles,
      waitlistCount,
      activeCycle,
      events: events.map(event => ({
        _id: event._id.toString(),
        title: event.title,
        date: event.date,
        dateLabel: formatEventDate(event.date, 'short'),
        time: event.time,
        isActive: !!event.isActive,
      })),
      totalRegistrations: locationStats.reduce((sum, location) => sum + location.registrationCount, 0),
      locationStats
    });
    
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
