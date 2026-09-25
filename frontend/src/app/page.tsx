'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, BookOpen } from 'lucide-react';
import DashboardMetrics from '@/components/DashboardMetrics';
import PaymentModal from '@/components/PaymentModal';

export default function DashboardPage() {
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    loanId: string;
    loanNumber: string;
  }>({
    isOpen: false,
    loanId: '',
    loanNumber: '',
  });

  const handleOpenPayment = (loanId: string, loanNumber: string) => {
    setPaymentModal({
      isOpen: true,
      loanId,
      loanNumber,
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Pawn Ledger & Vault Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time portfolio analytics, automated messaging recovery, and physical vault collateral ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/loans"
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold border border-slate-300 rounded-xl shadow-sm transition"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            Full Ledger
          </Link>

          <Link
            href="/loans/new"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-xl shadow-md shadow-amber-500/20 transition"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            New Gold Loan
          </Link>
        </div>
      </div>

      {/* Main Dashboard Metrics & Urgency Alerts */}
      <DashboardMetrics onOpenPayment={handleOpenPayment} />

      {/* Payment Processing Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, loanId: '', loanNumber: '' })}
        loanId={paymentModal.loanId}
        loanNumber={paymentModal.loanNumber}
        onPaymentSuccess={() => {
          // refresh metrics
        }}
      />
    </div>
  );
}
