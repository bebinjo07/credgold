'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, ArrowLeft, Phone, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { loginCustomer } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');

  const handleSendOtp = async () => {
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSendingOtp(true);
    try {
      // Simulate OTP send
      await new Promise((r) => setTimeout(r, 1000));
      setOtpSent(true);
      setOtpNotice(`OTP sent to +91 ${cleanPhone.slice(-10, -5)} ${cleanPhone.slice(-5)}`);
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length < 4) {
      setError('Please enter the 4-digit OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await loginCustomer(phone, otp);
      if (success) {
        router.push('/customer');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login options
        </Link>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Customer Login</h1>
            <p className="text-slate-400 text-sm mt-2">
              Check your loan status & payment history
            </p>
          </div>

          {/* OTP Notice */}
          {otpNotice && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {otpNotice}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 text-sm font-mono">
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (otpSent) {
                      setOtpSent(false);
                      setOtpNotice('');
                    }
                  }}
                  placeholder="98401 23456"
                  maxLength={12}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition font-mono tracking-wider"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Send OTP Button */}
            {!otpSent && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Send OTP via WhatsApp
                  </>
                )}
              </button>
            )}

            {/* OTP Input */}
            {otpSent && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 4-digit OTP"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition font-mono text-center text-2xl tracking-[0.5em]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Resend OTP
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </>
            )}
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Demo Access
            </p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                <span className="text-slate-400">Phone:</span>{' '}
                <code className="text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">9840123456</code>
              </p>
              <p>
                <span className="text-slate-400">OTP:</span>{' '}
                <code className="text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">1234</code>{' '}
                <span className="text-slate-600">(any 4+ digits work)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
