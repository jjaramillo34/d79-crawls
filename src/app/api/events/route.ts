import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Get all active events
    const events = await db.collection('events').find({ isActive: true }).toArray();
    const locations = await db.collection('eventLocations').find({}).toArray();
    
    // Map locations to events
    const eventsWithLocations = events.map(event => ({
      ...event,
      locations: event.locationIds ? event.locationIds.map((locId: string) => 
        locations.find(loc => loc._id.toString() === locId.toString())
      ).filter(Boolean) : []
    }));
    
    return NextResponse.json({
      events: eventsWithLocations,
      locations: locations
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
