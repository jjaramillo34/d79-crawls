import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Get all locations from the database
    const locations = await db.collection('eventLocations').find({}).toArray();
    
    // Get events to map locations to dates
    const events = await db.collection('events').find({ isActive: true }).toArray();
    
    // Organize locations by event date
    const tuesdayEvent = events.find(e => e.date === '2024-10-28');
    const thursdayEvent = events.find(e => e.date === '2024-10-30');
    
    const tuesdayLocations = locations.filter(loc => 
      tuesdayEvent?.locationIds?.some((id: string | object) => id.toString() === loc._id.toString())
    );
    
    const thursdayLocations = locations.filter(loc => 
      thursdayEvent?.locationIds?.some((id: string | object) => id.toString() === loc._id.toString())
    );
    
    return NextResponse.json({
      tuesday: tuesdayLocations,
      thursday: thursdayLocations,
      all: locations
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
