'use client';

import { useMemo, useState } from 'react';
import { Search, Pencil, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { BRAND_TEXT, DashboardEvent, LocationStat, Registration } from './types';
import EditRegistrationModal from './EditRegistrationModal';

interface RegistrationsTabProps {
  locationStats: LocationStat[];
  events: DashboardEvent[];
  onChanged: () => Promise<void> | void;
  onUnauthorized: () => void;
}

type SortKey = 'name' | 'school' | 'location' | 'registeredAt';

export default function RegistrationsTab({ locationStats, events, onChanged, onUnauthorized }: RegistrationsTabProps) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ registration: Registration; locationId: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [eventId, setEventId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const rows = useMemo(() => locationStats.flatMap(location =>
    location.registrations.map(reg => ({
      ...reg,
      locationId: location._id,
      locationName: location.name,
      eventDate: location.eventDate,
      eventId: location.eventId,
    }))
  ), [locationStats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(row => eventId === 'all' || row.eventId === eventId)
      .filter(row => locationId === 'all' || row.locationId === locationId)
      .filter(row => !q || [row.firstName, row.lastName, row.email, row.school]
        .some(value => value?.toLowerCase().includes(q)))
      .sort((a, b) => {
        switch (sortKey) {
          case 'school': return (a.school || '').localeCompare(b.school || '');
          case 'location': return a.locationName.localeCompare(b.locationName) || a.lastName.localeCompare(b.lastName);
          case 'registeredAt': return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
          default: return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        }
      });
  }, [rows, query, eventId, locationId, sortKey]);

  const handleDelete = async (registration: Registration) => {
    setDeleting(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/registrations/${registration._id}`, { method: 'DELETE' });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete registration');
      setConfirmDelete(null);
      setNotice({ type: 'success', text: `Deleted registration for ${registration.firstName} ${registration.lastName}` });
      await onChanged();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete registration' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = async () => {
    const name = editing ? `${editing.registration.firstName} ${editing.registration.lastName}` : 'attendee';
    setEditing(null);
    setNotice({ type: 'success', text: `Updated registration for ${name}` });
    await onChanged();
  };

  const visibleLocations = locationStats.filter(location => eventId === 'all' || location.eventId === eventId);

  const SortHeader = ({ label, value }: { label: string; value: SortKey }) => (
    <th className="py-3 px-4 font-medium">
      <button
        onClick={() => setSortKey(value)}
        className={`hover:text-gray-900 ${sortKey === value ? 'text-gray-900' : ''}`}
      >
        {label}{sortKey === value ? ' ↓' : ''}
      </button>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email or school"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <select
          value={eventId}
          onChange={(e) => { setEventId(e.target.value); setLocationId('all'); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
          aria-label="Filter by session"
        >
          <option value="all">All sessions</option>
          {events.map(event => (
            <option key={event._id} value={event._id}>{event.dateLabel} · {event.title}</option>
          ))}
        </select>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
          aria-label="Filter by location"
        >
          <option value="all">All locations</option>
          {visibleLocations.map(location => (
            <option key={location._id} value={location._id}>{location.name}</option>
          ))}
        </select>
      </div>

      {notice && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm flex items-center ${
          notice.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notice.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
        Showing {filtered.length} of {rows.length} attendees
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 bg-gray-50">
              <SortHeader label="Name" value="name" />
              <th className="py-3 px-4 font-medium">Email</th>
              <SortHeader label="School" value="school" />
              <SortHeader label="Location" value="location" />
              <SortHeader label="Registered" value="registeredAt" />
              <th className="py-3 px-4"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row._id || `${row.locationId}-${row.email}-${index}`} className="border-t border-gray-100 hover:bg-amber-50/40">
                <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{row.firstName} {row.lastName}</td>
                <td className="py-3 px-4">
                  <a href={`mailto:${row.email}`} className="hover:underline" style={{color: BRAND_TEXT}}>{row.email}</a>
                </td>
                <td className="py-3 px-4 text-gray-700">{row.school}</td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="text-gray-900">{row.locationName}</div>
                  <div className="text-xs text-gray-500">{row.eventDate}</div>
                </td>
                <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                  {row.registeredAt ? new Date(row.registeredAt).toLocaleDateString() : '—'}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  {confirmDelete === row._id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-600">Delete?</span>
                      <button
                        onClick={() => handleDelete(row)}
                        disabled={deleting}
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting ? 'Deleting…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex gap-1">
                      <button
                        onClick={() => { setNotice(null); setEditing({ registration: row, locationId: row.locationId }); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        title="Edit registration"
                        aria-label={`Edit registration for ${row.firstName} ${row.lastName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setNotice(null); setConfirmDelete(row._id); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete registration"
                        aria-label={`Delete registration for ${row.firstName} ${row.lastName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">No attendees match these filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditRegistrationModal
          registration={editing.registration}
          currentLocationId={editing.locationId}
          locationStats={locationStats}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onUnauthorized={onUnauthorized}
        />
      )}
    </div>
  );
}
