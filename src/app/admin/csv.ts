import { LocationStat } from './types';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(raw: string | number | null | undefined) {
  let value = raw == null ? '' : String(raw);
  // Spreadsheets run cells starting with these as formulas; prefix so typed text stays text
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const lines = [columns.map(column => escapeCell(column.header)).join(',')];
  for (const row of rows) lines.push(columns.map(column => escapeCell(column.value(row))).join(','));
  return lines.join('\r\n');
}

/** Saves a CSV file; the byte-order mark makes Excel read accents (José) correctly. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function csvFilename(label: string) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `d79-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
}

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short' }) : '';

export interface RegistrationCsvRow {
  firstName: string;
  lastName: string;
  email: string;
  school: string;
  locationName: string;
  locationAddress: string;
  eventDate: string;
  eventTime: string;
  registeredAt: string;
  reminderSentAt?: string | null;
}

export const REGISTRATION_COLUMNS: CsvColumn<RegistrationCsvRow>[] = [
  { header: 'First name', value: row => row.firstName },
  { header: 'Last name', value: row => row.lastName },
  { header: 'Email', value: row => row.email },
  { header: 'School or department', value: row => row.school },
  { header: 'Crawl date', value: row => row.eventDate },
  { header: 'Time', value: row => row.eventTime },
  { header: 'Location', value: row => row.locationName },
  { header: 'Address', value: row => row.locationAddress },
  { header: 'Registered at', value: row => formatDateTime(row.registeredAt) },
  { header: 'Reminder sent', value: row => formatDateTime(row.reminderSentAt) },
];

/** Flattens location stats into one row per attendee, sorted by location then last name. */
export function registrationRows(locationStats: LocationStat[]): RegistrationCsvRow[] {
  return locationStats.flatMap(location =>
    [...location.registrations]
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
      .map(reg => ({
        firstName: reg.firstName,
        lastName: reg.lastName,
        email: reg.email,
        school: reg.school,
        locationName: location.name,
        locationAddress: location.address,
        eventDate: location.eventDate,
        eventTime: location.eventTime,
        registeredAt: reg.registeredAt,
        reminderSentAt: reg.reminderSentAt,
      }))
  );
}

export function downloadRegistrationsCsv(locationStats: LocationStat[], label: string) {
  downloadCsv(csvFilename(label), toCsv(registrationRows(locationStats), REGISTRATION_COLUMNS));
}

export interface WaitlistCsvRow {
  position: number | null;
  firstName: string;
  lastName: string;
  email: string;
  school: string;
  preferenceLabel: string;
  status: string;
  createdAt: string;
  registeredLocationName: string | null;
}

export const WAITLIST_COLUMNS: CsvColumn<WaitlistCsvRow>[] = [
  { header: 'Position', value: row => row.position ?? '' },
  { header: 'First name', value: row => row.firstName },
  { header: 'Last name', value: row => row.lastName },
  { header: 'Email', value: row => row.email },
  { header: 'School or department', value: row => row.school },
  { header: 'Preferred location', value: row => row.preferenceLabel },
  { header: 'Status', value: row => (row.status === 'registered' ? `Registered (${row.registeredLocationName ?? ''})` : 'Waiting') },
  { header: 'Joined at', value: row => formatDateTime(row.createdAt) },
];
