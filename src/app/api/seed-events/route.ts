import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Event, EventLocation } from '@/types/events';

export async function POST() {
  try {
    const db = await getDatabase();
    
    // Clear existing events and locations
    await db.collection('events').deleteMany({});
    await db.collection('eventLocations').deleteMany({});
    
    // Define event locations
    const locations: Omit<EventLocation, '_id'>[] = [
      // Tuesday locations (Manhattan, Queens, Bronx)
      {
        name: "Manhattan Referral Center",
        address: "123 Education Way, Manhattan, NY 10001",
        borough: "Manhattan",
        capacity: 20,
        description: "Main referral center for Manhattan students",
        coordinates: { lat: 40.7589, lng: -73.9851 }
      },
      {
        name: "Queens Alternative School",
        address: "456 Learning Lane, Queens, NY 11101",
        borough: "Queens",
        capacity: 20,
        description: "Alternative education programs in Queens",
        coordinates: { lat: 40.7282, lng: -73.7949 }
      },
      {
        name: "Bronx D79 Center",
        address: "789 Student Street, Bronx, NY 10451",
        borough: "The Bronx",
        capacity: 20,
        description: "District 79 programs in the Bronx",
        coordinates: { lat: 40.8448, lng: -73.8648 }
      },
      // Thursday locations (Staten Island, Brooklyn)
      {
        name: "Staten Island Learning Center",
        address: "321 Academy Avenue, Staten Island, NY 10301",
        borough: "Staten Island",
        capacity: 20,
        description: "Educational programs on Staten Island",
        coordinates: { lat: 40.6415, lng: -74.0776 }
      },
      {
        name: "Brooklyn Alternative Programs",
        address: "654 School Street, Brooklyn, NY 11201",
        borough: "Brooklyn",
        capacity: 20,
        description: "Alternative education in Brooklyn",
        coordinates: { lat: 40.6782, lng: -73.9442 }
      }
    ];
    
    // Insert locations
    const locationResults = await db.collection('eventLocations').insertMany(locations);
    const locationIds = Object.values(locationResults.insertedIds);
    
    // Define events
    const events: Omit<Event, '_id'>[] = [
      {
        title: "District 79 Fall Crawls - Tuesday",
        date: "2024-10-28",
        time: "10:00 AM - 12:00 PM",
        eventType: "site-crawl",
        locations: locationIds.slice(0, 3).map((id, index) => ({
          _id: id.toString(),
          ...locations[index]
        })),
        description: "Join us for an information session and a site visit to a Referral Center and D79 site in Manhattan, Queens, or The Bronx",
        targetAudience: "nycps-staff",
        maxCapacity: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "District 79 Fall Crawls - Thursday",
        date: "2024-10-30",
        time: "10:00 AM - 12:00 PM",
        eventType: "site-crawl",
        locations: locationIds.slice(3, 5).map((id, index) => ({
          _id: id.toString(),
          ...locations[index + 3]
        })),
        description: "Join us for an information session and a site visit to a Referral Center and D79 site in Staten Island or Brooklyn",
        targetAudience: "nycps-staff",
        maxCapacity: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert events
    await db.collection('events').insertMany(events);
    
    return NextResponse.json({
      success: true,
      message: 'Events and locations seeded successfully',
      locationsCount: locations.length,
      eventsCount: events.length
    });
    
  } catch (error) {
    console.error('Error seeding events:', error);
    return NextResponse.json(
      { error: 'Failed to seed events' },
      { status: 500 }
    );
  }
}
