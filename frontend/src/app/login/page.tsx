'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, User, ArrowRight, Sparkles, Lock, Building2 } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-login-pattern login-grid-pattern flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header & Logo */}
      <div className="relative z-10 text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-4xl shadow-2xl shadow-amber-500/20 mx-auto mb-4 border border-amber-300/30">
          🪙
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-3">
          SWARNA <span className="text-amber-400 font-serif">PAWN</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto font-medium">
          Gold Loan Management & Physical Vault Collateral Ledger
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1 mt-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ISO 27001 Certified Vault Ledger</span>
        </div>
      </div>

      {/* Choice Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {/* Admin Login Card */}
        <Link href="/login/admin" className="group">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:bg-slate-900 hover:border-amber-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 h-full flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-7 h-7 text-amber-400" />
              </div>

              <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
                Authorized Admin ID Only
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Admin Portal</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Shop owner and management access. Originate loans, record repayments, monitor 75% LTV, and manage vault stock.
              </p>

              <div className="space-y-2.5 mb-8 border-t border-slate-800/80 pt-5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Pawn Ledger & Real-time Metrics
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Gold Collateral & Vault Management
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  WhatsApp Monthly Reminders
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-amber-400 font-bold text-sm pt-4 border-t border-slate-800/60 group-hover:text-amber-300 transition-colors">
              <span>Login as Admin</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Customer Login Card */}
        <Link href="/login/customer" className="group">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:bg-slate-900 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 h-full flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="w-7 h-7 text-emerald-400" />
              </div>

              <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
                Resend OTP Authentication
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Customer Portal</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Check active loan balances, view pledged gold items, calculate interest dues, and review payment history.
              </p>

              <div className="space-y-2.5 mb-8 border-t border-slate-800/80 pt-5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Instant Loan Overview & Balances
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Pledged Gold Ornaments & Karat Details
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Email OTP Verification via Resend
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-emerald-400 font-bold text-sm pt-4 border-t border-slate-800/60 group-hover:text-emerald-300 transition-colors">
              <span>Login as Customer</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-12 text-center text-slate-500 text-xs flex items-center gap-2">
        <Lock className="w-3.5 h-3.5" />
        <span>© 2026 Swarna Pawn System. End-to-end Encrypted Banking Security.</span>
      </div>
    </div>
  );
}
