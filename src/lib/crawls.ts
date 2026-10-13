import { Db, ObjectId } from 'mongodb';

// A "cycle" is the set of crawl sessions in one calendar year (e.g. 2026).
// Only one cycle is active (open for registration) at a time.
export function cycleOf(date: string): number {
  return Number(String(date).slice(0, 4));
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Today's date (YYYY-MM-DD) in New York, where the crawls happen. */
export function todayInNewYork(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Formats a YYYY-MM-DD date without timezone drift. */
export function formatEventDate(date: string, style: 'long' | 'short' = 'long'): string {
  if (!isValidDateString(date)) return String(date);
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    ...(style === 'long' ? { year: 'numeric' } : {}),
  });
}

export interface CrawlLocationAvailability {
  _id: string;
  name: string;
  address: string;
  borough?: string;
  description?: string;
  totalSpots: number;
  registered: number;
  availableSpots: number;
  isAvailable: boolean;
}

export interface ActiveCrawlEvent {
  _id: string;
  title: string;
  date: string;
  dateLabel: string;
  time: string;
  description?: string;
  locations: CrawlLocationAvailability[];
}

/** Active sessions (sorted by date) with their locations and live seat counts. */
export async function getActiveCrawlEvents(db: Db): Promise<ActiveCrawlEvent[]> {
  const events = await db.collection('events').find({ isActive: true }).sort({ date: 1, title: 1 }).toArray();
  const locationIds = events.flatMap(event => (event.locationIds || []) as ObjectId[]);
  if (locationIds.length === 0) return [];

  const [locations, counts] = await Promise.all([
    db.collection('eventLocations').find({ _id: { $in: locationIds } }).toArray(),
    db.collection('registrations').aggregate<{ _id: string; count: number }>([
      { $match: { crawlLocation: { $in: locationIds.map(id => id.toString()) } } },
      { $group: { _id: '$crawlLocation', count: { $sum: 1 } } },
    ]).toArray(),
  ]);
  const locationMap = new Map(locations.map(location => [location._id.toString(), location]));
  const countMap = new Map(counts.map(row => [String(row._id), row.count]));

  return events.map(event => ({
    _id: event._id.toString(),
    title: event.title,
    date: event.date,
    dateLabel: formatEventDate(event.date),
    time: event.time,
    description: event.description,
    locations: ((event.locationIds || []) as ObjectId[])
      .map(id => locationMap.get(id.toString()))
      .filter(location => location !== undefined)
      .map(location => {
        const totalSpots = location.maxCapacity || 20;
        const registered = countMap.get(location._id.toString()) || 0;
        const availableSpots = Math.max(0, totalSpots - registered);
        return {
          _id: location._id.toString(),
          name: location.name,
          address: location.address,
          borough: location.borough,
          description: location.description,
          totalSpots,
          registered,
          availableSpots,
          isAvailable: availableSpots > 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
