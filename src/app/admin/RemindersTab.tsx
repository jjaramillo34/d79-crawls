'use client';

import { useState } from 'react';
import { Send, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { BRAND, CrawlDay, LocationStat, isOnDay } from './types';

interface RemindersTabProps {
  locationStats: LocationStat[];
  onUnauthorized: () => void;
}

type ReminderResult = { success: boolean; emailsSent?: number; error?: string } | null;

const EVENTS: { day: CrawlDay; title: string; date: string }[] = [
  { day: 'tuesday', title: 'Tuesday crawl', date: 'Tuesday, October 28' },
  { day: 'thursday', title: 'Thursday crawl', date: 'Thursday, October 30' },
];

export default function RemindersTab({ locationStats, onUnauthorized }: RemindersTabProps) {
  const [sending, setSending] = useState<Partial<Record<CrawlDay, boolean>>>({});
  const [results, setResults] = useState<Partial<Record<CrawlDay, ReminderResult>>>({});
  const [preview, setPreview] = useState<CrawlDay | null>(null);
  const [confirming, setConfirming] = useState<CrawlDay | null>(null);

  const participantsFor = (day: CrawlDay) => locationStats
    .filter(location => isOnDay(location, day))
    .flatMap(location => location.registrations.map(reg => ({ ...reg, locationName: location.name })));

  const handleSend = async (day: CrawlDay) => {
    setConfirming(null);
    setSending(prev => ({ ...prev, [day]: true }));
    setResults(prev => ({ ...prev, [day]: null }));

    try {
      const response = await fetch('/api/admin/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: day }),
      });
      if (response.status === 401) return onUnauthorized();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send reminders');
      setResults(prev => ({ ...prev, [day]: data }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [day]: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      }));
    } finally {
      setSending(prev => ({ ...prev, [day]: false }));
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {EVENTS.map(({ day, title, date }) => {
        const participants = participantsFor(day);
        const result = results[day];

        return (
          <div key={day} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mb-4">{date} · {participants.length} recipients</p>

            {confirming === day ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3 text-sm">
                <p className="text-gray-800 mb-3">
                  Send a reminder email to all {participants.length} {title.toLowerCase()} attendees now?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSend(day)}
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
                  onClick={() => setConfirming(day)}
                  disabled={sending[day] || participants.length === 0}
                  className="flex items-center px-4 py-2 rounded-lg font-semibold text-gray-900 hover:opacity-90 disabled:opacity-50"
                  style={{backgroundColor: BRAND}}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending[day] ? 'Sending…' : 'Send reminders'}
                </button>
                <button
                  onClick={() => setPreview(preview === day ? null : day)}
                  className="flex items-center px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  {preview === day ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
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

            {preview === day && (
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
