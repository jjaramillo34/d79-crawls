'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { BRAND } from './types';

export interface EditableSession {
  _id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  isActive: boolean;
  locations: { _id: string; name: string; maxCapacity: number; registrationCount: number }[];
}

interface EditSessionModalProps {
  session: EditableSession;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
}

export default function EditSessionModal({ session, onClose, onSaved, onUnauthorized }: EditSessionModalProps) {
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(session.time);
  const [description, setDescription] = useState(session.description);
  const [capacities, setCapacities] = useState<Record<string, string>>(
    Object.fromEntries(session.locations.map(location => [location._id, String(location.maxCapacity)]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const locations = session.locations.map(location => ({
      _id: location._id,
      maxCapacity: Number(capacities[location._id]),
    }));
    const tooSmall = session.locations.find(location => Number(capacities[location._id]) < location.registrationCount);
    if (tooSmall) {
      setError(`${tooSmall.name} already has ${tooSmall.registrationCount} registrations; capacity can't be lower than that.`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/crawls/${session._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, description, locations }),
      });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save session');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-200';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Edit Session</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="sessionTitle" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input id="sessionTitle" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sessionDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input id="sessionDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label htmlFor="sessionTime" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input id="sessionTime" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} placeholder="10:00 AM - 12:00 PM" required />
            </div>
          </div>
          {session.isActive && (
            <p className="text-xs text-gray-500 -mt-2">This session is open for registration, so its date must stay in the same year.</p>
          )}
          <div>
            <label htmlFor="sessionDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="sessionDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Shown in confirmation emails"
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Location capacity</p>
            <div className="space-y-2">
              {session.locations.map(location => (
                <div key={location._id} className="flex items-center justify-between gap-3">
                  <label htmlFor={`cap-${location._id}`} className="text-sm text-gray-700">
                    {location.name}
                    {location.registrationCount > 0 && (
                      <span className="text-xs text-gray-500"> · {location.registrationCount} registered</span>
                    )}
                  </label>
                  <input
                    id={`cap-${location._id}`}
                    type="number"
                    min={Math.max(1, location.registrationCount)}
                    max={1000}
                    value={capacities[location._id]}
                    onChange={(e) => setCapacities(prev => ({ ...prev, [location._id]: e.target.value }))}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-right outline-none focus:ring-2 focus:ring-amber-200"
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
            style={{backgroundColor: BRAND}}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
