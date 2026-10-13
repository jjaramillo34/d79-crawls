'use client';

import { Download, FileText, MapPin } from 'lucide-react';
import { downloadParticipantsPDF, downloadSummaryPDF } from '@/lib/pdf-utils';
import { BRAND, BRAND_TEXT, DashboardEvent, LocationStat, locationsForEvent } from './types';

interface ReportsTabProps {
  locationStats: LocationStat[];
  events: DashboardEvent[];
}

export default function ReportsTab({ locationStats, events }: ReportsTabProps) {
  const reports = [
    { key: 'summary', title: 'Summary', description: 'Registration totals by session and location', action: () => downloadSummaryPDF(locationStats) },
    ...events.map(event => ({
      key: event._id,
      title: event.dateLabel,
      description: `Sign-in sheets for ${event.title}`,
      action: () => downloadParticipantsPDF(locationsForEvent(locationStats, event._id), `${event.dateLabel} - ${event.title}`),
    })),
    { key: 'all', title: 'All attendees', description: 'Every registration in this cycle', action: () => downloadParticipantsPDF(locationStats, 'All events') },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map(report => (
          <button
            key={report.key}
            onClick={report.action}
            className="text-left bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-amber-300 hover:shadow transition group"
          >
            <span className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{backgroundColor: `${BRAND}33`}}>
              <FileText className="h-5 w-5" style={{color: BRAND_TEXT}} />
            </span>
            <p className="font-semibold text-gray-900">{report.title}</p>
            <p className="text-sm text-gray-500 mb-3">{report.description}</p>
            <span className="inline-flex items-center text-sm font-medium" style={{color: BRAND_TEXT}}>
              <Download className="h-4 w-4 mr-1" />
              Download PDF
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="px-5 py-4 font-semibold text-gray-900 border-b border-gray-200">By location</h3>
        <ul className="divide-y divide-gray-100">
          {locationStats.map(location => (
            <li key={location._id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />
                <div>
                  <p className="font-medium text-gray-900">{location.name}</p>
                  <p className="text-xs text-gray-500">{location.eventDate} · {location.registrationCount} / {location.maxCapacity} registered</p>
                </div>
              </div>
              <button
                onClick={() => downloadParticipantsPDF([location], location.name)}
                disabled={location.registrationCount === 0}
                className="flex items-center text-sm px-3 py-1.5 rounded-lg border hover:bg-amber-50 disabled:opacity-40 whitespace-nowrap"
                style={{borderColor: BRAND, color: BRAND_TEXT}}
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
