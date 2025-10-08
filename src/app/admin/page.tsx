'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Users, Building } from 'lucide-react';

interface EventLocation {
  _id: string;
  name: string;
  address: string;
  borough: string;
  capacity: number;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface Event {
  _id: string;
  title: string;
  date: string;
  time: string;
  eventType: string;
  description: string;
  targetAudience: string;
  maxCapacity: number;
  locations: EventLocation[];
}

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<EventLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data.events || []);
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">D79 Crawls Admin</h1>
          <p className="text-gray-600">View all events and locations</p>
        </div>

        {/* Events Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Events</h2>
          <div className="grid gap-6">
            {events.map((event) => (
              <div key={event._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {event.time}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {event.maxCapacity} max capacity
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {event.eventType}
                  </span>
                </div>
                
                <p className="text-gray-700 mb-4">{event.description}</p>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Locations:</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {event.locations.map((location) => (
                      <div key={location._id} className="border rounded-lg p-4">
                        <div className="flex items-start mb-2">
                          <MapPin className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-gray-900">{location.name}</h5>
                            <p className="text-sm text-gray-600">{location.borough}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                        <p className="text-sm text-gray-500">{location.description}</p>
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <Building className="h-4 w-4 mr-1" />
                          Capacity: {location.capacity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Locations Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Locations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <div key={location._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start mb-3">
                  <MapPin className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{location.name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{location.borough}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{location.address}</p>
                <p className="text-sm text-gray-500 mb-3">{location.description}</p>
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="h-4 w-4 mr-1" />
                  Capacity: {location.capacity}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Coordinates: {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
