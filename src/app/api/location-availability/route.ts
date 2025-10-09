import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Get all events with their locations
    const events = await db.collection('events').find({ isActive: true }).toArray();
    
    // Get all registrations
    const registrations = await db.collection('registrations').find({}).toArray();
    
    // Create a map of location ID to event date
    const locationToEventDate = new Map();
    events.forEach(event => {
      event.locationIds.forEach((locationId: ObjectId) => {
        const eventDate = event.date === '2024-10-28' ? 'tuesday' : 'thursday';
        // Convert ObjectId to string for comparison
        const locationIdStr = locationId.toString();
        locationToEventDate.set(locationIdStr, eventDate);
      });
    });
    
    // Get all event locations
    const locations = await db.collection('eventLocations').find({}).toArray();
    
    // Calculate availability for each location
    const locationAvailability = locations.map(location => {
      const registeredCount = registrations.filter(reg => 
        reg.crawlLocation === location._id.toString()
      ).length;
      
      const maxCapacity = location.maxCapacity || 20;
      const availableSpots = Math.max(0, maxCapacity - registeredCount);
      const isAvailable = availableSpots > 0;
      const eventDate = locationToEventDate.get(location._id.toString()) || 'unknown';
      
      return {
        _id: location._id,
        name: location.name,
        address: location.address,
        eventDate,
        availableSpots,
        totalSpots: maxCapacity,
        isAvailable
      };
    });
    
    // Sort by event date, then by name
    locationAvailability.sort((a, b) => {
      if (a.eventDate !== b.eventDate) {
        return a.eventDate === 'tuesday' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json({ locations: locationAvailability });
  } catch (error) {
    console.error('Error fetching location availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location availability' },
      { status: 500 }
    );
  }
}
