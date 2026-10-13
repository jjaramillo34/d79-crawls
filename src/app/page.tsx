import Link from 'next/link';
import Image from 'next/image';
import {
  Instagram, Facebook, Twitter, Mail, Phone, MapPin, Clock, CalendarDays, ArrowRight,
  Presentation, Building2, Handshake, BadgeCheck,
} from 'lucide-react';

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

const BRAND = '#ECC67F';
// Darker shade of the brand gold for text, which needs more contrast on light backgrounds
const BRAND_TEXT = '#9A6B12';

function dateParts(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) => parsed.toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
  return {
    weekday: part({ weekday: 'short' }),
    month: part({ month: 'short' }),
    day: part({ day: 'numeric' }),
    short: part({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function boroughList(event: ActiveCrawlEvent) {
  const boroughs = [...new Set(event.locations.map(location => location.borough).filter(Boolean))] as string[];
  if (boroughs.length <= 1) return boroughs.join('');
  return `${boroughs.slice(0, -1).join(', ')} or ${boroughs[boroughs.length - 1]}`;
}

export default async function HomePage() {
  const events = await getActiveEvents();
  const locations = events.flatMap(event => event.locations);
  const seatsLeft = locations.reduce((sum, location) => sum + location.availableSpots, 0);
  const allFull = locations.length > 0 && seatsLeft === 0;
  const isOpen = events.length > 0;
  const dates = [...new Set(events.map(event => event.date))];
  const times = [...new Set(events.map(event => event.time))];

  const highlights = [
    { icon: Presentation, title: 'Information session', text: 'Learn about the programs and opportunities within District 79.' },
    { icon: Building2, title: 'Site visit', text: 'Tour a Referral Center and a D79 site in your borough.' },
    { icon: Handshake, title: 'Meet the team', text: 'Meet staff and make connections that help your families and students.' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Image src="/images/d79logo.png" alt="District 79 Logo" width={140} height={98} className="object-contain h-14 w-auto" priority />
          <div className="flex items-center gap-4">
            {isOpen && !allFull && (
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-900 hover:opacity-90"
                style={{backgroundColor: BRAND}}
              >
                Register
              </Link>
            )}
            <Image src="/images/nycpublicshools.png" alt="NYC Public Schools Logo" width={110} height={37} className="object-contain h-9 w-auto" />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none" style={{backgroundColor: BRAND}} />
          <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{backgroundColor: BRAND}} />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white border border-amber-200" style={{color: BRAND_TEXT}}>
              <BadgeCheck className="h-4 w-4" />
              Open to NYCPS employees
            </span>
            <h1 className="mt-6 text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
              District 79<br />
              <span style={{color: BRAND_TEXT}}>Fall Crawls</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
              Join us for an information session and a site visit to a Referral Center and D79 site.
              Learn more about opportunities within D79 for your families and students.
            </p>

            {isOpen ? (
              <>
                <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
                  {dates.map(date => (
                    <span key={date} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
                      <CalendarDays className="h-4 w-4" style={{color: BRAND_TEXT}} />
                      <span className="font-semibold">{dateParts(date).short}</span>
                    </span>
                  ))}
                  {times.map(time => (
                    <span key={time} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
                      <Clock className="h-4 w-4" style={{color: BRAND_TEXT}} />
                      <span className="font-semibold">{time}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
                  {allFull ? (
                    <span className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-bold bg-gray-200 text-gray-600">
                      All sessions are full
                    </span>
                  ) : (
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-bold text-gray-900 shadow-lg hover:opacity-90 transition-opacity"
                      style={{backgroundColor: BRAND}}
                    >
                      Reserve your spot
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  )}
                  <a
                    href="#locations"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-semibold bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                  >
                    See locations
                  </a>
                </div>

                <dl className="mt-12 grid grid-cols-3 max-w-xl mx-auto divide-x divide-gray-200 rounded-2xl bg-white border border-gray-200 shadow-sm">
                  {[
                    { label: events.length === 1 ? 'Session' : 'Sessions', value: events.length },
                    { label: 'Locations', value: locations.length },
                    { label: 'Seats left', value: seatsLeft },
                  ].map(stat => (
                    <div key={stat.label} className="py-4">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</dt>
                      <dd className="text-2xl font-bold mt-1">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <div className="mt-10 inline-block rounded-2xl bg-white border border-gray-200 shadow-sm px-8 py-6">
                <p className="text-xl font-bold" style={{color: BRAND_TEXT}}>Dates coming soon</p>
                <p className="text-gray-600 mt-1">Check back for the next round of District 79 crawls.</p>
              </div>
            )}
          </div>
        </section>

        {/* What to expect */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center">What to expect</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {highlights.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-gray-200 p-6 bg-white">
                <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: `${BRAND}40`}}>
                  <Icon className="h-6 w-6" style={{color: BRAND_TEXT}} />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sessions and locations */}
        {isOpen && (
          <section id="locations" className="bg-gray-50 border-y border-gray-100 scroll-mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <h2 className="text-3xl font-bold text-center">Choose a location</h2>
              <p className="mt-3 text-center text-gray-600">Seat counts update live as people register.</p>

              {allFull && (
                <div className="mt-8 max-w-3xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                  <p className="text-lg font-bold" style={{color: BRAND_TEXT}}>Thank you to all NYCPS employees!</p>
                  <p className="mt-1 text-gray-700">
                    We are grateful for the overwhelming response. All spots are now full. We look forward to seeing everyone at the events.
                  </p>
                </div>
              )}

              <div className="mt-10 space-y-12">
                {events.map(event => {
                  const parts = dateParts(event.date);
                  const boroughs = boroughList(event);
                  return (
                    <div key={event._id}>
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-16 flex-shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-white text-center shadow-sm">
                          <div className="text-xs font-bold uppercase py-1 text-gray-900" style={{backgroundColor: BRAND}}>{parts.month}</div>
                          <div className="text-2xl font-extrabold leading-tight pt-1">{parts.day}</div>
                          <div className="text-xs text-gray-500 pb-1">{parts.weekday}</div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{boroughs || event.title}</h3>
                          <p className="text-gray-600 flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-4 w-4" />
                            {event.dateLabel} · {event.time}
                          </p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {event.locations.map(location => {
                          const percentTaken = location.totalSpots > 0
                            ? Math.min(100, Math.round((location.registered / location.totalSpots) * 100))
                            : 100;
                          const fewLeft = location.isAvailable && location.availableSpots <= 3;
                          return (
                            <div key={location._id} className="flex flex-col rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-semibold text-lg leading-snug">{location.name}</h4>
                                {location.borough && (
                                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">{location.borough}</span>
                                )}
                              </div>
                              <p className="mt-2 text-sm text-gray-600 flex items-start gap-1.5">
                                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                {location.address}
                              </p>
                              {location.description && <p className="mt-1 text-sm text-gray-500 pl-5">{location.description}</p>}

                              <div className="mt-auto pt-5">
                                <div className="flex items-center justify-between text-sm mb-1.5">
                                  <span className={location.isAvailable ? (fewLeft ? 'text-amber-700 font-semibold' : 'text-gray-700') : 'text-red-600 font-semibold'}>
                                    {location.isAvailable
                                      ? fewLeft ? `Only ${location.availableSpots} left` : `${location.availableSpots} of ${location.totalSpots} seats left`
                                      : 'Full'}
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${percentTaken}%`, backgroundColor: location.isAvailable ? BRAND : '#DC2626' }} />
                                </div>
                                {location.isAvailable ? (
                                  <Link
                                    href={`/register?location=${location._id}`}
                                    className="mt-4 inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg font-semibold text-gray-900 hover:opacity-90"
                                    style={{backgroundColor: BRAND}}
                                  >
                                    Register here
                                  </Link>
                                ) : (
                                  <span className="mt-4 inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg font-semibold bg-gray-100 text-gray-500">
                                    No seats available
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Closing call to action */}
        {isOpen && !allFull && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="rounded-3xl px-6 py-12 text-center" style={{backgroundColor: `${BRAND}33`}}>
              <h2 className="text-3xl font-bold">Come visit District 79!</h2>
              <p className="mt-3 text-gray-700">Seats are limited. Reserve yours with your @schools.nyc.gov email.</p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-gray-900 shadow hover:opacity-90"
                style={{backgroundColor: BRAND}}
              >
                Reserve your spot
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="font-semibold">District 79 Fall Crawls</p>
              <p className="mt-2 text-sm text-gray-600">Alternative Schools &amp; Programs, NYC Public Schools</p>
              <div className="mt-4 flex gap-4 text-gray-500">
                <Instagram className="h-5 w-5" aria-label="Instagram" />
                <Facebook className="h-5 w-5" aria-label="Facebook" />
                <Twitter className="h-5 w-5" aria-label="Twitter" />
              </div>
            </div>
            <div>
              <p className="font-semibold">Links</p>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                <li><a href="https://www.d79.nyc/" className="hover:text-gray-900">District 79</a></li>
                <li><a href="https://schools.nyc.gov" className="hover:text-gray-900">NYC Public Schools</a></li>
                <li><a href="https://adulted.nyc" className="hover:text-gray-900">Adult Education</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Having issues?</p>
              <p className="mt-2 text-sm text-gray-600">Contact Javier Jaramillo</p>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                <li>
                  <a href="mailto:jjaramillo7@schools.nyc.gov" className="inline-flex items-center gap-1.5 hover:text-gray-900">
                    <Mail className="h-4 w-4" /> jjaramillo7@schools.nyc.gov
                  </a>
                </li>
                <li>
                  <a href="tel:+19297691001" className="inline-flex items-center gap-1.5 hover:text-gray-900">
                    <Phone className="h-4 w-4" /> (929) 769-1001
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-500">
            © {new Date().getFullYear()} District 79. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
