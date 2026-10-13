import { NextRequest, NextResponse } from 'next/server';
import { Db, Document, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { isValidDateString } from '@/lib/crawls';

// Per-cycle state that must never be carried over into a new cycle
const RESET_FIELDS = ['_id', 'cloneKey', 'registrationCount', 'registrations', 'attendees', 'registeredCount'];

function stripFields(doc: Document) {
  const copy = { ...doc };
  for (const field of RESET_FIELDS) delete copy[field];
  return copy;
}

const eventCloneKey = (sourceEventId: ObjectId, targetDate: string) =>
  `${sourceEventId.toString()}@${targetDate}`;
const locationCloneKey = (sourceLocationId: ObjectId, sourceEventId: ObjectId, targetDate: string) =>
  `${sourceLocationId.toString()}@${sourceEventId.toString()}@${targetDate}`;

let indexesReady: Promise<unknown> | null = null;
function ensureCloneIndexes(db: Db) {
  if (!indexesReady) {
    const options = { unique: true, partialFilterExpression: { cloneKey: { $exists: true } } };
    indexesReady = Promise.all([
      db.collection('events').createIndex({ cloneKey: 1 }, options),
      db.collection('eventLocations').createIndex({ cloneKey: 1 }, options),
    ]).catch(err => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { sourceYear, targetDate, dryRun = false } = await request.json();

    if (!Number.isInteger(sourceYear) || sourceYear < 2000 || sourceYear > 2100) {
      return NextResponse.json({ error: 'sourceYear must be a 4-digit year' }, { status: 400 });
    }
    if (!isValidDateString(targetDate)) {
      return NextResponse.json({ error: 'targetDate must be a valid YYYY-MM-DD date' }, { status: 400 });
    }

    const db = await getDatabase();
    await ensureCloneIndexes(db);
    const eventsCollection = db.collection('events');
    const locationsCollection = db.collection('eventLocations');

    const sourceEvents = await eventsCollection.find({
      isActive: true,
      date: { $regex: `^${sourceYear}-`, $ne: targetDate },
    }).sort({ date: 1, title: 1 }).toArray();

    if (sourceEvents.length === 0) {
      return NextResponse.json(
        { error: `No active crawl sessions found for ${sourceYear}` },
        { status: 404 }
      );
    }

    const sourceLocationIds = sourceEvents.flatMap(event => (event.locationIds || []) as ObjectId[]);
    const sourceLocations = await locationsCollection.find({ _id: { $in: sourceLocationIds } }).toArray();
    const sourceLocationMap = new Map(sourceLocations.map(location => [location._id.toString(), location]));

    const existingClones = await eventsCollection.find(
      { cloneKey: { $in: sourceEvents.map(event => eventCloneKey(event._id, targetDate)) } },
      { projection: { cloneKey: 1 } }
    ).toArray();
    const existingKeys = new Set(existingClones.map(event => event.cloneKey));

    const plan = sourceEvents.map(event => {
      const locations = ((event.locationIds || []) as ObjectId[])
        .map(id => sourceLocationMap.get(id.toString()))
        .filter(location => location !== undefined);
      return {
        sourceEventId: event._id.toString(),
        title: event.title,
        sourceDate: event.date,
        time: event.time,
        alreadyCloned: existingKeys.has(eventCloneKey(event._id, targetDate)),
        locations: locations.map(location => ({
          name: location.name,
          maxCapacity: location.maxCapacity || 20,
        })),
        totalCapacity: locations.reduce((sum, location) => sum + (location.maxCapacity || 20), 0),
      };
    });

    const pending = plan.filter(item => !item.alreadyCloned);
    const summary = {
      sourceYear,
      targetDate,
      sessionsToCreate: pending.length,
      sessionsAlreadyCloned: plan.length - pending.length,
      slotsToCreate: pending.reduce((sum, item) => sum + item.locations.length, 0),
      capacityToCreate: pending.reduce((sum, item) => sum + item.totalCapacity, 0),
    };

    if (dryRun) {
      return NextResponse.json({ dryRun: true, summary, plan });
    }

    const now = new Date();
    let eventsCreated = 0;
    let locationsCreated = 0;

    for (const sourceEvent of sourceEvents) {
      // Locations are re-created rather than shared: registrations reference location ids,
      // so fresh locations start the new cycle with zero registrations.
      const newLocationIds: ObjectId[] = [];

      for (const sourceLocationId of (sourceEvent.locationIds || []) as ObjectId[]) {
        const sourceLocation = sourceLocationMap.get(sourceLocationId.toString());
        if (!sourceLocation) continue;

        const result = await locationsCollection.findOneAndUpdate(
          { cloneKey: locationCloneKey(sourceLocation._id, sourceEvent._id, targetDate) },
          {
            $setOnInsert: {
              ...stripFields(sourceLocation),
              clonedFromLocationId: sourceLocation._id,
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true, returnDocument: 'after', includeResultMetadata: true }
        );
        if (!result.value) throw new Error('Failed to upsert cloned location');
        if (result.lastErrorObject?.upserted) locationsCreated++;
        newLocationIds.push(result.value._id);
      }

      const eventResult = await eventsCollection.updateOne(
        { cloneKey: eventCloneKey(sourceEvent._id, targetDate) },
        {
          $setOnInsert: {
            ...stripFields(sourceEvent),
            date: targetDate,
            locationIds: newLocationIds,
            // Created inactive so the current public registration flow is unaffected
            isActive: false,
            clonedFromEventId: sourceEvent._id,
            clonedBy: auth.email,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
      if (eventResult.upsertedCount > 0) eventsCreated++;
    }

    return NextResponse.json({
      success: true,
      summary,
      created: { sessions: eventsCreated, locations: locationsCreated },
      message: eventsCreated > 0
        ? `Created ${eventsCreated} session(s) with ${locationsCreated} location slot(s) on ${targetDate}`
        : `All ${sourceYear} sessions were already cloned to ${targetDate} — nothing new created`,
    });

  } catch (error) {
    console.error('Error cloning crawl season:', error);
    return NextResponse.json({ error: 'Failed to clone crawl season' }, { status: 500 });
  }
}
