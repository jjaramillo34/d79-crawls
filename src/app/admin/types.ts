export interface Registration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school: string;
  registeredAt: string;
}

export interface LocationStat {
  _id: string;
  name: string;
  address: string;
  eventDate: string;
  registrationCount: number;
  maxCapacity: number;
  availableSpots: number;
  registrations: Registration[];
}

export type CrawlDay = 'tuesday' | 'thursday';

export const BRAND = '#ECC67F';
// Darker shade of the brand gold for text, which needs more contrast on white
export const BRAND_TEXT = '#9A6B12';

export function isOnDay(location: LocationStat, day: CrawlDay) {
  const label = day === 'tuesday' ? 'Tuesday' : 'Thursday';
  return location.eventDate.includes(label) || location.eventDate === day;
}

export function locationDay(location: LocationStat): CrawlDay {
  return isOnDay(location, 'tuesday') ? 'tuesday' : 'thursday';
}
