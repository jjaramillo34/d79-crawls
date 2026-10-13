import { Db, Document, ObjectId } from 'mongodb';
import { sendEmail, getReminderEmail } from '@/lib/email';
import { formatEventDate } from '@/lib/crawls';

// Exchange Online allows a mailbox about 30 messages per minute, so when mail goes out through
// Power Automate we send one at a time, ~2 seconds apart. SendGrid/SMTP can go faster.
function sendPacing() {
  return process.env.EMAIL_SERVICE === 'power-automate'
    ? { concurrency: 1, delayMs: 2100 }
    : { concurrency: 5, delayMs: 0 };
}

export interface ReminderResult {
  eventId: string;
  title: string;
  date: string;
  totalRegistrations: number;
  emailsSent: number;
  skippedAlreadyReminded: number;
  /** Attendees still waiting for a reminder because this call hit its `limit` */
  remaining: number;
  errors: { email: string; name: string; error: string }[];
}

/**
 * Sends the reminder email to a session's attendees and stamps `reminderSentAt` on each one sent.
 * With `skipAlreadyReminded`, attendees who already got a reminder are left out, so scheduled runs
 * can safely repeat (and don't re-email people an admin already reminded manually).
 * `limit` caps how many emails this call sends; the rest are reported as `remaining`.
 */
export async function sendRemindersForEvent(
  db: Db,
  event: Document,
  { skipAlreadyReminded = false, limit = Infinity }: { skipAlreadyReminded?: boolean; limit?: number } = {}
): Promise<ReminderResult> {
  const dateLabel = formatEventDate(event.date);
  const locationIds = (event.locationIds || []) as ObjectId[];

  const [registrations, locations] = await Promise.all([
    db.collection('registrations').find({ crawlLocation: { $in: locationIds.map(id => id.toString()) } }).toArray(),
    db.collection('eventLocations').find({ _id: { $in: locationIds } }).toArray(),
  ]);
  const locationMap = new Map(locations.map(location => [location._id.toString(), location]));

  const eligible = skipAlreadyReminded ? registrations.filter(reg => !reg.reminderSentAt) : registrations;
  const pending = eligible.slice(0, Math.max(0, limit));
  const result: ReminderResult = {
    eventId: event._id.toString(),
    title: event.title,
    date: event.date,
    totalRegistrations: registrations.length,
    emailsSent: 0,
    skippedAlreadyReminded: registrations.length - eligible.length,
    remaining: eligible.length - pending.length,
    errors: [],
  };

  const sendOne = async (registration: Document) => {
    const name = `${registration.firstName} ${registration.lastName}`;
    const location = locationMap.get(registration.crawlLocation);
    if (!location) {
      result.errors.push({ email: registration.email, name, error: 'Location not found' });
      return;
    }

    const emailResult = await sendEmail({
      to: registration.email,
      subject: `🔔 Reminder: D79 Fall Crawl on ${dateLabel}`,
      html: getReminderEmail({
        firstName: registration.firstName,
        lastName: registration.lastName,
        crawlDate: dateLabel,
        crawlLocationName: location.name,
        crawlLocationAddress: location.address,
        time: event.time,
      }),
    });

    if (emailResult.success) {
      result.emailsSent++;
      await db.collection('registrations').updateOne({ _id: registration._id }, { $set: { reminderSentAt: new Date() } });
    } else {
      const error = 'error' in emailResult ? emailResult.error : undefined;
      result.errors.push({ email: registration.email, name, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const { concurrency, delayMs } = sendPacing();
  for (let i = 0; i < pending.length; i += concurrency) {
    if (i > 0 && delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
    await Promise.all(pending.slice(i, i + concurrency).map(sendOne));
  }

  return result;
}
