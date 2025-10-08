import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { CrawlAvailability } from '@/types/registration';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Get registrations from both old and new collections
    const oldRegistrations = await db.collection('registrations').find({}).toArray();
    const newRegistrations = await db.collection('eventRegistrations').find({ status: 'confirmed' }).toArray();
    
    // Count registrations for each date
    const tuesdayOldRegistrations = oldRegistrations.filter(r => r.crawlDate === 'tuesday').length;
    const thursdayOldRegistrations = oldRegistrations.filter(r => r.crawlDate === 'thursday').length;
    
    // For new registrations, we need to check the event dates
    const events = await db.collection('events').find({ isActive: true }).toArray();
    const tuesdayEvent = events.find(e => e.date === '2024-10-28');
    const thursdayEvent = events.find(e => e.date === '2024-10-30');
    
    const tuesdayNewRegistrations = newRegistrations.filter(r => 
      tuesdayEvent && r.eventId === tuesdayEvent._id.toString()
    ).length;
    
    const thursdayNewRegistrations = newRegistrations.filter(r => 
      thursdayEvent && r.eventId === thursdayEvent._id.toString()
    ).length;
    
    const totalTuesdayRegistrations = tuesdayOldRegistrations + tuesdayNewRegistrations;
    const totalThursdayRegistrations = thursdayOldRegistrations + thursdayNewRegistrations;
    
    const availability: CrawlAvailability = {
      tuesday: {
        total: 20,
        registered: totalTuesdayRegistrations,
        available: Math.max(0, 20 - totalTuesdayRegistrations)
      },
      thursday: {
        total: 20,
        registered: totalThursdayRegistrations,
        available: Math.max(0, 20 - totalThursdayRegistrations)
      }
    };
    
    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
