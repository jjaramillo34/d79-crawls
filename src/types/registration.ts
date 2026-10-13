export interface Registration {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  // Event date (YYYY-MM-DD); registrations before multi-cycle support store 'tuesday' | 'thursday'
  crawlDate: string;
  eventId?: string;
  crawlLocation: string;
  crawlLocationAddress?: string;
  crawlLocationName?: string;
  createdAt: Date;
}

export interface CrawlAvailability {
  tuesday: {
    total: number;
    registered: number;
    available: number;
  };
  thursday: {
    total: number;
    registered: number;
    available: number;
  };
}
