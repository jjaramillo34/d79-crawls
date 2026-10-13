'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BRAND_TEXT, CrawlDay, LocationStat, locationDay } from './types';

interface RegistrationsTabProps {
  locationStats: LocationStat[];
}

type SortKey = 'name' | 'school' | 'location' | 'registeredAt';

export default function RegistrationsTab({ locationStats }: RegistrationsTabProps) {
  const [query, setQuery] = useState('');
  const [day, setDay] = useState<CrawlDay | 'all'>('all');
  const [locationId, setLocationId] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const rows = useMemo(() => locationStats.flatMap(location =>
    location.registrations.map(reg => ({
      ...reg,
      locationId: location._id,
      locationName: location.name,
      eventDate: location.eventDate,
      day: locationDay(location),
    }))
  ), [locationStats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(row => day === 'all' || row.day === day)
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
  }, [rows, query, day, locationId, sortKey]);

  const visibleLocations = locationStats.filter(location => day === 'all' || locationDay(location) === day);

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
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {(['all', 'tuesday', 'thursday'] as const).map(value => (
            <button
              key={value}
              onClick={() => { setDay(value); setLocationId('all'); }}
              className={`px-3 py-2 capitalize ${day === value ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {value === 'all' ? 'All days' : value}
            </button>
          ))}
        </div>
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
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={`${row.locationId}-${row.email}-${index}`} className="border-t border-gray-100 hover:bg-amber-50/40">
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
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500">No attendees match these filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
