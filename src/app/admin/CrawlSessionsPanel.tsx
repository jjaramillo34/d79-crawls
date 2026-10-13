'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Copy, X, AlertCircle, CheckCircle, RefreshCw, Pencil, Power } from 'lucide-react';
import EditSessionModal from './EditSessionModal';

const DEFAULT_TARGET_DATE = '2026-11-06';

interface CrawlSession {
  _id: string;
  title: string;
  date: string;
  dateLabel: string;
  cycle: number;
  time: string;
  description: string;
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
  /** Called after sessions change (edit/activate/clone) so the rest of the dashboard can reload */
  onChanged?: () => void;
}

export default function CrawlSessionsPanel({ onUnauthorized, onChanged }: CrawlSessionsPanelProps) {
  const [sessions, setSessions] = useState<CrawlSession[]>([]);
  const [sourceYears, setSourceYears] = useState<number[]>([]);
  const [activeCycle, setActiveCycle] = useState<number | null>(null);
  const [editing, setEditing] = useState<CrawlSession | null>(null);
  const [confirmCycle, setConfirmCycle] = useState<number | null>(null);
  const [activating, setActivating] = useState(false);
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
      setActiveCycle(data.activeCycle);
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
      onChanged?.();
      setShowModal(false);
    } catch (error) {
      setCloneError(error instanceof Error ? error.message : 'Failed to clone schedule');
    } finally {
      setCloning(false);
    }
  };

  const handleActivate = async (cycle: number) => {
    setActivating(true);
    setCloneError('');
    setCloneSuccess('');
    try {
      const response = await fetch('/api/admin/crawls/activate-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle }),
      });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to activate cycle');
      setCloneSuccess(data.message);
      setConfirmCycle(null);
      await loadSessions();
      onChanged?.();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to activate cycle');
    } finally {
      setActivating(false);
    }
  };

  const handleSaved = async () => {
    setEditing(null);
    setCloneSuccess('Session updated');
    await loadSessions();
    onChanged?.();
  };

  const cycles = [...new Set(sessions.map(session => session.cycle))].sort((a, b) => b - a);
  const nothingToCreate = preview !== null && preview.summary.sessionsToCreate === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Crawl Sessions</h2>
          <p className="text-sm text-gray-500">Each year is a cycle. Only one cycle is open for registration at a time.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadSessions}
            disabled={loading}
            className="flex items-center text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openModal}
            disabled={sourceYears.length === 0}
            className="flex items-center text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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

      {!loading && sessions.length === 0 && (
        <p className="py-6 text-center text-gray-500">No crawl sessions found</p>
      )}

      <div className="space-y-6">
        {cycles.map(cycle => {
          const cycleSessions = sessions.filter(session => session.cycle === cycle);
          const isOpen = cycle === activeCycle;

          return (
            <section key={cycle} className={`rounded-xl border ${isOpen ? 'border-green-200' : 'border-gray-200'}`}>
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 rounded-t-xl ${isOpen ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{cycle} cycle</h3>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                    {isOpen ? 'Open for registration' : 'Closed'}
                  </span>
                </div>

                {!isOpen && (
                  confirmCycle === cycle ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                      <span className="text-gray-700">
                        Open {cycle} for registration{activeCycle ? ` and close ${activeCycle}` : ''}? Existing registrations are kept.
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleActivate(cycle)}
                          disabled={activating}
                          className="px-3 py-1.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {activating ? 'Activating…' : 'Yes, activate'}
                        </button>
                        <button
                          onClick={() => setConfirmCycle(null)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmCycle(cycle)}
                      className="flex items-center self-start md:self-auto text-sm px-3 py-1.5 rounded-lg border border-green-600 text-green-700 bg-white hover:bg-green-50 font-semibold"
                    >
                      <Power className="h-4 w-4 mr-1.5" />
                      Activate {cycle}
                    </button>
                  )
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 px-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Session</th>
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Locations</th>
                      <th className="py-2 pr-4 font-medium text-right">Registered / Capacity</th>
                      <th className="py-2 pr-4"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleSessions.map(session => (
                      <tr key={session._id} className="border-b border-gray-100 last:border-0 align-top">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{session.dateLabel}</div>
                          <div className="text-xs text-gray-500">{session.date}</div>
                        </td>
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
                        <td className="py-3 pr-4 text-right">
                          <button
                            onClick={() => setEditing(session)}
                            className="inline-flex items-center text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <EditSessionModal
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onUnauthorized={onUnauthorized}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Clone Schedule / New Cycle</h3>
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
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={cloning || previewLoading || !preview || nothingToCreate}
                className="text-gray-900 px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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
