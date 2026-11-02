'use client';

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, MapPin, ListPlus } from 'lucide-react';
import { downloadParticipantsPDF, downloadSummaryPDF } from '@/lib/pdf-utils';
import { BRAND, BRAND_TEXT, DashboardEvent, LocationStat, locationsForEvent } from './types';
import { csvFilename, downloadCsv, downloadRegistrationsCsv, toCsv, WAITLIST_COLUMNS, WaitlistCsvRow } from './csv';

interface ReportsTabProps {
  locationStats: LocationStat[];
  events: DashboardEvent[];
  cycle: number | null;
  onUnauthorized: () => void;
}

// "District 79 Fall Crawls - Brooklyn" -> "Brooklyn"
const sessionName = (title: string) => title.replace(/^District 79 Fall Crawls\s*-\s*/i, '') || title;

function downloadSummaryCsv(locationStats: LocationStat[]) {
  downloadCsv(csvFilename('summary'), toCsv(locationStats, [
    { header: 'Location', value: location => location.name },
    { header: 'Crawl date', value: location => location.eventDate },
    { header: 'Time', value: location => location.eventTime },
    { header: 'Registered', value: location => location.registrationCount },
    { header: 'Capacity', value: location => location.maxCapacity },
    { header: 'Seats left', value: location => location.availableSpots },
  ]));
}

export default function ReportsTab({ locationStats, events, cycle, onUnauthorized }: ReportsTabProps) {
  const [waitlistState, setWaitlistState] = useState<'idle' | 'loading' | 'error'>('idle');
  const total = locationStats.reduce((sum, location) => sum + location.registrationCount, 0);

  const downloadWaitlistCsv = async () => {
    setWaitlistState('loading');
    try {
      const response = await fetch(`/api/admin/waitlist${cycle ? `?cycle=${cycle}` : ''}`);
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      downloadCsv(csvFilename('waitlist'), toCsv<WaitlistCsvRow>(data.entries, WAITLIST_COLUMNS));
      setWaitlistState('idle');
    } catch {
      setWaitlistState('error');
    }
  };

  const reports = [
    {
      key: 'all',
      title: 'All registrations',
      description: `Every registration in this cycle (${total})`,
      pdf: () => downloadParticipantsPDF(locationStats, 'All events'),
      csv: () => downloadRegistrationsCsv(locationStats, 'all-registrations'),
    },
    ...events.map(event => {
      const locations = locationsForEvent(locationStats, event._id);
      return {
        key: event._id,
        title: sessionName(event.title),
        description: `${event.dateLabel} · ${event.time} · ${locations.reduce((sum, l) => sum + l.registrationCount, 0)} registered`,
        pdf: () => downloadParticipantsPDF(locations, `${event.dateLabel} - ${sessionName(event.title)}`),
        csv: () => downloadRegistrationsCsv(locations, `${sessionName(event.title)}-registrations`),
      };
    }),
    {
      key: 'summary',
      title: 'Summary',
      description: 'Totals and seats left for each location',
      pdf: () => downloadSummaryPDF(locationStats),
      csv: () => downloadSummaryCsv(locationStats),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => (
          <div key={report.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
            <span className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{backgroundColor: `${BRAND}33`}}>
              <FileText className="h-5 w-5" style={{color: BRAND_TEXT}} />
            </span>
            <p className="font-semibold text-gray-900">{report.title}</p>
            <p className="text-sm text-gray-500 mb-4">{report.description}</p>
            <div className="mt-auto flex gap-2">
              <DownloadButton label="PDF" icon="pdf" onClick={report.pdf} />
              <DownloadButton label="CSV" icon="csv" onClick={report.csv} />
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <span className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{backgroundColor: `${BRAND}33`}}>
            <ListPlus className="h-5 w-5" style={{color: BRAND_TEXT}} />
          </span>
          <p className="font-semibold text-gray-900">Waitlist</p>
          <p className="text-sm text-gray-500 mb-4">Everyone on the waitlist, in sign-up order, with their preferred location</p>
          <div className="mt-auto flex items-center gap-2">
            <DownloadButton label={waitlistState === 'loading' ? 'Preparing…' : 'CSV'} icon="csv" onClick={downloadWaitlistCsv} disabled={waitlistState === 'loading'} />
            {waitlistState === 'error' && <span className="text-xs text-red-600">Couldn&apos;t load the waitlist</span>}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        CSV files open in Excel or Google Sheets. They include name, email, school, crawl date and time, location, when each person registered, and when their reminder was sent.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="px-5 py-4 font-semibold text-gray-900 border-b border-gray-200">By location</h3>
        <ul className="divide-y divide-gray-100">
          {locationStats.map(location => (
            <li key={location._id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-start min-w-0">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" style={{color: BRAND_TEXT}} />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{location.name}</p>
                  <p className="text-xs text-gray-500">{location.eventDate} · {location.eventTime} · {location.registrationCount} / {location.maxCapacity} registered</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <DownloadButton label="PDF" icon="pdf" onClick={() => downloadParticipantsPDF([location], location.name)} disabled={location.registrationCount === 0} />
                <DownloadButton label="CSV" icon="csv" onClick={() => downloadRegistrationsCsv([location], location.name)} disabled={location.registrationCount === 0} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DownloadButton({ label, icon, onClick, disabled = false }: { label: string; icon: 'pdf' | 'csv'; onClick: () => void; disabled?: boolean }) {
  const Icon = icon === 'csv' ? FileSpreadsheet : Download;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center text-sm px-3 py-1.5 rounded-lg border hover:bg-amber-50 disabled:opacity-40 whitespace-nowrap"
      style={{borderColor: BRAND, color: BRAND_TEXT}}
    >
      <Icon className="h-4 w-4 mr-1" />
      {label}
    </button>
  );
}
