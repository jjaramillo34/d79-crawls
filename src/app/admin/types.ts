export interface Registration {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school: string;
  registeredAt: string;
  reminderSentAt?: string | null;
}

export interface LocationStat {
  _id: string;
  name: string;
  address: string;
  eventId: string;
  eventTitle: string;
  eventDate: string; // display label, e.g. "Friday, Nov 6"
  eventTime: string;
  registrationCount: number;
  maxCapacity: number;
  availableSpots: number;
  registrations: Registration[];
}

export interface DashboardEvent {
  _id: string;
  title: string;
  date: string;
  dateLabel: string;
  time: string;
  isActive: boolean;
}

export const BRAND = '#ECC67F';
// Darker shade of the brand gold for text, which needs more contrast on white
export const BRAND_TEXT = '#9A6B12';

export function locationsForEvent(locationStats: LocationStat[], eventId: string) {
  return locationStats.filter(location => location.eventId === eventId);
}
