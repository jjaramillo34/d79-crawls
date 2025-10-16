'use client';

import { useState } from 'react';
import { MapPin, Users, Lock, Eye, EyeOff, Mail, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Registration {
  name: string;
  email: string;
  phone: string;
  location: string;
  registeredAt: string;
}

interface LocationStat {
  _id: string;
  name: string;
  address: string;
  eventDate: string;
  registrationCount: number;
  maxCapacity: number;
  availableSpots: number;
  registrations: Registration[];
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError('Invalid password');
        return;
      }

      const data = await response.json();
      setIsAuthenticated(true);
      setTotalRegistrations(data.totalRegistrations);
      setLocationStats(data.locationStats);
    } catch (err) {
      setError('Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 border-2" style={{borderColor: '#ECC67F'}}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{backgroundColor: '#ECC67F20'}}>
                <Lock className="h-8 w-8" style={{color: '#ECC67F'}} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#ECC67F'}}>Admin Access</h1>
              <p className="text-gray-600">Enter password to view registrations</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none"
                    style={{focusRingColor: '#ECC67F'}}
                    placeholder="Enter admin password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                {loading ? 'Authenticating...' : 'Access Admin Panel'}
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{color: '#ECC67F'}}>Registration Dashboard</h1>
            <p className="text-gray-600">D79 Fall Crawls - Admin Panel</p>
          </div>
          <Link 
            href="/" 
            className="text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            style={{backgroundColor: '#ECC67F'}}
          >
            Back to Home
          </Link>
        </div>

        {/* Total Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2" style={{borderColor: '#ECC67F'}}>
          <div className="flex items-center">
            <Users className="h-12 w-12 mr-4" style={{color: '#ECC67F'}} />
            <div>
              <p className="text-gray-600 text-sm">Total Registrations</p>
              <p className="text-4xl font-bold" style={{color: '#ECC67F'}}>{totalRegistrations}</p>
            </div>
          </div>
        </div>

        {/* Location Stats */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold" style={{color: '#ECC67F'}}>Registrations by Location</h2>
          
          {locationStats.map((location) => (
            <div key={location._id} className="bg-white rounded-xl shadow-lg border-2" style={{borderColor: '#ECC67F'}}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <MapPin className="h-5 w-5 mr-2" style={{color: '#ECC67F'}} />
                      <h3 className="text-xl font-bold" style={{color: '#ECC67F'}}>{location.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{location.address}</p>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="font-semibold">{location.eventDate}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center mb-2">
                      <Users className="h-5 w-5 mr-2" style={{color: '#ECC67F'}} />
                      <span className="text-2xl font-bold" style={{color: '#ECC67F'}}>
                        {location.registrationCount} / {location.maxCapacity}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold ${location.availableSpots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {location.availableSpots > 0 ? `${location.availableSpots} spots left` : 'FULL'}
                    </p>
                  </div>
                </div>

                {location.registrationCount > 0 && (
                  <>
                    <button
                      onClick={() => setExpandedLocation(expandedLocation === location._id ? null : location._id)}
                      className="text-sm font-semibold hover:underline mb-4"
                      style={{color: '#ECC67F'}}
                    >
                      {expandedLocation === location._id ? '▼ Hide Registrations' : '▶ Show Registrations'}
                    </button>

                    {expandedLocation === location._id && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3" style={{color: '#ECC67F'}}>Registered Attendees:</h4>
                        <div className="space-y-3">
                          {location.registrations.map((reg, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-4">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <p className="font-semibold text-gray-900">{reg.name}</p>
                                  <div className="flex items-center text-sm text-gray-600 mt-1">
                                    <Mail className="h-3 w-3 mr-1" />
                                    <a href={`mailto:${reg.email}`} className="hover:underline">{reg.email}</a>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600 mt-1">
                                    <Phone className="h-3 w-3 mr-1" />
                                    <span>{reg.phone}</span>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <p><span className="font-semibold">Current Location:</span> {reg.location}</p>
                                  <p><span className="font-semibold">Registered:</span> {new Date(reg.registeredAt).toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
