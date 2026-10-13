'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { BRAND, LocationStat, Registration } from './types';

interface EditRegistrationModalProps {
  registration: Registration;
  currentLocationId: string;
  locationStats: LocationStat[];
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
}

export default function EditRegistrationModal({
  registration, currentLocationId, locationStats, onClose, onSaved, onUnauthorized,
}: EditRegistrationModalProps) {
  const [firstName, setFirstName] = useState(registration.firstName);
  const [lastName, setLastName] = useState(registration.lastName);
  const [email, setEmail] = useState(registration.email);
  const [school, setSchool] = useState(registration.school);
  const [crawlLocation, setCrawlLocation] = useState(currentLocationId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/registrations/${registration._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, school, crawlLocation }),
      });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save registration');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save registration');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-200';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Edit Registration</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="regFirstName" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input id="regFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label htmlFor="regLastName" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input id="regLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} required />
            </div>
          </div>
          <div>
            <label htmlFor="regEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="regEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="regSchool" className="block text-sm font-medium text-gray-700 mb-1">School / Department</label>
            <input id="regSchool" value={school} onChange={(e) => setSchool(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="regLocation" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              id="regLocation"
              value={crawlLocation}
              onChange={(e) => setCrawlLocation(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {locationStats.map(location => {
                const isCurrent = location._id === currentLocationId;
                const isFull = location.availableSpots === 0 && !isCurrent;
                return (
                  <option key={location._id} value={location._id} disabled={isFull}>
                    {location.eventDate} · {location.name}
                    {isCurrent ? ' (current)' : isFull ? ' (full)' : ` (${location.availableSpots} left)`}
                  </option>
                );
              })}
            </select>
          </div>
          <p className="text-xs text-gray-500">No email is sent to the attendee when you save changes.</p>
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
