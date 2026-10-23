'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, Trash2, CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react';
import { BRAND, BRAND_TEXT, LocationStat } from './types';

interface WaitlistEntry {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  preference: string;
  preferenceLabel: string;
  status: 'waiting' | 'registered';
  position: number | null;
  createdAt: string;
  registeredAt: string | null;
  registeredLocationName: string | null;
}

interface WaitlistTabProps {
  cycle: number | null;
  /** Locations in the open cycle, with live seat counts */
  locationStats: LocationStat[];
  isOpenCycle: boolean;
  onChanged: () => Promise<void> | void;
  onUnauthorized: () => void;
}

export default function WaitlistTab({ cycle, locationStats, isOpenCycle, onChanged, onUnauthorized }: WaitlistTabProps) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [byPreference, setByPreference] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showRegistered, setShowRegistered] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [registering, setRegistering] = useState<WaitlistEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/waitlist${cycle ? `?cycle=${cycle}` : ''}`);
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load waitlist');
      setEntries(data.entries);
      setByPreference(data.byPreference);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load waitlist' });
    } finally {
      setLoading(false);
    }
  }, [cycle, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const waiting = entries.filter(entry => entry.status === 'waiting');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter(entry => showRegistered || entry.status === 'waiting')
      .filter(entry => !q || [entry.firstName, entry.lastName, entry.email, entry.school, entry.preferenceLabel]
        .some(value => value?.toLowerCase().includes(q)));
  }, [entries, query, showRegistered]);

  const handleRemove = async (entry: WaitlistEntry) => {
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/waitlist/${entry._id}`, { method: 'DELETE' });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove');
      setConfirmRemove(null);
      setNotice({ type: 'success', text: `Removed ${entry.firstName} ${entry.lastName} from the waitlist` });
      await load();
      await onChanged();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to remove' });
    }
  };

  const handleRegistered = async (message: string) => {
    setRegistering(null);
    setNotice({ type: 'success', text: message });
    await load();
    await onChanged();
  };

  const seatsLeft = locationStats.reduce((sum, location) => sum + location.availableSpots, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">On the waitlist</p>
          <p className="text-3xl font-bold mt-1">{waiting.length}</p>
          <p className="text-sm text-gray-500 mt-1">{seatsLeft} open {seatsLeft === 1 ? 'seat' : 'seats'} right now</p>
        </div>
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-2">Interest by preferred location</p>
          {byPreference.length === 0 ? (
            <p className="text-sm text-gray-500">Nobody is waiting yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byPreference.map(item => (
                <span key={item.label} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-50 border border-gray-200">
                  {item.label}
                  <span className="font-bold" style={{color: BRAND_TEXT}}>{item.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, school or location"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showRegistered} onChange={(e) => setShowRegistered(e.target.checked)} />
            Show people already registered
          </label>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {notice && (
          <div className={`mx-4 mt-4 p-3 rounded-lg text-sm flex items-center ${
            notice.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {notice.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50">
                <th className="py-3 px-4 font-medium">#</th>
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">School</th>
                <th className="py-3 px-4 font-medium">Preferred location</th>
                <th className="py-3 px-4 font-medium">Joined</th>
                <th className="py-3 px-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(entry => (
                <tr key={entry._id} className={`border-t border-gray-100 ${entry.status === 'registered' ? 'bg-gray-50 text-gray-500' : 'hover:bg-amber-50/40'}`}>
                  <td className="py-3 px-4 font-semibold">{entry.position ?? '—'}</td>
                  <td className="py-3 px-4 font-medium whitespace-nowrap">{entry.firstName} {entry.lastName}</td>
                  <td className="py-3 px-4">
                    <a href={`mailto:${entry.email}`} className="hover:underline" style={{color: BRAND_TEXT}}>{entry.email}</a>
                  </td>
                  <td className="py-3 px-4">{entry.school}</td>
                  <td className="py-3 px-4">{entry.preferenceLabel}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {entry.status === 'registered' ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-green-50 text-green-700">
                        Registered{entry.registeredLocationName ? ` · ${entry.registeredLocationName}` : ''}
                      </span>
                    ) : confirmRemove === entry._id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-600">Remove?</span>
                        <button onClick={() => handleRemove(entry)} className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700">Yes</button>
                        <button onClick={() => setConfirmRemove(null)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">No</button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1">
                        <button
                          onClick={() => { setNotice(null); setRegistering(entry); }}
                          disabled={!isOpenCycle}
                          className="inline-flex items-center text-xs px-2.5 py-1.5 rounded-lg font-semibold text-gray-900 hover:opacity-90 disabled:opacity-40"
                          style={{backgroundColor: BRAND}}
                          title={isOpenCycle ? 'Give this person a seat' : 'This cycle is closed'}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Register
                        </button>
                        <button
                          onClick={() => { setNotice(null); setConfirmRemove(entry._id); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove ${entry.firstName} ${entry.lastName} from the waitlist`}
                          title="Remove from waitlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    {entries.length === 0 ? 'Nobody has joined the waitlist yet' : 'No one matches these filters'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {registering && (
        <RegisterFromWaitlistModal
          entry={registering}
          locationStats={locationStats}
          onClose={() => setRegistering(null)}
          onDone={handleRegistered}
          onUnauthorized={onUnauthorized}
        />
      )}
    </div>
  );
}

function RegisterFromWaitlistModal({ entry, locationStats, onClose, onDone, onUnauthorized }: {
  entry: WaitlistEntry;
  locationStats: LocationStat[];
  onClose: () => void;
  onDone: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const preferred = locationStats.find(location => location._id === entry.preference && location.availableSpots > 0);
  const firstOpen = locationStats.find(location => location.availableSpots > 0);
  const [crawlLocation, setCrawlLocation] = useState(preferred?._id ?? firstOpen?._id ?? '');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/waitlist/${entry._id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crawlLocation, notify }),
      });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to register');
      onDone(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Register from waitlist</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-700">
          <span className="font-semibold">{entry.firstName} {entry.lastName}</span> · {entry.email}
          <br />
          Preferred: {entry.preferenceLabel}
        </p>

        <label htmlFor="wl-location" className="block text-sm font-medium text-gray-700 mt-5 mb-1">Location</label>
        <select
          id="wl-location"
          value={crawlLocation}
          onChange={(e) => setCrawlLocation(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white"
          required
        >
          <option value="" disabled>Choose a location</option>
          {locationStats.map(location => (
            <option key={location._id} value={location._id} disabled={location.availableSpots === 0}>
              {location.eventDate} · {location.name}
              {location.availableSpots === 0 ? ' (full)' : ` (${location.availableSpots} left)`}
              {location._id === entry.preference ? ' ★ preferred' : ''}
            </option>
          ))}
        </select>
        {!firstOpen && (
          <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Every location is full. To add space, raise a location&apos;s capacity under <strong>Crawl Sessions → Edit</strong>, then come back here.
          </p>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Send them the registration confirmation email
        </label>

        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !crawlLocation}
            className="text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            style={{backgroundColor: BRAND}}
          >
            {saving ? 'Registering…' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
}
