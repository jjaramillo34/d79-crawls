'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Lock, Eye, EyeOff, CheckCircle, LogOut, KeyRound, X, ChevronDown, Home,
  LayoutDashboard, Users, CalendarDays, Send, FileText, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import CrawlSessionsPanel from './CrawlSessionsPanel';
import ChangePasswordForm from './ChangePasswordForm';
import OverviewTab from './OverviewTab';
import RegistrationsTab from './RegistrationsTab';
import RemindersTab from './RemindersTab';
import ReportsTab from './ReportsTab';
import { BRAND, BRAND_TEXT, DashboardEvent, LocationStat } from './types';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'registrations', label: 'Registrations', icon: Users },
  { id: 'sessions', label: 'Crawl Sessions', icon: CalendarDays },
  { id: 'reminders', label: 'Reminders', icon: Send },
  { id: 'reports', label: 'Reports', icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

interface AdminInfo {
  email: string;
  name?: string;
  mustChangePassword: boolean;
}

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [cycle, setCycle] = useState<number | null>(null);
  const [cycles, setCycles] = useState<number[]>([]);
  const [activeCycle, setActiveCycle] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const handleUnauthorized = useCallback(() => {
    setAdmin(null);
    setError('Your session has expired. Please sign in again.');
  }, []);

  // Without a cycle, the server returns the cycle that is open for registration
  const loadDashboard = useCallback(async (requestedCycle?: number | null) => {
    const query = requestedCycle ? `?cycle=${requestedCycle}` : '';
    const response = await fetch(`/api/admin/registrations${query}`);
    if (response.status === 401) return handleUnauthorized();
    if (!response.ok) throw new Error('Failed to load registrations');

    const data = await response.json();
    setTotalRegistrations(data.totalRegistrations);
    setLocationStats(data.locationStats);
    setEvents(data.events);
    setCycle(data.cycle);
    setCycles(data.cycles);
    setActiveCycle(data.activeCycle);
  }, [handleUnauthorized]);

  // Keep the selected tab in the URL hash so reloads and links land on the same tab
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (TABS.some(tab => tab.id === fromHash)) setActiveTab(fromHash as TabId);
  }, []);

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard(cycle);
    } finally {
      setRefreshing(false);
    }
  };

  // Restore an existing session on page load
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/auth/me');
        if (response.ok) {
          const data = await response.json();
          setAdmin(data.admin);
          if (!data.admin.mustChangePassword) await loadDashboard();
        }
      } catch {
        // Fall through to the login form
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [loadDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Invalid email or password');
        return;
      }

      setPassword('');
      setAdmin(data.admin);
      if (!data.admin.mustChangePassword) await loadDashboard();
    } catch {
      setError('Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = async () => {
    setShowChangePassword(false);
    setPasswordChanged(true);
    const wasRequired = admin?.mustChangePassword;
    setAdmin(prev => prev && { ...prev, mustChangePassword: false });
    if (wasRequired) await loadDashboard();
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {});
    setAdmin(null);
    setError('');
    setTotalRegistrations(0);
    setLocationStats([]);
    setShowChangePassword(false);
    setPasswordChanged(false);
    setMenuOpen(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 border-2" style={{borderColor: '#ECC67F'}}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{backgroundColor: '#ECC67F20'}}>
                <Lock className="h-8 w-8" style={{color: '#ECC67F'}} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#ECC67F'}}>Admin Access</h1>
              <p className="text-gray-600">Sign in with your admin account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none"
                  placeholder="you@schools.nyc.gov"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{backgroundColor: '#ECC67F'}}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm hover:underline" style={{color: '#ECC67F'}}>
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (admin.mustChangePassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 border-2" style={{borderColor: '#ECC67F'}}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{backgroundColor: '#ECC67F20'}}>
                <KeyRound className="h-8 w-8" style={{color: '#ECC67F'}} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#ECC67F'}}>Set Your Password</h1>
              <p className="text-gray-600">You signed in with a one-time password. Choose your own to continue.</p>
            </div>
            <ChangePasswordForm onSuccess={handlePasswordChanged} onUnauthorized={handleUnauthorized} />
            <div className="mt-6 text-center">
              <button onClick={handleLogout} className="text-sm hover:underline" style={{color: '#ECC67F'}}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            <div className="flex items-center min-w-0">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 flex-shrink-0" style={{backgroundColor: BRAND}}>
                <LayoutDashboard className="h-5 w-5 text-gray-900" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 leading-tight">D79 Fall Crawls</p>
                <p className="text-xs text-gray-500 leading-tight">Admin dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cycles.length > 0 && (
                <select
                  value={cycle ?? ''}
                  onChange={(e) => loadDashboard(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                  aria-label="Cycle"
                  title="Which year's registrations to show"
                >
                  {cycles.map(year => (
                    <option key={year} value={year}>{year}{year === activeCycle ? ' · Open' : ''}</option>
                  ))}
                </select>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-gray-900" style={{backgroundColor: `${BRAND}66`}}>
                    {admin.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:block text-sm text-gray-700 max-w-[220px] truncate">{admin.email}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div role="menu" className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm text-gray-900 truncate">{admin.email}</p>
                      </div>
                      <button
                        role="menuitem"
                        onClick={() => { setMenuOpen(false); setPasswordChanged(false); setShowChangePassword(true); }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Change password
                      </button>
                      <Link
                        role="menuitem"
                        href="/"
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Home className="h-4 w-4 mr-2" />
                        Back to site
                      </Link>
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 overflow-x-auto -mb-px" aria-label="Admin sections">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    active ? 'text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }`}
                  style={active ? { borderColor: BRAND } : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 mr-2" style={active ? { color: BRAND_TEXT } : undefined} />
                  {label}
                  {id === 'registrations' && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{totalRegistrations}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {passwordChanged && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-green-50 text-green-800 border border-green-200 flex items-center justify-between">
            <span className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Password updated. Any other sessions for your account have been signed out.
            </span>
            <button onClick={() => setPasswordChanged(false)} aria-label="Dismiss" className="text-green-700 hover:text-green-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {cycle !== null && activeTab !== 'sessions' && cycle !== activeCycle && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-amber-50 text-amber-900 border border-amber-200">
            You are viewing the {cycle} cycle, which is closed for registration.
          </div>
        )}

        {activeTab === 'overview' && <OverviewTab totalRegistrations={totalRegistrations} locationStats={locationStats} events={events} />}
        {activeTab === 'registrations' && (
          <RegistrationsTab
            key={cycle ?? 'none'}
            locationStats={locationStats}
            events={events}
            onChanged={() => loadDashboard(cycle)}
            onUnauthorized={handleUnauthorized}
          />
        )}
        {activeTab === 'sessions' && (
          <CrawlSessionsPanel onUnauthorized={handleUnauthorized} onChanged={() => loadDashboard()} />
        )}
        {activeTab === 'reminders' && <RemindersTab locationStats={locationStats} events={events} onUnauthorized={handleUnauthorized} />}
        {activeTab === 'reports' && <ReportsTab locationStats={locationStats} events={events} />}
      </main>

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ChangePasswordForm
              onSuccess={handlePasswordChanged}
              onUnauthorized={handleUnauthorized}
              onCancel={() => setShowChangePassword(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
