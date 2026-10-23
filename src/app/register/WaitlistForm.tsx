'use client';

import { useEffect, useState } from 'react';
import { ListPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface WaitlistEvent {
  _id: string;
  dateLabel: string;
  time: string;
  locations: { _id: string; name: string; isAvailable: boolean }[];
}

interface WaitlistFormProps {
  events: WaitlistEvent[];
  /** True when every location is full, so the waitlist is the main way to sign up */
  allFull: boolean;
  /** Set when someone clicks "Join waitlist" on a full location card; `at` makes repeat clicks count */
  preferenceRequest?: { locationId: string; at: number } | null;
}

const BRAND = '#ECC67F';
const BRAND_TEXT = '#9A6B12';
const EMAIL_DOMAIN = '@schools.nyc.gov';
const EMPTY = { email: '', firstName: '', lastName: '', school: '', preference: 'any' };

export default function WaitlistForm({ events, allFull, preferenceRequest }: WaitlistFormProps) {
  const [form, setForm] = useState(EMPTY);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Homepage "Join the waitlist" links pass ?waitlist=<locationId> to pre-pick the preference
  useEffect(() => {
    const locationId = new URLSearchParams(window.location.search).get('waitlist');
    if (locationId && events.some(event => event.locations.some(location => location._id === locationId))) {
      setForm(prev => ({ ...prev, preference: locationId }));
    }
  }, [events]);

  useEffect(() => {
    if (preferenceRequest) {
      setForm(prev => ({ ...prev, preference: preferenceRequest.locationId }));
      setSuccess('');
    }
  }, [preferenceRequest]);

  const email = form.email.trim();
  const isEmailValid = email.toLowerCase().endsWith(EMAIL_DOMAIN) && email.length > EMAIL_DOMAIN.length;
  const showEmailError = (emailTouched || email.includes('@')) && email.length > 0 && !isEmailValid;
  const isValid = isEmailValid && form.firstName.trim() && form.lastName.trim() && form.school.trim();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not join the waitlist');
      setSuccess(data.message);
      setForm(EMPTY);
      setEmailTouched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the waitlist');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300';

  return (
    <section id="waitlist" className={`scroll-mt-6 bg-white rounded-2xl border shadow-sm p-6 ${allFull ? 'border-amber-300' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: `${BRAND}40`}}>
          <ListPlus className="h-5 w-5" style={{color: BRAND_TEXT}} />
        </span>
        <div>
          <h2 className="text-xl font-bold">
            {allFull ? 'All seats are taken. Join the waitlist' : "Didn't get the location you wanted? Join the waitlist"}
          </h2>
          <p className="mt-1 text-gray-600">
            If a seat opens up or we add more space, we&apos;ll register you and email your confirmation.
            Joining the waitlist <strong>does not</strong> reserve a seat.
          </p>
        </div>
      </div>

      {success ? (
        <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{success}</p>
            <button onClick={() => setSuccess('')} className="mt-1 text-sm underline">Add someone else</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label htmlFor="wl-email" className="block text-sm font-medium text-gray-700 mb-1.5">Work email</label>
            <input
              id="wl-email" name="email" type="email" autoComplete="email" required
              value={form.email} onChange={handleChange} onBlur={() => setEmailTouched(true)}
              className={`${inputClass} ${showEmailError ? 'border-red-400' : ''}`}
              placeholder={`your.name${EMAIL_DOMAIN}`} aria-invalid={showEmailError}
            />
            {showEmailError && <p className="mt-1.5 text-sm text-red-600">Please use your {EMAIL_DOMAIN} email address.</p>}
          </div>
          <div>
            <label htmlFor="wl-first" className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
            <input id="wl-first" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label htmlFor="wl-last" className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
            <input id="wl-last" name="lastName" autoComplete="family-name" required value={form.lastName} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label htmlFor="wl-school" className="block text-sm font-medium text-gray-700 mb-1.5">School or department</label>
            <input id="wl-school" name="school" required value={form.school} onChange={handleChange} className={inputClass} placeholder="e.g., PS 123, District Office" />
          </div>
          <div>
            <label htmlFor="wl-preference" className="block text-sm font-medium text-gray-700 mb-1.5">Preferred location</label>
            <select id="wl-preference" name="preference" value={form.preference} onChange={handleChange} className={`${inputClass} bg-white`}>
              <option value="any">Any location</option>
              {events.map(event => (
                <optgroup key={event._id} label={`${event.dateLabel} · ${event.time}`}>
                  {event.locations.map(location => (
                    <option key={location._id} value={location._id}>
                      {location.name}{location.isAvailable ? ' (seats available)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {error && (
            <div className="sm:col-span-2 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-gray-900 hover:opacity-90 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              style={isValid && !submitting ? {backgroundColor: BRAND} : undefined}
            >
              {submitting && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              {submitting ? 'Joining…' : 'Join the waitlist'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
