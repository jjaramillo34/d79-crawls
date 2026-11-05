import { createHash, randomBytes } from 'crypto';
import { Db, Document, ObjectId } from 'mongodb';
import { cycleOf, formatEventDate } from '@/lib/crawls';
import { sendEmail, getCancellationConfirmedEmail, getCancellationLinkEmail } from '@/lib/email';
import { emailPattern } from '@/lib/registrations';

const LINK_TTL_MS = 48 * 60 * 60 * 1000;
// Don't send another cancellation link for the same registration within this window
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

let indexesReady: Promise<unknown> | null = null;
function tokens(db: Db) {
  const collection = db.collection('cancelTokens');
  if (!indexesReady) {
    indexesReady = Promise.all([
      collection.createIndex({ tokenHash: 1 }, { unique: true }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch(err => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady.then(() => collection);
}

/** Session + location details for a registration, for emails and the confirm page. */
async function registrationDetails(db: Db, registration: Document) {
  const locationId = ObjectId.isValid(registration.crawlLocation) ? new ObjectId(registration.crawlLocation) : null;
  const [location, event] = locationId
    ? await Promise.all([
        db.collection('eventLocations').findOne({ _id: locationId }),
        db.collection('events').findOne({ locationIds: locationId }),
      ])
    : [null, null];
  return {
    firstName: registration.firstName as string,
    lastName: registration.lastName as string,
    locationName: (location?.name ?? registration.crawlLocationName ?? 'your crawl location') as string,
    dateLabel: event ? formatEventDate(event.date) : String(registration.crawlDate ?? ''),
    time: (event?.time ?? '') as string,
    eventDate: (event?.date ?? null) as string | null,
  };
}

/**
 * Emails a one-time cancellation link to the person registered with this email in the open cycle.
 * Always resolves quietly so the public form can't be used to check who is registered.
 */
export async function requestCancellationLink(db: Db, email: string, origin: string) {
  const active = await db.collection('events').find({ isActive: true }).toArray();
  const activeLocationIds = active.flatMap(event => ((event.locationIds || []) as ObjectId[]).map(id => id.toString()));
  const registration = await db.collection('registrations').findOne({
    email: emailPattern(email),
    crawlLocation: { $in: activeLocationIds },
  });
  if (!registration) return;

  const collection = await tokens(db);
  const recent = await collection.findOne({
    registrationId: registration._id,
    createdAt: { $gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
  });
  if (recent) return;

  const token = randomBytes(32).toString('base64url');
  await collection.insertOne({
    tokenHash: hashToken(token),
    registrationId: registration._id,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + LINK_TTL_MS),
  });

  const details = await registrationDetails(db, registration);
  await sendEmail({
    to: registration.email,
    subject: 'Confirm your cancellation - District 79 Fall Crawls',
    html: getCancellationLinkEmail({ ...details, link: `${origin}/cancel?token=${token}` }),
  });
}

/** Looks up the registration a cancellation link points to (without using it). */
export async function findRegistrationByToken(db: Db, token: string) {
  const collection = await tokens(db);
  const record = await collection.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() }, usedAt: { $exists: false } });
  if (!record) return null;
  const registration = await db.collection('registrations').findOne({ _id: record.registrationId });
  return registration ? { record, registration } : null;
}

/**
 * Cancels a registration: removes it (freeing the seat), keeps a record in `cancellations`,
 * and optionally emails the person a confirmation.
 */
export async function cancelRegistration(
  db: Db,
  registrationId: ObjectId,
  { cancelledBy, notify }: { cancelledBy: string; notify: boolean }
) {
  const registration = await db.collection('registrations').findOneAndDelete({ _id: registrationId });
  if (!registration) return null;

  const details = await registrationDetails(db, registration);
  const { _id, ...snapshot } = registration;
  await db.collection('cancellations').insertOne({
    ...snapshot,
    registrationId: _id,
    locationName: details.locationName,
    cycle: details.eventDate ? cycleOf(details.eventDate) : null,
    cancelledAt: new Date(),
    cancelledBy,
  });

  if (notify) {
    await sendEmail({
      to: registration.email,
      subject: 'Registration cancelled - District 79 Fall Crawls',
      html: getCancellationConfirmedEmail(details),
    });
  }
  return { ...details, email: registration.email as string };
}

/** Uses a cancellation link: cancels the registration and marks the link as used. */
export async function cancelWithToken(db: Db, token: string) {
  const found = await findRegistrationByToken(db, token);
  if (!found) return null;
  const collection = await tokens(db);
  // Claim the link first so a double click can't cancel twice
  const claimed = await collection.updateOne(
    { _id: found.record._id, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } }
  );
  if (claimed.modifiedCount === 0) return null;
  return cancelRegistration(db, found.registration._id, { cancelledBy: 'self', notify: true });
}

export { registrationDetails };
