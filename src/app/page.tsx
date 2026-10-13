import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, Twitter, Mail, MapPin, Users } from 'lucide-react';

import type { ActiveCrawlEvent } from '@/lib/crawls';

// Always read live data so opening/closing a cycle shows up immediately
export const dynamic = 'force-dynamic';

async function getActiveEvents(): Promise<ActiveCrawlEvent[]> {
  try {
    const { getDatabase } = await import('@/lib/mongodb');
    const { getActiveCrawlEvents } = await import('@/lib/crawls');
    return await getActiveCrawlEvents(await getDatabase());
  } catch (error) {
    console.error('Error fetching availability:', error);
    return [];
  }
}

function boroughList(event: ActiveCrawlEvent) {
  const boroughs = [...new Set(event.locations.map(location => location.borough).filter(Boolean))] as string[];
  if (boroughs.length <= 1) return boroughs.join('');
  return `${boroughs.slice(0, -1).join(', ')} or ${boroughs[boroughs.length - 1]}`;
}

export default async function HomePage() {
  const events = await getActiveEvents();
  const availability = events.flatMap(event =>
    event.locations.map(location => ({ ...location, dateLabel: event.dateLabel }))
  );
  const allFull = availability.length > 0 && availability.every(location => !location.isAvailable);

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
          {events.map(event => (
            <div key={event._id} className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto border-2" style={{borderColor: '#ECC67F'}}>
              <h2 className="text-3xl font-bold mb-4 uppercase" style={{color: '#ECC67F'}}>{event.dateLabel}</h2>
              <p className="text-xl text-gray-800 mb-2">{event.time}</p>
              <p className="text-lg text-gray-700 uppercase">{boroughList(event) || event.title}</p>
            </div>
          ))}
          {events.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto border-2" style={{borderColor: '#ECC67F'}}>
              <h2 className="text-3xl font-bold mb-4" style={{color: '#ECC67F'}}>DATES COMING SOON</h2>
              <p className="text-lg text-gray-700">Check back for the next round of District 79 crawls.</p>
            </div>
          )}
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
                      {location.dateLabel}
                    </span>
                  </div>
                  <div className={`flex items-center ${location.availableSpots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <Users className="h-4 w-4 mr-1" />
                    <span className="text-sm font-bold">{location.availableSpots} / {location.totalSpots}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{color: '#ECC67F'}}>{location.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{location.address}</p>
                <span className="text-xs text-gray-500 mb-2">{location.description || 'No description available'}</span>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-bold mb-2">Available:</span>
                  <span className={`text-xs font-bold ${location.availableSpots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {location.availableSpots > 0 ? `${location.availableSpots} spots left` : 'FULL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thank You Message (only once every location is full) */}
        {allFull && (
        <div className="text-center mb-16">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto border-2" style={{borderColor: '#ECC67F'}}>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#ECC67F'}}>
              Thank You to All NYCPS Employees!
            </h2>
            <p className="text-lg text-gray-800 mb-2">
              We are grateful for the overwhelming response from NYCPS employees.
            </p>
            <p className="text-lg text-gray-800 mb-2">
              All spots for the Fall Crawls are now full!
            </p>
            <p className="text-lg text-gray-800">
              We look forward to seeing everyone at the events and making meaningful connections.
            </p>
          </div>
        </div>
        )}

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
              @ {new Date().getFullYear()} District 79. All rights reserved.
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-600">
              <a href="https://adulted.nyc" className="hover:opacity-75 transition-opacity">Adult Education</a>
              <a href="https://schools.nyc.gov" className="hover:opacity-75 transition-opacity">NYC Schools</a>
              <a href="https://www.d79.nyc/" className="hover:opacity-75 transition-opacity">District 79</a>
              <a href="#" className="flex items-center hover:opacity-75 transition-opacity">
                <Mail className="h-4 w-4 mr-1" />
                Contact Webmaster
              </a>
              <p>Having issues? Contact Javier Jaramillo at jjaramillo7@schools.nyc.gov or (929) 769-1001</p>

            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}