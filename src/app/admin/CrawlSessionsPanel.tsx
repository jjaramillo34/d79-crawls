'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Copy, X, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const DEFAULT_TARGET_DATE = '2026-11-06';

interface CrawlSession {
  _id: string;
  title: string;
  date: string;
  time: string;
  isActive: boolean;
  clonedFromEventId: string | null;
  locations: { _id: string; name: string; borough?: string; maxCapacity: number; registrationCount: number }[];
  totalCapacity: number;
  registrationCount: number;
}

interface ClonePlan {
  summary: {
    sourceYear: number;
    targetDate: string;
    sessionsToCreate: number;
    sessionsAlreadyCloned: number;
    slotsToCreate: number;
    capacityToCreate: number;
  };
  plan: {
    sourceEventId: string;
    title: string;
    sourceDate: string;
    time: string;
    alreadyCloned: boolean;
    locations: { name: string; maxCapacity: number }[];
    totalCapacity: number;
  }[];
}

interface CrawlSessionsPanelProps {
  onUnauthorized: () => void;
}

export default function CrawlSessionsPanel({ onUnauthorized }: CrawlSessionsPanelProps) {
  const [sessions, setSessions] = useState<CrawlSession[]>([]);
  const [sourceYears, setSourceYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [sourceYear, setSourceYear] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState(DEFAULT_TARGET_DATE);
  const [preview, setPreview] = useState<ClonePlan | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');
  const [cloneSuccess, setCloneSuccess] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/admin/crawls');
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load crawl sessions');
      setSessions(data.sessions);
      setSourceYears(data.sourceYears);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load crawl sessions');
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Refresh the confirmation summary whenever the inputs change
  useEffect(() => {
    if (!showModal || sourceYear === null || !targetDate) return;

    let cancelled = false;
    setPreviewLoading(true);
    setCloneError('');

    fetch('/api/admin/crawls/clone-season', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceYear, targetDate, dryRun: true }),
    })
      .then(async response => {
        if (response.status === 401) return onUnauthorized();
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setPreview(null);
          setCloneError(data.error || 'Failed to build clone preview');
        } else {
          setPreview(data);
        }
      })
      .catch(() => !cancelled && setCloneError('Failed to build clone preview'))
      .finally(() => !cancelled && setPreviewLoading(false));

    return () => {
      cancelled = true;
    };
  }, [showModal, sourceYear, targetDate, onUnauthorized]);

  const openModal = () => {
    setSourceYear(sourceYears[0] ?? null);
    setTargetDate(DEFAULT_TARGET_DATE);
    setPreview(null);
    setCloneError('');
    setCloneSuccess('');
    setShowModal(true);
  };

  const handleClone = async () => {
    if (sourceYear === null) return;
    setCloning(true);
    setCloneError('');
    setCloneSuccess('');

    try {
      const response = await fetch('/api/admin/crawls/clone-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceYear, targetDate }),
      });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to clone schedule');

      setCloneSuccess(data.message);
      setPreview(null);
      await loadSessions();
      setShowModal(false);
    } catch (error) {
      setCloneError(error instanceof Error ? error.message : 'Failed to clone schedule');
    } finally {
      setCloning(false);
    }
  };

  const nothingToCreate = preview !== null && preview.summary.sessionsToCreate === 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2" style={{borderColor: '#ECC67F'}}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{color: '#ECC67F'}}>Crawl Sessions</h2>
        <div className="flex space-x-2">
          <button
            onClick={loadSessions}
            disabled={loading}
            className="flex items-center text-sm px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            style={{borderColor: '#ECC67F', color: '#ECC67F'}}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openModal}
            disabled={sourceYears.length === 0}
            className="flex items-center text-white px-4 py-2 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{backgroundColor: '#ECC67F'}}
          >
            <Copy className="h-4 w-4 mr-2" />
            Clone Schedule / New Cycle
          </button>
        </div>
      </div>

      {cloneSuccess && (
        <div className="mb-4 p-3 rounded text-sm bg-green-50 text-green-800 border border-green-200 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span>{cloneSuccess}</span>
        </div>
      )}

      {loadError && (
        <div className="mb-4 p-3 rounded text-sm bg-red-50 text-red-800 border border-red-200 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Session</th>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Locations</th>
              <th className="py-2 pr-4 text-right">Registered / Capacity</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(session => (
              <tr key={session._id} className="border-b last:border-0 align-top">
                <td className="py-3 pr-4 whitespace-nowrap font-semibold">{session.date}</td>
                <td className="py-3 pr-4">
                  {session.title}
                  {session.clonedFromEventId && <span className="ml-2 text-xs text-gray-500">(cloned)</span>}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">{session.time}</td>
                <td className="py-3 pr-4 text-gray-600">
                  {session.locations.map(location => (
                    <div key={location._id}>{location.name} ({location.maxCapacity})</div>
                  ))}
                </td>
                <td className="py-3 pr-4 text-right whitespace-nowrap">
                  {session.registrationCount} / {session.totalCapacity}
                </td>
                <td className="py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    session.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {session.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">No crawl sessions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border-2 max-h-[90vh] overflow-y-auto" style={{borderColor: '#ECC67F'}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{color: '#ECC67F'}}>Clone Schedule / New Cycle</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="sourceYear" className="block text-sm font-medium text-gray-700 mb-1">Source year</label>
                <select
                  id="sourceYear"
                  value={sourceYear ?? ''}
                  onChange={(e) => setSourceYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                >
                  {sourceYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
                <input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
              {previewLoading ? (
                <p className="text-gray-500">Calculating…</p>
              ) : preview ? (
                <>
                  <div className="flex items-center mb-2 font-semibold">
                    <Calendar className="h-4 w-4 mr-2" style={{color: '#ECC67F'}} />
                    {preview.summary.sessionsToCreate} session(s), {preview.summary.slotsToCreate} location slot(s),{' '}
                    {preview.summary.capacityToCreate} total seats on {preview.summary.targetDate}
                  </div>
                  {preview.summary.sessionsAlreadyCloned > 0 && (
                    <p className="text-amber-700 mb-2">
                      {preview.summary.sessionsAlreadyCloned} session(s) already exist on this date and will be skipped.
                    </p>
                  )}
                  <ul className="space-y-2 mt-3">
                    {preview.plan.map(item => (
                      <li key={item.sourceEventId} className={item.alreadyCloned ? 'text-gray-400 line-through' : ''}>
                        <span className="font-medium">{item.title}</span>{' '}
                        <span className="text-gray-500">({item.sourceDate} · {item.time})</span>
                        <div className="text-xs text-gray-600">
                          {item.locations.map(location => `${location.name} (${location.maxCapacity})`).join(', ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-3">
                    Time slots, capacities and details are copied; registrations start at 0. New sessions are created as
                    inactive so the current registration page is unaffected.
                  </p>
                </>
              ) : (
                <p className="text-gray-500">Select a source year and target date.</p>
              )}
            </div>

            {cloneError && (
              <div className="mb-4 p-3 rounded text-sm bg-red-50 text-red-800 border border-red-200 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{cloneError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 rounded border hover:bg-gray-50"
                style={{borderColor: '#ECC67F', color: '#ECC67F'}}
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={cloning || previewLoading || !preview || nothingToCreate}
                className="text-white px-4 py-2 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{backgroundColor: '#ECC67F'}}
              >
                {cloning ? 'Creating…' : nothingToCreate ? 'Already cloned' : 'Create sessions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
