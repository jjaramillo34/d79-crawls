'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Info } from 'lucide-react';

// Chart marks use a darker step of the brand gold: it clears 3:1 against white
// (the brand #ECC67F does not), checked with the dataviz palette validator.
const MARK = '#B07D1A';
const MARK_HOVER = '#8F6212';
// "Not identified" is context, not data: de-emphasis gray
const MUTED_MARK = '#CFCDC6';
const GRID = '#E5E7EB';
// Sequential gold ramp for the borough × location grid (light = fewer, dark = more)
const HEAT = ['#FBF1DC', '#F2D9A6', '#E2B865', '#C08A2A', '#8F6212'];
const NOT_IDENTIFIED = 'Not identified';

interface Row { label: string; count: number }

interface AnalyticsData {
  cycle: number;
  total: number;
  schoolCount: number;
  boroughIdentified: number;
  waitlistCount: number;
  peakDay: { date: string; count: number } | null;
  timeline: { date: string; count: number }[];
  byBorough: Row[];
  bySchoolType: Row[];
  matrix: { locations: string[]; rows: { borough: string; counts: number[] }[] };
  schools: { name: string; count: number; borough: string; locations: { name: string; count: number }[] }[];
}

interface AnalyticsTabProps {
  cycle: number | null;
  onUnauthorized: () => void;
}

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
const longDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
const shortLocation = (name: string) => name.replace(/\s+Referral Center$/i, '');
const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default function AnalyticsTab({ cycle, onUnauthorized }: AnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/analytics${cycle ? `?cycle=${cycle}` : ''}`);
      if (response.status === 401) return onUnauthorized();
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to load analytics');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [cycle, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <p className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-gray-500">Loading analytics…</p>;
  }

  return (
    // Refetch keeps the previous render, dimmed, instead of flashing a loader
    <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Registrations" value={data.total.toLocaleString()} />
        <StatTile label="Schools and offices" value={data.schoolCount.toLocaleString()} note="Grouped from what people typed" />
        <StatTile label="On the waitlist" value={data.waitlistCount.toLocaleString()} />
        <StatTile
          label="Busiest sign-up day"
          value={data.peakDay ? shortDate(data.peakDay.date) : '—'}
          note={data.peakDay ? `${data.peakDay.count} sign-ups` : undefined}
        />
      </div>

      <Card title="Sign-ups per day" subtitle="When people registered (New York time)">
        <Timeline days={data.timeline} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card
          title="Home borough"
          subtitle={`Estimated from school codes and names · identified for ${data.boroughIdentified} of ${data.total} (${percent(data.boroughIdentified, data.total)}%)`}
        >
          <BarList
            rows={data.byBorough.filter(row => row.label !== NOT_IDENTIFIED)}
            total={data.boroughIdentified}
            percentOf="of identified"
          />
          {data.total > data.boroughIdentified && (
            <p className="mt-4 text-sm text-gray-500">
              Not identified: {data.total - data.boroughIdentified} ({percent(data.total - data.boroughIdentified, data.total)}% of registrations)
            </p>
          )}
        </Card>
        <Card title="School type" subtitle="Estimated from what people typed as their school">
          <BarList rows={data.bySchoolType} total={data.total} />
        </Card>
      </div>

      <Card title="Home borough → crawl location" subtitle="Do people visit a site in their own borough? Rows are home boroughs (estimated).">
        <Matrix matrix={data.matrix} />
      </Card>

      <Card title="Top schools and departments" subtitle="Spelling variants are grouped (e.g. “Brooklyn Frontiers HS” and “Brooklyn Frontiers High School”)">
        <BarList rows={data.schools.slice(0, 10).map(school => ({ label: school.name, count: school.count }))} total={data.total} wideLabels />
        <SchoolTable schools={data.schools} />
      </Card>

      <p className="flex items-start gap-2 text-xs text-gray-500">
        <Info className="h-4 w-4 flex-shrink-0" />
        The sign-up form doesn&apos;t ask for borough or school type, so those figures are estimated from the free-text school field.
        School codes like 24Q019 are the most reliable clue; anything that can&apos;t be placed is counted as “Not identified”.
      </p>
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Horizontal bars, value at the tip; "Not identified" recedes in gray. */
function BarList({ rows, total, wideLabels = false, percentOf }: { rows: Row[]; total: number; wideLabels?: boolean; percentOf?: string }) {
  const max = Math.max(1, ...rows.map(row => row.count));
  if (rows.length === 0) return <p className="text-sm text-gray-500">No registrations yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map(row => (
        <li key={row.label} className={`grid items-center gap-x-3 gap-y-1 grid-cols-1 ${wideLabels ? 'sm:grid-cols-[minmax(0,14rem)_1fr]' : 'sm:grid-cols-[9.5rem_1fr]'}`}>
          <span className={`text-sm truncate ${row.label === NOT_IDENTIFIED ? 'text-gray-500' : 'text-gray-800'}`} title={row.label}>
            {row.label}
          </span>
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="h-3.5 rounded-r-[4px] shrink-0"
              style={{
                width: row.count === 0 ? 0 : `max(4px, calc((100% - ${percentOf ? '9.5rem' : '5.5rem'}) * ${row.count / max}))`,
                backgroundColor: row.label === NOT_IDENTIFIED ? MUTED_MARK : MARK,
              }}
            />
            <span className="text-sm text-gray-700 tabular-nums whitespace-nowrap">
              {row.count} <span className="text-gray-400">· {percent(row.count, total)}%{percentOf ? ` ${percentOf}` : ''}</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Daily columns with a hover/focus tooltip; the peak is the only direct label. */
function Timeline({ days }: { days: { date: string; count: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  if (days.length === 0) return <p className="text-sm text-gray-500">No sign-ups yet.</p>;

  const max = Math.max(...days.map(day => day.count));
  const step = max <= 10 ? 5 : max <= 50 ? 10 : 25;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [0, top / 2, top];
  const peakIndex = days.findIndex(day => day.count === max);
  // Fewer date labels on narrow screens so they don't run together
  const labelEvery = Math.max(1, Math.ceil(days.length / 10));
  const labelEveryNarrow = Math.max(1, Math.ceil(days.length / 4));
  const PLOT = 176;

  return (
    <div>
      <div className="relative pl-8">
        {/* Gridlines + y ticks */}
        {ticks.map(tick => (
          <div key={tick} className="absolute left-8 right-0 flex items-center" style={{ top: PLOT - (tick / top) * PLOT }}>
            <span className="absolute -left-8 w-6 text-right text-[11px] text-gray-400 tabular-nums -translate-y-1/2">{tick}</span>
            <span className="w-full -translate-y-1/2" style={{ borderTop: `1px solid ${GRID}` }} />
          </div>
        ))}

        <div className="relative flex items-end gap-[2px]" style={{ height: PLOT }}>
          {days.map((day, i) => (
            <button
              key={day.date}
              type="button"
              className="relative flex-1 h-full flex items-end justify-center outline-none focus-visible:bg-amber-50 rounded"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${longDate(day.date)}: ${day.count} sign-ups`}
            >
              {i === peakIndex && max > 0 && (
                <span className="absolute text-xs font-semibold text-gray-800" style={{ bottom: (day.count / top) * PLOT + 4 }}>
                  {day.count}
                </span>
              )}
              <span
                className="w-full max-w-[24px] rounded-t-[4px]"
                style={{
                  height: day.count === 0 ? 0 : Math.max(2, (day.count / top) * PLOT),
                  backgroundColor: active === i ? MARK_HOVER : MARK,
                }}
              />
              {active === i && (
                <span
                  role="tooltip"
                  className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white border border-gray-200 shadow-md px-3 py-2 text-left pointer-events-none"
                >
                  <span className="block text-sm font-semibold text-gray-900">{day.count} sign-up{day.count === 1 ? '' : 's'}</span>
                  <span className="block text-xs text-gray-500">{longDate(day.date)}</span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* X axis */}
        <div className="flex gap-[2px] mt-1.5" style={{ borderTop: `1px solid ${GRID}` }}>
          {days.map((day, i) => (
            <span key={day.date} className="flex-1 text-center text-[11px] text-gray-500 pt-1 whitespace-nowrap overflow-visible">
              {(i % labelEvery === 0 || i === days.length - 1) && (
                <span className={i % labelEveryNarrow === 0 ? '' : 'hidden sm:inline'}>{shortDate(day.date)}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => setShowTable(!showTable)} className="mt-4 text-xs font-medium underline text-gray-600 hover:text-gray-900">
        {showTable ? 'Hide table' : 'View as table'}
      </button>
      {showTable && (
        <table className="mt-2 text-sm">
          <tbody>
            {days.map(day => (
              <tr key={day.date} className="border-t border-gray-100">
                <td className="py-1 pr-6 text-gray-600">{longDate(day.date)}</td>
                <td className="py-1 text-right tabular-nums font-medium">{day.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Home borough × crawl location, shaded light → dark by count, with the number in each cell. */
function Matrix({ matrix }: { matrix: AnalyticsData['matrix'] }) {
  // Shade by the identified rows only, so the large "Not identified" row doesn't wash them out
  const max = Math.max(1, ...matrix.rows.filter(row => row.borough !== NOT_IDENTIFIED).flatMap(row => row.counts));
  const step = (n: number) => (n === 0 ? -1 : Math.min(HEAT.length - 1, Math.floor(((Math.min(n, max) - 1) / max) * HEAT.length)));
  if (matrix.rows.length === 0) return <p className="text-sm text-gray-500">No registrations yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="text-left font-medium text-gray-500 pr-3 pb-1">Home borough</th>
            {matrix.locations.map(location => (
              <th key={location} className="font-medium text-gray-500 px-2 pb-1 text-center whitespace-nowrap">{shortLocation(location)}</th>
            ))}
            <th className="font-medium text-gray-500 px-2 pb-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map(row => (
            <tr key={row.borough}>
              <td className={`pr-3 whitespace-nowrap ${row.borough === NOT_IDENTIFIED ? 'text-gray-500' : 'text-gray-800'}`}>{row.borough}</td>
              {row.counts.map((n, i) => {
                const s = step(n);
                const unknown = row.borough === NOT_IDENTIFIED;
                return (
                  <td
                    key={matrix.locations[i]}
                    className="w-20 h-9 text-center tabular-nums rounded"
                    style={{
                      // The unknown row is context, so it stays gray rather than competing with the gold
                      backgroundColor: s < 0 ? '#F9FAFB' : unknown ? '#EEEDEA' : HEAT[s],
                      color: s < 0 ? '#9CA3AF' : unknown ? '#4B5563' : s >= 3 ? '#ffffff' : '#1F2937',
                    }}
                    title={`${row.borough} → ${matrix.locations[i]}: ${n}`}
                  >
                    {n === 0 ? '·' : n}
                  </td>
                );
              })}
              <td className="px-2 text-right tabular-nums font-medium text-gray-800">{row.counts.reduce((a, b) => a + b, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>Fewer</span>
        {HEAT.map(color => <span key={color} className="w-5 h-3 rounded-sm" style={{ backgroundColor: color }} />)}
        <span>More</span>
      </div>
    </div>
  );
}

function SchoolTable({ schools }: { schools: AnalyticsData['schools'] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? schools.filter(school => school.name.toLowerCase().includes(q) || school.borough.toLowerCase().includes(q)) : schools;
  }, [schools, query]);

  return (
    <div className="mt-5">
      <button type="button" onClick={() => setOpen(!open)} className="text-xs font-medium underline text-gray-600 hover:text-gray-900">
        {open ? 'Hide full list' : `Show all ${schools.length} schools and departments`}
      </button>
      {open && (
        <div className="mt-3">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search school or borough"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50">
                  <th className="py-2 px-3 font-medium">School or department</th>
                  <th className="py-2 px-3 font-medium text-right">Registered</th>
                  <th className="py-2 px-3 font-medium">Home borough (est.)</th>
                  <th className="py-2 px-3 font-medium">Attending</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(school => (
                  <tr key={school.name} className="border-t border-gray-100">
                    <td className="py-2 px-3 text-gray-900">{school.name}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{school.count}</td>
                    <td className={`py-2 px-3 ${school.borough === NOT_IDENTIFIED ? 'text-gray-400' : 'text-gray-700'}`}>{school.borough}</td>
                    <td className="py-2 px-3 text-gray-600">
                      {school.locations.map(location => `${shortLocation(location.name)}${location.count > 1 ? ` (${location.count})` : ''}`).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
