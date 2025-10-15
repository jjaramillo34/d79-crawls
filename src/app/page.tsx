import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, Twitter, Mail, MapPin, Users } from 'lucide-react';

interface LocationAvailability {
  _id: string;
  name: string;
  address: string;
  eventDate: string;
  availableSpots: number;
  totalSpots: number;
  isAvailable: boolean;
}

async function getAvailability(): Promise<LocationAvailability[]> {
  try {
    // Import the API function directly instead of using fetch
    const { getDatabase } = await import('@/lib/mongodb');
    
    const db = await getDatabase();
    
    // Get all events with their locations
    const events = await db.collection('events').find({ isActive: true }).toArray();
    
    // Get all registrations
    const registrations = await db.collection('registrations').find({}).toArray();
    
    // Create a map of location ID to event date
    const locationToEventDate = new Map();
    events.forEach(event => {
      event.locationIds.forEach((locationId: { toString: () => string }) => {
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
        _id: location._id.toString(),
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
    
    return locationAvailability;
  } catch (error) {
    console.error('Error fetching availability:', error);
    return [];
  }
}

export default async function HomePage() {
  const availability = await getAvailability();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white relative overflow-hidden">
      {/* Background decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-20 blur-xl" style={{backgroundColor: '#ECC67F'}}></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full opacity-15 blur-lg" style={{backgroundColor: '#ECC67F'}}></div>
        <div className="absolute bottom-40 left-1/4 w-40 h-40 rounded-full opacity-25 blur-2xl" style={{backgroundColor: '#ECC67F'}}></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 rounded-full opacity-20 blur-xl" style={{backgroundColor: '#ECC67F'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/images/d79logo.png"
                alt="District 79 Logo"
                width={200}
                height={140}
                className="object-contain"
              />
            </div>
            <div className="flex items-center space-x-4">
              <Image
                src="/images/nycpublicshools.png"
                alt="NYC Public Schools Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Date and Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight" style={{color: '#ECC67F'}}>
            DISTRICT 79<br />
            FALL CRAWLS
          </h1>
        </div>

        {/* Event Dates and Times */}
        <div className="text-center mb-16 space-y-8">
          {/* Tuesday Event */}
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto border-2" style={{borderColor: '#ECC67F'}}>
            <h2 className="text-3xl font-bold mb-4" style={{color: '#ECC67F'}}>TUESDAY, OCTOBER 28</h2>
            <p className="text-xl text-gray-800 mb-2">10 AM - 12 PM</p>
            <p className="text-lg text-gray-700">MANHATTAN, QUEENS, OR THE BRONX</p>
          </div>

          {/* Thursday Event */}
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto border-2" style={{borderColor: '#ECC67F'}}>
            <h2 className="text-3xl font-bold mb-4" style={{color: '#ECC67F'}}>THURSDAY OCTOBER 30</h2>
            <p className="text-xl text-gray-800 mb-2">10 AM - 12 PM</p>
            <p className="text-lg text-gray-700">STATEN ISLAND OR BROOKLYN</p>
          </div>
        </div>

        {/* Call to Action Text */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-lg text-gray-800">
            Join us for an information session and a site visit to a Referral Center and D79 site
          </p>
          <h2 className="text-2xl md:text-3xl font-bold" style={{color: '#ECC67F'}}>
            COME VISIT DISTRICT 79!
          </h2>
          <p className="text-lg text-gray-800">
            LEARN MORE ABOUT OPPORTUNITIES WITHIN D79 FOR YOUR FAMILIES AND STUDENTS!
          </p>
          <p className="text-lg text-gray-800">
            MEET STAFF, MAKE CONNECTIONS!
          </p>
          <p className="text-xl font-bold" style={{color: '#ECC67F'}}>
            OPEN TO NYCPS EMPLOYEES!
          </p>
        </div>

        {/* Current Availability Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8" style={{color: '#ECC67F'}}>
            Current Availability
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {availability.map((location) => (
              <div 
                key={location._id} 
                className="bg-white rounded-xl shadow-lg p-6 border-2 hover:shadow-xl transition-shadow" 
                style={{borderColor: '#ECC67F'}}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" style={{color: '#ECC67F'}} />
                    <span className="text-sm font-semibold uppercase">
                      {location.eventDate === 'tuesday' ? 'Tuesday, Oct 28' : 'Thursday, Oct 30'}
                    </span>
                  </div>
                  <div className={`flex items-center ${location.availableSpots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <Users className="h-4 w-4 mr-1" />
                    <span className="text-sm font-bold">{location.availableSpots} / {location.totalSpots}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{color: '#ECC67F'}}>{location.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{location.address}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Available:</span>
                  <span className={`text-sm font-bold ${location.availableSpots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {location.availableSpots > 0 ? `${location.availableSpots} spots left` : 'FULL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Registration Button */}
        <div className="text-center mb-16">
          <Link
            href="/register"
            className="inline-block text-white px-12 py-4 rounded-2xl text-xl font-bold transition-colors shadow-lg hover:opacity-90"
            style={{backgroundColor: '#ECC67F'}}
          >
            CLICK ON THE BOX BELOW TO SEE AVAILABILITY AND RSVP
          </Link>
        </div>

        {/* Social Media Section */}
        <div className="text-center mb-16">
          <h3 className="text-xl font-bold mb-8" style={{color: '#ECC67F'}}>Follow Us On Social Media</h3>
          <div className="flex justify-center space-x-12">
            <div className="text-center">
              <Instagram className="h-8 w-8 mx-auto mb-2" style={{color: '#ECC67F'}} />
              <p className="text-sm text-gray-800">Instagram</p>
            </div>
            <div className="text-center">
              <Facebook className="h-8 w-8 mx-auto mb-2" style={{color: '#ECC67F'}} />
              <p className="text-sm text-gray-800">Facebook</p>
            </div>
            <div className="text-center">
              <Twitter className="h-8 w-8 mx-auto mb-2" style={{color: '#ECC67F'}} />
              <p className="text-sm text-gray-800">Twitter</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
              © 2025 District 79. All rights reserved.
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:opacity-75 transition-opacity">Adult Education</a>
              <a href="#" className="hover:opacity-75 transition-opacity">NYC Schools</a>
              <a href="#" className="flex items-center hover:opacity-75 transition-opacity">
                <Mail className="h-4 w-4 mr-1" />
                Contact Webmaster
              </a>
              <p>Having issues? Contact Javier Jaramillo at jjaramillo7@schools.nyc.gov</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}