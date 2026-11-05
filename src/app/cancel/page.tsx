'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, Clock, MapPin, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';

const BRAND = '#ECC67F';
const BRAND_TEXT = '#9A6B12';

interface Pending {
  firstName: string;
  lastName: string;
  locationName: string;
  dateLabel: string;
  time: string;
}

export default function CancelPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Step 1 (no token): ask for the email. Steps 2–3 (token from the email link): confirm.
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
    setReady(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" aria-label="District 79 Fall Crawls home">
            <Image src="/images/d79logo.png" alt="District 79 Logo" width={140} height={98} className="object-contain h-14 w-auto" priority />
          </Link>
          <Image src="/images/nycpublicshools.png" alt="NYC Public Schools Logo" width={150} height={50} className="object-contain h-12 w-auto" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Cancel my registration</h1>

        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {!ready ? (
            <p className="text-gray-500 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading…</p>
          ) : token ? (
            <ConfirmCancellation token={token} />
          ) : (
            <RequestLink />
          )}
        </div>
      </main>
    </div>
  );
}

function RequestLink() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/cancel/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong');
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  if (message) {
    return (
      <div className="flex items-start gap-3">
        <Mail className="h-6 w-6 flex-shrink-0" style={{color: BRAND_TEXT}} />
        <div>
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-gray-600">
        Can&apos;t make it? Enter the email you registered with and we&apos;ll send you a link to cancel. Your seat goes to someone on the waitlist.
      </p>
      <label htmlFor="cancel-email" className="block text-sm font-medium text-gray-700 mt-5 mb-1.5">Work email</label>
      <input
        id="cancel-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-200"
        placeholder="your.name@schools.nyc.gov"
      />
      {error && (
        <p className="mt-3 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-start">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />{error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending || !email.trim()}
        className="mt-5 inline-flex items-center justify-center w-full px-6 py-3 rounded-xl font-bold text-gray-900 hover:opacity-90 disabled:opacity-50"
        style={{backgroundColor: BRAND}}
      >
        {sending && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
        {sending ? 'Sending…' : 'Email me a cancellation link'}
      </button>
    </form>
  );
}

function ConfirmCancellation({ token }: { token: string }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/cancel?token=${encodeURIComponent(token)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setPending(data.registration);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'This link is not valid'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCancel = async () => {
    setCancelling(true);
    setError('');
    try {
      const response = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDone(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <p className="text-gray-500 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking your link…</p>;

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
        <p className="mt-3 text-xl font-bold">Registration cancelled</p>
        <p className="mt-1 text-gray-600">{done}</p>
        <Link href="/" className="mt-6 inline-block px-6 py-3 rounded-lg font-semibold text-gray-900" style={{backgroundColor: BRAND}}>Back to home</Link>
      </div>
    );
  }

  if (!pending) {
    return (
      <div>
        <p className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-start">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />{error}
        </p>
        <Link href="/cancel" className="mt-4 inline-block text-sm underline">Request a new cancellation link</Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-700">{pending.firstName} {pending.lastName}, do you want to cancel this registration?</p>
      <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-gray-700">
        <p className="font-semibold text-gray-900">{pending.locationName}</p>
        <p className="flex items-start gap-2"><CalendarDays className="h-5 w-5 flex-shrink-0" style={{color: BRAND_TEXT}} />{pending.dateLabel}</p>
        {pending.time && <p className="flex items-start gap-2"><Clock className="h-5 w-5 flex-shrink-0" style={{color: BRAND_TEXT}} />{pending.time}</p>}
        <p className="flex items-start gap-2"><MapPin className="h-5 w-5 flex-shrink-0" style={{color: BRAND_TEXT}} />Your seat will be released to the waitlist</p>
      </div>
      {error && (
        <p className="mt-3 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">{error}</p>
      )}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          {cancelling && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
          {cancelling ? 'Cancelling…' : 'Yes, cancel my registration'}
        </button>
        <Link href="/" className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold border border-gray-300 bg-white text-gray-800 hover:bg-gray-50">
          Keep my seat
        </Link>
      </div>
    </div>
  );
}
