'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import LoanCreationForm from '../../../components/LoanCreationForm';

export default function NewLoanPage() {
  return (
    <div className="space-y-6">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Originate New Gold Loan</h1>
            <p className="text-xs text-slate-500">
              Digitize manual ledger entry, record pledged ornaments, compute live LTV, and lock in vault.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Statutory 75% LTV Enforced</span>
        </div>
      </div>

      {/* Main Loan Creation Form */}
      <LoanCreationForm />
    </div>
  );
}
