'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await loginAdmin(email, password);
      if (success) {
        router.push('/');
      } else {
        setError('Access Denied: Only bsbbebinjo2007@gmail.com is authorized as Admin.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-login-pattern login-grid-pattern flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login portal
        </Link>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-950/80">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Portal</h1>
            <p className="text-slate-400 text-xs mt-1.5 font-medium">
              Authorized Owner & Management Access
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-400 text-xs font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Authorized Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bsbbebinjo2007@gmail.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition font-medium text-sm"
                  autoComplete="email"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition font-medium text-sm"
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In as Admin'
              )}
            </button>
          </form>

          {/* Admin Info */}
          <div className="mt-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
            <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">
              Authorized Admin Account
            </p>
            <div className="space-y-1 text-slate-400 font-mono text-[11px]">
              <p>
                Email: <span className="text-amber-400 font-bold">bsbbebinjo2007@gmail.com</span>
              </p>
              <p>
                Password: <span className="text-amber-400 font-bold">admin123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
