'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, PlusCircle, LayoutDashboard, BookOpen, Vault, BellRing } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md border-b border-amber-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black text-xl">
              🪙
            </div>
            <div>
              <Link href="/" className="font-bold text-lg tracking-wide text-white flex items-center gap-2">
                SWARNA <span className="text-amber-400 font-serif">PAWN</span>
              </Link>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Gold Loan & Vault Ledger
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-medium text-sm">
            <Link
              href="/"
              className="px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              Dashboard
            </Link>

            <Link
              href="/loans"
              className="px-3 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              Loan Ledger
            </Link>

            <Link
              href="/loans/new"
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow transition flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              New Gold Loan
            </Link>
          </nav>

          {/* User Badge / Status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300">WhatsApp API Active</span>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs">
                AD
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-200 leading-none">Rajesh Verma</p>
                <p className="text-[10px] text-amber-400 font-medium">Shop Owner (Admin)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
