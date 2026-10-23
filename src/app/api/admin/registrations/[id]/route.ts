import { NextRequest, NextResponse } from 'next/server';
import { Db, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { cycleOf } from '@/lib/crawls';
import { normalizeEmailAddress, toProperCaseName } from '@/lib/names';

type RouteContext = { params: Promise<{ id: string }> };

async function findLocationWithEvent(db: Db, locationId: string) {
  if (!ObjectId.isValid(locationId)) return null;
  const _id = new ObjectId(locationId);
  const [location, event] = await Promise.all([
    db.collection('eventLocations').findOne({ _id }),
    db.collection('events').findOne({ locationIds: _id }),
  ]);
  return location && event ? { location, event } : null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Edit an attendee's details, or move them to another location in the same cycle
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid registration id' }, { status: 400 });
    }

    const body = await request.json();
    const firstName = typeof body.firstName === 'string' ? toProperCaseName(body.firstName) : '';
    const lastName = typeof body.lastName === 'string' ? toProperCaseName(body.lastName) : '';
    const school = typeof body.school === 'string' ? body.school.trim() : '';
    const email = typeof body.email === 'string' ? normalizeEmailAddress(body.email) : '';
    const crawlLocation = typeof body.crawlLocation === 'string' ? body.crawlLocation : '';

    if (!firstName || !lastName || !school || !email || !crawlLocation) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (!email.toLowerCase().endsWith('@schools.nyc.gov')) {
      return NextResponse.json({ error: 'Only @schools.nyc.gov email addresses are allowed' }, { status: 400 });
    }

    const db = await getDatabase();
    const registrations = db.collection('registrations');
    const registration = await registrations.findOne({ _id: new ObjectId(id) });
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const current = await findLocationWithEvent(db, registration.crawlLocation);
    const target = await findLocationWithEvent(db, crawlLocation);
    if (!target) {
      return NextResponse.json({ error: 'Location not found' }, { status: 400 });
    }
    const cycle = cycleOf(target.event.date);
    if (current && cycleOf(current.event.date) !== cycle) {
      return NextResponse.json({ error: 'Registrations can only be moved within the same cycle' }, { status: 400 });
    }

    // Same rules as public sign-up: one registration per person per cycle, and no overbooking
    const cycleEvents = await db.collection('events').find({ date: { $regex: `^${cycle}-` } }).toArray();
    const cycleLocationIds = cycleEvents.flatMap(event => ((event.locationIds || []) as ObjectId[]).map(locationId => locationId.toString()));
    const duplicate = await registrations.findOne({
      _id: { $ne: registration._id },
      email: new RegExp(`^${escapeRegex(email)}$`, 'i'),
      crawlLocation: { $in: cycleLocationIds },
    });
    if (duplicate) {
      return NextResponse.json({ error: `${email} is already registered for another ${cycle} session` }, { status: 400 });
    }

    if (crawlLocation !== registration.crawlLocation) {
      const maxCapacity = target.location.maxCapacity || 20;
      const taken = await registrations.countDocuments({ crawlLocation });
      if (taken >= maxCapacity) {
        return NextResponse.json({ error: `${target.location.name} is full` }, { status: 400 });
      }
    }

    await registrations.updateOne(
      { _id: registration._id },
      {
        $set: {
          firstName,
          lastName,
          email,
          school,
          crawlLocation,
          crawlLocationName: target.location.name,
          crawlLocationAddress: target.location.address || '',
          crawlDate: target.event.date,
          eventId: target.event._id.toString(),
          updatedAt: new Date(),
          updatedBy: auth.email,
        },
      }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid registration id' }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('registrations').findOneAndDelete({ _id: new ObjectId(id) });
    if (!result) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    console.log(`Registration ${id} (${result.email}) deleted by ${auth.email}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
  }
}
