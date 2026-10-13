import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { cycleOf, isValidDateString } from '@/lib/crawls';

// Edit a session's title, date, time and description, and its locations' capacities
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
    }

    const { title, date, time, description, locations } = await request.json();

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!isValidDateString(date)) {
      return NextResponse.json({ error: 'Date must be a valid YYYY-MM-DD date' }, { status: 400 });
    }
    if (typeof time !== 'string' || !time.trim()) {
      return NextResponse.json({ error: 'Time is required' }, { status: 400 });
    }
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json({ error: 'Description must be text' }, { status: 400 });
    }

    const db = await getDatabase();
    const eventsCollection = db.collection('events');
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Moving an open session into another year would leave two cycles open at once
    if (event.isActive && cycleOf(date) !== cycleOf(event.date)) {
      return NextResponse.json(
        { error: 'An active session cannot be moved to a different year. Deactivate its cycle first.' },
        { status: 400 }
      );
    }

    const eventLocationIds = new Set(((event.locationIds || []) as ObjectId[]).map(locationId => locationId.toString()));
    const capacityUpdates: { _id: string; maxCapacity: number }[] = Array.isArray(locations) ? locations : [];
    for (const location of capacityUpdates) {
      if (!eventLocationIds.has(String(location?._id))) {
        return NextResponse.json({ error: 'Location does not belong to this session' }, { status: 400 });
      }
      if (!Number.isInteger(location.maxCapacity) || location.maxCapacity < 1 || location.maxCapacity > 1000) {
        return NextResponse.json({ error: 'Capacity must be a whole number between 1 and 1000' }, { status: 400 });
      }
    }

    if (capacityUpdates.length > 0) {
      const counts = await db.collection('registrations').aggregate<{ _id: string; count: number }>([
        { $match: { crawlLocation: { $in: capacityUpdates.map(location => String(location._id)) } } },
        { $group: { _id: '$crawlLocation', count: { $sum: 1 } } },
      ]).toArray();
      const tooSmall = counts.find(row =>
        capacityUpdates.some(location => String(location._id) === row._id && location.maxCapacity < row.count)
      );
      if (tooSmall) {
        return NextResponse.json(
          { error: `Capacity can't be lower than the ${tooSmall.count} people already registered` },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    await eventsCollection.updateOne(
      { _id: event._id },
      {
        $set: {
          title: title.trim(),
          date,
          time: time.trim(),
          ...(description !== undefined ? { description: description.trim() } : {}),
          updatedAt: now,
          updatedBy: auth.email,
        },
      }
    );

    if (capacityUpdates.length > 0) {
      await db.collection('eventLocations').bulkWrite(capacityUpdates.map(location => ({
        updateOne: {
          filter: { _id: new ObjectId(location._id) },
          update: { $set: { maxCapacity: location.maxCapacity, updatedAt: now } },
        },
      })));
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating crawl session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
