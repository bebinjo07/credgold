'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, User, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-3xl" />
      </div>

      {/* Logo & Branding */}
      <div className="relative z-10 text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-4xl shadow-2xl shadow-amber-500/30 mx-auto mb-5">
          🪙
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">
          SWARNA <span className="text-amber-400 font-serif">PAWN</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Gold Loan & Vault Ledger Management System
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-400/80 font-medium uppercase tracking-wider">
            Secure Digital Pawn Ledger
          </span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
      </div>

      {/* Login Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {/* Admin Login Card */}
        <Link href="/login/admin" className="group">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 h-full">
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Admin Login</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Shop Owner & Staff access. Manage loans, track vault inventory, process payments, and send WhatsApp reminders.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Full Dashboard & Analytics
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Create & Manage Gold Loans
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Payment Processing & Vault Control
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                WhatsApp & SMS Reminders
              </div>
            </div>

            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm group-hover:gap-3 transition-all">
              Sign in as Admin
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Customer Login Card */}
        <Link href="/login/customer" className="group">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 h-full">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <User className="w-7 h-7 text-emerald-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Customer Login</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Check your gold loan status, view payment history, outstanding interest dues, and collateral details.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                View Active Loan Details
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Check Interest Due & Payment History
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Pledged Item & Collateral Status
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Download Payment Receipts
              </div>
            </div>

            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm group-hover:gap-3 transition-all">
              Sign in as Customer
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-10 text-center">
        <p className="text-slate-600 text-xs">
          © 2026 Swarna Pawn. Secured with end-to-end encryption.
        </p>
      </div>
    </div>
  );
}
