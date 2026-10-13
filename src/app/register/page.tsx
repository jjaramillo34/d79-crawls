'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, AlertCircle, Mail, User, Building } from 'lucide-react';

interface LocationAvailability {
  _id: string;
  name: string;
  address: string;
  borough?: string;
  availableSpots: number;
  totalSpots: number;
  isAvailable: boolean;
}

interface CrawlEvent {
  _id: string;
  title: string;
  date: string;
  dateLabel: string;
  time: string;
  locations: LocationAvailability[];
}

function boroughList(event: CrawlEvent) {
  const boroughs = [...new Set(event.locations.map(location => location.borough).filter(Boolean))] as string[];
  if (boroughs.length <= 1) return boroughs.join('');
  return `${boroughs.slice(0, -1).join(', ')} or ${boroughs[boroughs.length - 1]}`;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    school: '',
    eventId: '',
    crawlLocation: ''
  });
  const [events, setEvents] = useState<CrawlEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/location-availability');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Changing the session clears a location picked for a different session
      ...(name === 'eventId' ? { crawlLocation: '' } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          school: '',
          eventId: '',
          crawlLocation: ''
        });
        // Refresh availability
        fetchLocations();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getLocationOptions = (eventId: string) => {
    // Only show locations with available spots for the chosen session
    const dateLocations = (events.find(event => event._id === eventId)?.locations || [])
      .filter(loc => loc.isAvailable);
    
    return dateLocations.map(loc => ({
      value: loc._id,
      label: `${loc.name} - ${loc.address} (${loc.availableSpots} spots left)`,
      address: loc.address,
      name: loc.name
    }));
  };

  const isEmailValid = formData.email.endsWith('@schools.nyc.gov');
  const isFormValid = isEmailValid && formData.firstName && formData.lastName && formData.school && formData.eventId && formData.crawlLocation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Image
                src="/images/d79logo.png"
                alt="District 79 Logo"
                width={100}
                height={70}
                className="object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900">Register for D79 Crawls</h1>
              <Image
                src="/images/nycpublicshools.png"
                alt="NYC Public Schools Logo"
                width={100}
                height={33}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Availability Status */}
        {!loadingAvailability && events.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Current Availability</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {events.map(event => {
                const openLocations = event.locations.filter(loc => loc.isAvailable).length;
                return (
                  <div key={event._id} className="border-2 rounded-lg p-4" style={{borderColor: '#ECC67F'}}>
                    <div className="flex items-center mb-2">
                      <Calendar className="h-5 w-5 mr-2" style={{color: '#ECC67F'}} />
                      <span className="font-semibold">{event.dateLabel}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{boroughList(event) || event.title}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Available:</span>
                      <span className={`font-bold ${openLocations > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {openLocations} locations
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loadingAvailability && events.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-center text-gray-700">
            Registration is not open right now. Please check back soon.
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Form</h2>
            <p className="text-gray-600">
              Please fill out the form below to register for the D79 Fall Crawls. 
              Only @schools.nyc.gov email addresses are accepted.
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                  formData.email && !isEmailValid ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="your.email@schools.nyc.gov"
                required
              />
              {formData.email && !isEmailValid && (
                <p className="mt-1 text-sm text-red-600">
                  Only @schools.nyc.gov email addresses are accepted
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* School */}
            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="h-4 w-4 inline mr-1" />
                School/Department *
              </label>
              <input
                type="text"
                id="school"
                name="school"
                value={formData.school}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., PS 123, District Office, etc."
                required
              />
            </div>

            {/* Crawl Date */}
            <div>
              <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Select Crawl Date *
              </label>
              <select
                id="eventId"
                name="eventId"
                value={formData.eventId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose a date</option>
                {events.map(event => {
                  const isFull = event.locations.every(loc => !loc.isAvailable);
                  const boroughs = boroughList(event);
                  return (
                    <option key={event._id} value={event._id} disabled={isFull}>
                      {event.dateLabel}{boroughs ? ` (${boroughs})` : ''}{isFull ? ' - FULL' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Crawl Location */}
            {formData.eventId && (
              <div>
                <label htmlFor="crawlLocation" className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Select Location *
                </label>
                <select
                  id="crawlLocation"
                  name="crawlLocation"
                  value={formData.crawlLocation}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a location</option>
                  {getLocationOptions(formData.eventId).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                isFormValid && !loading
                  ? 'text-white hover:opacity-90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              style={isFormValid && !loading ? {backgroundColor: '#ECC67F'} : {}}
            >
              {loading ? 'Registering...' : 'Register for Crawl'}
            </button>
          </form>

          {/* Event Details */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-3" />
                  <span>{[...new Set(events.map(event => event.time))].join(' / ') || 'To be announced'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-3" />
                  <span>{events.map(event => event.dateLabel).join(' & ') || 'To be announced'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-3" />
                  <span>Various NYC Locations</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Building className="h-5 w-5 mr-3" />
                  <span>Open to NYCPS Employees</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
