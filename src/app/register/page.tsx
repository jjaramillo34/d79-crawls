'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WaitlistForm from './WaitlistForm';
import {
  ArrowLeft, CalendarDays, MapPin, Clock, CheckCircle2, AlertCircle, Mail, User, Building,
  Check, Loader2, Phone,
} from 'lucide-react';

interface LocationAvailability {
  _id: string;
  name: string;
  address: string;
  borough?: string;
  description?: string;
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

interface Confirmation {
  firstName: string;
  email: string;
  locationName: string;
  address: string;
  dateLabel: string;
  time: string;
}

const BRAND = '#ECC67F';
// Darker shade of the brand gold for text, which needs more contrast on light backgrounds
const BRAND_TEXT = '#9A6B12';
const EMAIL_DOMAIN = '@schools.nyc.gov';

const EMPTY_FORM = { email: '', firstName: '', lastName: '', school: '', eventId: '', crawlLocation: '' };

function boroughList(event: CrawlEvent) {
  const boroughs = [...new Set(event.locations.map(location => location.borough).filter(Boolean))] as string[];
  if (boroughs.length <= 1) return boroughs.join('');
  return `${boroughs.slice(0, -1).join(', ')} or ${boroughs[boroughs.length - 1]}`;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [events, setEvents] = useState<CrawlEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  // Links from the homepage (/register?location=<id>) pre-select that session and location, once
  const preselected = useRef(false);
  useEffect(() => {
    if (preselected.current || events.length === 0) return;
    preselected.current = true;
    const locationId = new URLSearchParams(window.location.search).get('location');
    const event = events.find(e => e.locations.some(loc => loc._id === locationId && loc.isAvailable));
    if (locationId && event) {
      setFormData(prev => ({ ...prev, eventId: event._id, crawlLocation: locationId }));
    }
  }, [events]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectLocation = (eventId: string, locationId: string) => {
    setFormData(prev => ({ ...prev, eventId, crawlLocation: locationId }));
    setError('');
  };

  const selectedEvent = events.find(event => event._id === formData.eventId);
  const selectedLocation = selectedEvent?.locations.find(location => location._id === formData.crawlLocation);

  const email = formData.email.trim();
  const isEmailValid = email.toLowerCase().endsWith(EMAIL_DOMAIN) && email.length > EMAIL_DOMAIN.length;
  const showEmailError = (emailTouched || email.includes('@')) && email.length > 0 && !isEmailValid;

  const missing = [
    !selectedLocation && 'a location',
    !isEmailValid && `your ${EMAIL_DOMAIN} email`,
    !formData.firstName.trim() && 'first name',
    !formData.lastName.trim() && 'last name',
    !formData.school.trim() && 'school',
  ].filter(Boolean) as string[];
  const isFormValid = missing.length === 0;
  const allFull = events.length > 0 && events.every(event => event.locations.every(location => !location.isAvailable));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedEvent || !selectedLocation) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email }),
      });
      const data = await response.json();

      if (response.ok) {
        setConfirmation({
          firstName: formData.firstName.trim(),
          email,
          locationName: selectedLocation.name,
          address: selectedLocation.address,
          dateLabel: selectedEvent.dateLabel,
          time: selectedEvent.time,
        });
        setFormData(EMPTY_FORM);
        setEmailTouched(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        fetchLocations();
      } else {
        setError(data.error || 'Registration failed. Please try again.');
        // Seats may have changed since the page loaded
        fetchLocations();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header (matches the homepage) */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" aria-label="District 79 Fall Crawls home">
            <Image src="/images/d79logo.png" alt="District 79 Logo" width={140} height={98} className="object-contain h-14 w-auto" priority />
          </Link>
          <Image src="/images/nycpublicshools.png" alt="NYC Public Schools Logo" width={150} height={50} className="object-contain h-12 w-auto" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to home
        </Link>

        {confirmation ? (
          /* Success */
          <div className="mt-6 max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <span className="inline-flex w-16 h-16 rounded-full items-center justify-center bg-green-50">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </span>
            <h1 className="mt-4 text-3xl font-bold">You&apos;re registered, {confirmation.firstName}!</h1>
            <p className="mt-2 text-gray-600">
              A confirmation email is on its way to <span className="font-medium text-gray-900">{confirmation.email}</span>.
            </p>

            <div className="mt-6 text-left rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-3">
              <p className="font-semibold text-lg">{confirmation.locationName}</p>
              <p className="flex items-start gap-2 text-gray-700"><CalendarDays className="h-5 w-5 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />{confirmation.dateLabel}</p>
              <p className="flex items-start gap-2 text-gray-700"><Clock className="h-5 w-5 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />{confirmation.time}</p>
              <p className="flex items-start gap-2 text-gray-700"><MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />{confirmation.address}</p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/" className="px-6 py-3 rounded-lg font-semibold text-gray-900 hover:opacity-90" style={{backgroundColor: BRAND}}>
                Back to home
              </Link>
              <button
                onClick={() => setConfirmation(null)}
                className="px-6 py-3 rounded-lg font-semibold border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
              >
                Register someone else
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 mb-8">
              <h1 className="text-3xl md:text-4xl font-bold">{allFull ? 'All crawls are full' : 'Reserve your spot'}</h1>
              <p className="mt-2 text-gray-600">
                {allFull
                  ? 'Thank you for the amazing response! Every seat is taken, but you can join the waitlist below.'
                  : 'District 79 Fall Crawls are open to NYCPS employees. Pick a location, then tell us who you are.'}
              </p>
            </div>

            {loadingAvailability ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 flex items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Loading available locations…
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <p className="text-xl font-bold" style={{color: BRAND_TEXT}}>Registration is not open right now</p>
                <p className="mt-2 text-gray-600">Please check back soon for the next round of District 79 crawls.</p>
              </div>
            ) : allFull ? (
              <WaitlistForm events={events} allFull />
            ) : (
              <>
              <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                  {/* Step 1: location */}
                  <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h2 className="flex items-center gap-3 text-xl font-bold">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-gray-900" style={{backgroundColor: BRAND}}>1</span>
                      Choose a location
                    </h2>

                    <div className="mt-6 space-y-8">
                      {events.map(event => {
                        const boroughs = boroughList(event);
                        return (
                          <fieldset key={event._id}>
                            <legend className="mb-3">
                              <span className="font-semibold">{boroughs || event.title}</span>
                              <span className="block text-sm text-gray-500 mt-0.5">{event.dateLabel} · {event.time}</span>
                            </legend>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {event.locations.map(location => {
                                const selected = formData.crawlLocation === location._id;
                                const fewLeft = location.isAvailable && location.availableSpots <= 3;
                                return (
                                  <label
                                    key={location._id}
                                    className={`relative flex flex-col rounded-xl border-2 p-4 transition ${
                                      !location.isAvailable
                                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                        : selected
                                          ? 'bg-amber-50 cursor-pointer'
                                          : 'border-gray-200 hover:border-amber-200 cursor-pointer'
                                    }`}
                                    style={selected ? { borderColor: BRAND } : undefined}
                                  >
                                    <input
                                      type="radio"
                                      name="crawlLocation"
                                      value={location._id}
                                      checked={selected}
                                      disabled={!location.isAvailable}
                                      onChange={() => selectLocation(event._id, location._id)}
                                      className="sr-only"
                                    />
                                    {selected && (
                                      <span className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center" style={{backgroundColor: BRAND}}>
                                        <Check className="h-4 w-4 text-gray-900" />
                                      </span>
                                    )}
                                    <span className="font-semibold pr-8">{location.name}</span>
                                    <span className="mt-1 text-sm text-gray-600">{location.address}</span>
                                    <span className={`mt-3 text-sm font-medium ${
                                      !location.isAvailable ? 'text-red-600' : fewLeft ? 'text-amber-700' : 'text-green-700'
                                    }`}>
                                      {!location.isAvailable ? 'Full' : fewLeft
                                        ? `Only ${location.availableSpots} ${location.availableSpots === 1 ? 'seat' : 'seats'} left`
                                        : `${location.availableSpots} seats left`}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                        );
                      })}
                    </div>
                  </section>

                  {/* Step 2: details */}
                  <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h2 className="flex items-center gap-3 text-xl font-bold">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-gray-900" style={{backgroundColor: BRAND}}>2</span>
                      Your details
                    </h2>

                    <div className="mt-6 space-y-5">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                          <Mail className="h-4 w-4 inline mr-1" />
                          Work email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          autoComplete="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          onBlur={() => setEmailTouched(true)}
                          className={`${inputClass} ${showEmailError ? 'border-red-400 focus:ring-red-100' : ''}`}
                          placeholder={`your.name${EMAIL_DOMAIN}`}
                          aria-invalid={showEmailError}
                          aria-describedby="email-help"
                          required
                        />
                        <p id="email-help" className={`mt-1.5 text-sm ${showEmailError ? 'text-red-600' : 'text-gray-500'}`}>
                          {showEmailError ? `Please use your ${EMAIL_DOMAIN} email address.` : `Only ${EMAIL_DOMAIN} addresses are accepted.`}
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                            <User className="h-4 w-4 inline mr-1" />
                            First name
                          </label>
                          <input type="text" id="firstName" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleInputChange} className={inputClass} required />
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                            <User className="h-4 w-4 inline mr-1" />
                            Last name
                          </label>
                          <input type="text" id="lastName" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleInputChange} className={inputClass} required />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1.5">
                          <Building className="h-4 w-4 inline mr-1" />
                          School or department
                        </label>
                        <input type="text" id="school" name="school" value={formData.school} onChange={handleInputChange} className={inputClass} placeholder="e.g., PS 123, District Office" required />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Summary */}
                <aside className="lg:sticky lg:top-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="font-bold text-lg">Your registration</h2>

                  {selectedEvent && selectedLocation ? (
                    <div className="mt-4 space-y-2.5 text-sm">
                      <p className="font-semibold text-base">{selectedLocation.name}</p>
                      <p className="flex items-start gap-2 text-gray-700"><CalendarDays className="h-4 w-4 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />{selectedEvent.dateLabel}</p>
                      <p className="flex items-start gap-2 text-gray-700"><Clock className="h-4 w-4 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />{selectedEvent.time}</p>
                      <p className="flex items-start gap-2 text-gray-700"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />{selectedLocation.address}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 p-4 text-center">
                      Choose a location to see your session details.
                    </p>
                  )}

                  {error && (
                    <div className="mt-5 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-start">
                      <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className="mt-6 w-full inline-flex items-center justify-center py-3.5 px-6 rounded-xl font-bold text-lg text-gray-900 transition-opacity hover:opacity-90 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                    style={isFormValid && !loading ? {backgroundColor: BRAND} : undefined}
                  >
                    {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                    {loading ? 'Registering…' : 'Complete registration'}
                  </button>
                  {!isFormValid && (
                    <p className="mt-2 text-xs text-gray-500 text-center">Still needed: {missing.join(', ')}</p>
                  )}

                  <div className="mt-6 pt-5 border-t border-gray-100 text-sm text-gray-600 space-y-1.5">
                    <p className="font-medium text-gray-800">Need help?</p>
                    <a href="mailto:jjaramillo7@schools.nyc.gov" className="flex items-center gap-1.5 hover:text-gray-900">
                      <Mail className="h-4 w-4" /> jjaramillo7@schools.nyc.gov
                    </a>
                    <a href="tel:+19297691001" className="flex items-center gap-1.5 hover:text-gray-900">
                      <Phone className="h-4 w-4" /> (929) 769-1001
                    </a>
                  </div>
                </aside>
              </form>

              <div className="mt-10">
                <WaitlistForm events={events} allFull={false} />
              </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
