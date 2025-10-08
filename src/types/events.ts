export interface EventLocation {
  _id?: string;
  name: string;
  address: string;
  borough: string;
  capacity: number;
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Event {
  _id?: string;
  title: string;
  date: string; // ISO date string
  time: string; // e.g., "10:00 AM - 12:00 PM"
  eventType: 'virtual' | 'site-crawl';
  locations: EventLocation[];
  description: string;
  targetAudience: 'nycps-staff' | 'community' | 'both';
  maxCapacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventRegistration {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  eventId: string;
  locationId: string;
  registrationDate: Date;
  status: 'confirmed' | 'waitlist' | 'cancelled';
}
