import { Db } from 'mongodb';
import { Registration } from '@/types/registration';
import { sendEmail, getRegistrationConfirmationEmail, getAdminNotificationEmail } from '@/lib/email';
import { ActiveCrawlEvent, CrawlLocationAvailability, getActiveCrawlEvents } from '@/lib/crawls';

export const EMAIL_DOMAIN = '@schools.nyc.gov';
const DEFAULT_DESCRIPTION = 'Join us for an information session and a site visit to a Referral Center and D79 site';

export interface RegistrationInput {
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  crawlLocation: string;
}

type CreateResult =
  | { ok: true; id: string; event: ActiveCrawlEvent; location: CrawlLocationAvailability }
  | { ok: false; status: number; error: string };

/** Case-insensitive exact match for an email address. */
export function emailPattern(email: string) {
  return new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

/** Trims and checks the person's details; returns an error message or null. */
export function validatePersonFields(input: { email?: unknown; firstName?: unknown; lastName?: unknown; school?: unknown }) {
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (!email.toLowerCase().endsWith(EMAIL_DOMAIN) || email.length <= EMAIL_DOMAIN.length) {
    return `Only ${EMAIL_DOMAIN} email addresses are allowed`;
  }
  for (const field of ['firstName', 'lastName', 'school'] as const) {
    if (typeof input[field] !== 'string' || !(input[field] as string).trim()) return 'All fields are required';
  }
  return null;
}

/** The person's registration in the cycle that is currently open, if any. */
export async function findActiveRegistration(db: Db, email: string, activeEvents?: ActiveCrawlEvent[]) {
  const events = activeEvents ?? await getActiveCrawlEvents(db);
  const activeLocationIds = events.flatMap(event => event.locations.map(location => location._id));
  return db.collection('registrations').findOne({
    email: emailPattern(email),
    crawlLocation: { $in: activeLocationIds },
  });
}

/**
 * Registers someone for a location in an open session, with the same rules everywhere:
 * the location must be open, one registration per person per cycle, and no overbooking.
 */
export async function createRegistration(db: Db, input: RegistrationInput): Promise<CreateResult> {
  const email = input.email.trim();
  const activeEvents = await getActiveCrawlEvents(db);
  const event = activeEvents.find(e => e.locations.some(location => location._id === input.crawlLocation));
  const location = event?.locations.find(l => l._id === input.crawlLocation);
  if (!event || !location) {
    return { ok: false, status: 400, error: 'This location is not open for registration' };
  }

  if (await findActiveRegistration(db, email, activeEvents)) {
    return { ok: false, status: 400, error: 'Email is already registered' };
  }

  const taken = await db.collection('registrations').countDocuments({ crawlLocation: input.crawlLocation });
  if (taken >= location.totalSpots) {
    return { ok: false, status: 400, error: 'No spots available for this location' };
  }

  const registration: Omit<Registration, '_id'> = {
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    school: input.school.trim(),
    crawlDate: event.date,
    eventId: event._id,
    crawlLocation: input.crawlLocation,
    crawlLocationAddress: location.address || '',
    crawlLocationName: location.name || '',
    createdAt: new Date(),
  };
  const result = await db.collection('registrations').insertOne(registration);

  return { ok: true, id: result.insertedId.toString(), event, location };
}

/** Confirmation email to the attendee, plus the optional admin notification. */
export async function sendRegistrationEmails(
  input: RegistrationInput,
  event: ActiveCrawlEvent,
  location: CrawlLocationAvailability,
  availableSpots: number
) {
  const description = event.description || DEFAULT_DESCRIPTION;

  await sendEmail({
    to: input.email.trim(),
    subject: 'Registration Confirmed - District 79 Fall Crawls',
    html: getRegistrationConfirmationEmail({
      firstName: input.firstName,
      lastName: input.lastName,
      crawlDate: event.dateLabel,
      description,
      crawlLocationName: location.name,
      crawlLocationAddress: location.address || '',
      time: event.time,
    }),
  });

  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Registration - ${input.firstName} ${input.lastName} - D79 Fall Crawls`,
      html: getAdminNotificationEmail({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.trim(),
        school: input.school,
        crawlDate: event.dateLabel,
        crawlLocation: location.name,
        crawlLocationName: location.name,
        description,
        crawlLocationAddress: location.address || '',
        availableSpots,
      }),
    });
  }
}
