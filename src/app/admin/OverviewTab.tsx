'use client';

import { Users, Armchair, Percent, MapPin, Calendar } from 'lucide-react';
import { BRAND, BRAND_TEXT, DashboardEvent, LocationStat, locationsForEvent } from './types';

interface OverviewTabProps {
  totalRegistrations: number;
  locationStats: LocationStat[];
  events: DashboardEvent[];
}

export default function OverviewTab({ totalRegistrations, locationStats, events }: OverviewTabProps) {
  const totalCapacity = locationStats.reduce((sum, location) => sum + location.maxCapacity, 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;
  const fullLocations = locationStats.filter(location => location.availableSpots === 0).length;

  const stats = [
    { label: 'Registrations', value: totalRegistrations, icon: Users },
    { label: 'Total seats', value: totalCapacity, icon: Armchair },
    { label: 'Filled', value: `${fillRate}%`, icon: Percent },
    { label: 'Locations full', value: `${fullLocations} / ${locationStats.length}`, icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{backgroundColor: `${BRAND}33`}}>
                <Icon className="h-5 w-5" style={{color: BRAND_TEXT}} />
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {events.length === 0 && (
          <p className="text-sm text-gray-500">No sessions in this cycle.</p>
        )}
        {events.map(event => {
          const locations = locationsForEvent(locationStats, event._id);
          const registered = locations.reduce((sum, location) => sum + location.registrationCount, 0);
          const capacity = locations.reduce((sum, location) => sum + location.maxCapacity, 0);

          return (
            <div key={event._id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" style={{color: BRAND_TEXT}} />
                    {event.dateLabel}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 ml-6">{event.title} · {event.time}</p>
                </div>
                <span className="text-sm text-gray-500">{registered} / {capacity} seats</span>
              </div>

              <div className="space-y-4">
                {locations.map(location => {
                  const percent = location.maxCapacity > 0
                    ? Math.min(100, Math.round((location.registrationCount / location.maxCapacity) * 100))
                    : 0;
                  const isFull = location.availableSpots === 0;
                  return (
                    <div key={location._id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800">{location.name}</span>
                        <span className={isFull ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {location.registrationCount} / {location.maxCapacity}
                          {isFull ? ' · Full' : ` · ${location.availableSpots} left`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: isFull ? '#DC2626' : BRAND }}
                        />
                      </div>
                    </div>
                  );
                })}
                {locations.length === 0 && <p className="text-sm text-gray-500">No locations</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
