'use client';

import { useState } from 'react';
import { Send, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { BRAND, DashboardEvent, LocationStat, locationsForEvent } from './types';

interface RemindersTabProps {
  locationStats: LocationStat[];
  events: DashboardEvent[];
  onUnauthorized: () => void;
  /** Reload dashboard data so "already reminded" counts update */
  onSent: () => void;
}

type ReminderResult = { success: boolean; emailsSent?: number; error?: string } | null;

export default function RemindersTab({ locationStats, events, onUnauthorized, onSent }: RemindersTabProps) {
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, ReminderResult>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const participantsFor = (eventId: string) => locationsForEvent(locationStats, eventId)
    .flatMap(location => location.registrations.map(reg => ({ ...reg, locationName: location.name })));

  const handleSend = async (eventId: string) => {
    setConfirming(null);
    setSending(prev => ({ ...prev, [eventId]: true }));
    setResults(prev => ({ ...prev, [eventId]: null }));

    try {
      const response = await fetch('/api/admin/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send reminders');
      setResults(prev => ({ ...prev, [eventId]: data }));
      onSent();
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [eventId]: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      }));
    } finally {
      setSending(prev => ({ ...prev, [eventId]: false }));
    }
  };

  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No sessions in this cycle.</p>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {events.map(event => {
        const participants = participantsFor(event._id);
        const reminded = participants.filter(participant => participant.reminderSentAt).length;
        const result = results[event._id];

        return (
          <div key={event._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-900">{event.dateLabel}</h3>
            <p className="text-sm text-gray-500">{event.title} · {participants.length} recipients</p>
            <p className="text-sm text-gray-500 mb-4">
              {reminded === 0
                ? 'No reminders sent yet'
                : `${reminded} of ${participants.length} already reminded`}
            </p>

            {confirming === event._id ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3 text-sm">
                <p className="text-gray-800 mb-3">
                  Send a reminder email to all {participants.length} attendees of this session now?
                  {reminded > 0 && ` ${reminded} of them were already reminded and will get it again.`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSend(event._id)}
                    className="flex items-center px-3 py-1.5 rounded-lg font-semibold text-gray-900 hover:opacity-90"
                    style={{backgroundColor: BRAND}}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Yes, send
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setConfirming(event._id)}
                  disabled={sending[event._id] || participants.length === 0}
                  className="flex items-center px-4 py-2 rounded-lg font-semibold text-gray-900 hover:opacity-90 disabled:opacity-50"
                  style={{backgroundColor: BRAND}}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending[event._id] ? 'Sending…' : 'Send reminders'}
                </button>
                <button
                  onClick={() => setPreview(preview === event._id ? null : event._id)}
                  className="flex items-center px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  {preview === event._id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  Recipients
                </button>
              </div>
            )}

            {result && (
              <div className={`p-3 rounded-lg text-sm flex items-center mb-3 ${
                result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {result.success ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
                <span>{result.success ? `Sent ${result.emailsSent} emails successfully` : `Error: ${result.error}`}</span>
              </div>
            )}

            {preview === event._id && (
              <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                {participants.map((participant, index) => (
                  <div key={index} className="px-3 py-2 text-xs flex justify-between gap-3">
                    <span className="text-gray-900">{participant.firstName} {participant.lastName}</span>
                    <span className="text-gray-500 truncate">{participant.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
