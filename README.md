# D79 Crawls Registration System

A Next.js application for managing registrations for District 79 Fall Crawls events.

## Features

- **Landing Page**: Displays event information and real-time availability
- **Registration System**: Secure registration with email validation
- **MongoDB Integration**: Stores registrations and tracks availability
- **Event Locations**: Comprehensive database of event locations with details
- **Email Notifications**: Automatic confirmation emails to registrants and admin notifications
- **Real-time Updates**: Shows current availability for each crawl date
- **Email Validation**: Only accepts @schools.nyc.gov email addresses
- **Admin Panel**: View all events and locations
- **Responsive Design**: Works on desktop and mobile devices

## Event Details

### Tuesday, October 28
- **Time**: 10 AM - 12 PM
- **Locations**: Manhattan, Queens, or The Bronx
- **Capacity**: 20 people

### Thursday, October 30
- **Time**: 10 AM - 12 PM
- **Locations**: Staten Island or Brooklyn
- **Capacity**: 20 people

## Technology Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **MongoDB**: Database for storing registrations
- **Lucide React**: Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd d79-crawls
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your configuration:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/d79-crawls

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@schools.nyc.gov
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=jjaramillo7@schools.nyc.gov
```

**📧 Email Setup**: See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed instructions on configuring email notifications.

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### MongoDB Setup

The application expects a MongoDB database named `d79-crawls` with the following collections:

#### Collections

1. **registrations** - Legacy registration data
2. **events** - Event information and details
3. **eventLocations** - Specific location details for events
4. **eventRegistrations** - New registration system (future use)

#### Database Schema

**Registration Schema:**
```typescript
{
  _id: ObjectId,
  email: string,           // Must end with @schools.nyc.gov
  firstName: string,
  lastName: string,
  school: string,
  crawlDate: 'tuesday' | 'thursday',
  crawlLocation: string,
  createdAt: Date
}
```

**Event Schema:**
```typescript
{
  _id: ObjectId,
  title: string,
  date: string,            // ISO date string
  time: string,            // e.g., "10:00 AM - 12:00 PM"
  eventType: 'virtual' | 'site-crawl',
  locationIds: ObjectId[], // References to eventLocations
  description: string,
  targetAudience: 'nycps-staff' | 'community' | 'both',
  maxCapacity: number,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Event Location Schema:**
```typescript
{
  _id: ObjectId,
  name: string,
  address: string,
  borough: string,
  capacity: number,
  description: string,
  coordinates: {
    lat: number,
    lng: number
  }
}
```

### Seeding the Database

To populate the database with event locations and details, run:

```bash
node scripts/seed-database.js
```

This will create:
- 5 event locations (Manhattan, Queens, Bronx, Staten Island, Brooklyn)
- 2 events (Tuesday and Thursday crawls)
- Proper relationships between events and locations

## API Endpoints

### GET /api/availability
Returns current availability for both crawl dates.

**Response:**
```json
{
  "tuesday": {
    "total": 20,
    "registered": 5,
    "available": 15
  },
  "thursday": {
    "total": 20,
    "registered": 8,
    "available": 12
  }
}
```

### GET /api/events
Returns all active events with their locations.

**Response:**
```json
{
  "events": [
    {
      "_id": "ObjectId",
      "title": "District 79 Fall Crawls - Tuesday",
      "date": "2024-10-28",
      "time": "10:00 AM - 12:00 PM",
      "eventType": "site-crawl",
      "description": "Join us for an information session...",
      "targetAudience": "nycps-staff",
      "maxCapacity": 20,
      "locations": [
        {
          "_id": "ObjectId",
          "name": "Manhattan Referral Center",
          "address": "123 Education Way, Manhattan, NY 10001",
          "borough": "Manhattan",
          "capacity": 20,
          "description": "Main referral center for Manhattan students",
          "coordinates": { "lat": 40.7589, "lng": -73.9851 }
        }
      ]
    }
  ],
  "locations": [...]
}
```

### POST /api/register
Creates a new registration.

**Request Body:**
```json
{
  "email": "user@schools.nyc.gov",
  "firstName": "John",
  "lastName": "Doe",
  "school": "PS 123",
  "crawlDate": "tuesday",
  "crawlLocation": "manhattan"
}
```

**Response:**
```json
{
  "success": true,
  "id": "ObjectId",
  "message": "Registration successful!"
}
```

### POST /api/seed-events
Seeds the database with event locations and details. (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Events and locations seeded successfully",
  "locationsCount": 5,
  "eventsCount": 2
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your MongoDB connection string as an environment variable
4. Deploy!

### Environment Variables for Production

- `MONGODB_URI`: Your MongoDB connection string

## Security Features

- Email domain validation (@schools.nyc.gov only)
- Duplicate registration prevention
- Capacity limits (20 people per date)
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for internal use by NYCPS employees only.