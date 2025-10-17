import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'district79admin';
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    const db = await getDatabase();
    
    // Get all registrations
    const registrations = await db.collection('registrations').find({}).toArray();
    
    // Get all locations
    const locations = await db.collection('eventLocations').find({}).toArray();
    
    // Get all events
    const events = await db.collection('events').find({ isActive: true }).toArray();
    
    // Create a map of location ID to event date
    const locationToEventDate = new Map();
    events.forEach(event => {
      event.locationIds.forEach((locationId: { toString: () => string }) => {
        const eventDate = event.date === '2024-10-28' ? 'Tuesday, Oct 28' : 'Thursday, Oct 30';
        locationToEventDate.set(locationId.toString(), eventDate);
      });
    });
    
    // Calculate stats by location
    const locationStats = locations.map(location => {
      const locationId = location._id.toString();
      const regs = registrations.filter(reg => reg.crawlLocation === locationId);
      const maxCapacity = location.maxCapacity || 20;
      
      return {
        _id: locationId,
        name: location.name,
        address: location.address,
        eventDate: locationToEventDate.get(locationId) || 'Unknown',
        registrationCount: regs.length,
        maxCapacity,
        availableSpots: Math.max(0, maxCapacity - regs.length),
        registrations: regs.map(reg => ({
          firstName: reg.firstName,
          lastName: reg.lastName,
          email: reg.email,
          phone: reg.phone,
          school: reg.school,
          registeredAt: reg.createdAt
        }))
      };
    });
    
    // Sort by event date, then by name
    locationStats.sort((a, b) => {
      if (a.eventDate !== b.eventDate) {
        return a.eventDate.includes('28') ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json({
      totalRegistrations: registrations.length,
      locationStats
    });
    
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}

