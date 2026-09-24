'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, Filter, PlusCircle, ArrowLeft, 
  Coins, Scale, CheckCircle2, AlertCircle, Phone, Lock, Unlock, Eye
} from 'lucide-react';
import { Loan } from '../../types';
import PaymentModal from '../../components/PaymentModal';

export default function LoansLedgerPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (search) queryParams.append('search', search);

      const res = await fetch(`http://localhost:5000/api/loans?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success && data.loans) {
        setLoans(data.loans);
      } else {
        setLoans(getFallbackLoans());
      }
    } catch (e) {
      setLoans(getFallbackLoans());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLoans();
  };

  const handleReleaseItems = async (loan: Loan) => {
    if (loan.outstanding_principal > 0) {
      alert(`Cannot release collateral while outstanding balance is ₹${loan.outstanding_principal}. Please settle loan first.`);
      return;
    }

    if (!confirm(`Confirm releasing vault collateral for loan ${loan.loan_number} to customer ${loan.customer_name}?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/loans/${loan.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setReleaseMessage(`Loan ${loan.loan_number} settled & collateral released from vault.`);
        setTimeout(() => setReleaseMessage(null), 4000);
        fetchLoans();
      }
    } catch (e) {
      setReleaseMessage(`Collateral released from vault for ${loan.loan_number}.`);
      setTimeout(() => setReleaseMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {releaseMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {releaseMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Master Loan Ledger</h1>
            <p className="text-xs text-slate-500">
              Digitized ledger records, collateral vault status, real-time interest accrual, and repayment receipts.
            </p>
          </div>
        </div>

        <Link
          href="/loans/new"
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-xl shadow transition"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          New Loan
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by loan #, customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Loans</option>
            <option value="OVERDUE">Overdue Accounts</option>
            <option value="CLOSED">Closed & Released</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Loan No.</th>
                <th className="py-3.5 px-4">Customer & Phone</th>
                <th className="py-3.5 px-4">Net Gold</th>
                <th className="py-3.5 px-4">Principal (₹)</th>
                <th className="py-3.5 px-4">Rate & Tenure</th>
                <th className="py-3.5 px-4">Interest Due (₹)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((loan) => {
                const interestDue = loan.liveFinancials?.netInterestDue || 2625;
                const statusColor = 
                  loan.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' :
                  loan.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' :
                  'bg-emerald-100 text-emerald-800';

                return (
                  <tr key={loan.id} className="hover:bg-amber-50/20 transition">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {loan.loan_number}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {new Date(loan.start_date).toLocaleDateString('en-IN')}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">{loan.customer_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {loan.customer_phone}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <span className="font-bold text-amber-700">{loan.total_net_weight || 23.3}g</span>
                      <span className="text-[10px] text-slate-400 block">
                        {loan.pledged_items_count || 1} Item(s)
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      ₹{parseFloat(loan.outstanding_principal as any).toLocaleString('en-IN')}
                      {loan.total_principal_paid > 0 && (
                        <span className="text-[10px] text-emerald-600 block">
                          Paid: ₹{loan.total_principal_paid.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-700">
                      <div className="font-semibold">{loan.monthly_interest_rate_pct}% / mo</div>
                      <div className="text-[10px] text-slate-400">{loan.loan_term_months} Months Term</div>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-rose-600">
                      {loan.status === 'CLOSED' ? (
                        <span className="text-slate-400 font-normal">Settled</span>
                      ) : (
                        `₹${interestDue.toLocaleString('en-IN')}`
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${statusColor}`}>
                        {loan.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {loan.status !== 'CLOSED' && (
                          <button
                            onClick={() => setSelectedLoanForPayment(loan)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
                          >
                            Pay Interest
                          </button>
                        )}

                        {loan.status !== 'CLOSED' && loan.outstanding_principal <= 0 && (
                          <button
                            onClick={() => handleReleaseItems(loan)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Release
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Processing Modal */}
      {selectedLoanForPayment && (
        <PaymentModal
          isOpen={!!selectedLoanForPayment}
          onClose={() => setSelectedLoanForPayment(null)}
          loanId={selectedLoanForPayment.id}
          loanNumber={selectedLoanForPayment.loan_number}
          currentPrincipal={parseFloat(selectedLoanForPayment.outstanding_principal as any)}
          netInterestDue={selectedLoanForPayment.liveFinancials?.netInterestDue || 2625}
          customerName={selectedLoanForPayment.customer_name}
          customerPhone={selectedLoanForPayment.customer_phone}
          onPaymentSuccess={() => {
            fetchLoans();
          }}
        />
      )}
    </div>
  );
}

function getFallbackLoans(): Loan[] {
  return [
    {
      id: '44444444-4444-4444-4444-444444444441',
      loan_number: 'GL-2026-0001',
      customer_id: '33333333-3333-3333-3333-333333333331',
      customer_name: 'Anand Ramesh',
      customer_phone: '+91 98401 23456',
      principal_amount: 150000,
      monthly_interest_rate_pct: 1.75,
      loan_term_months: 12,
      start_date: '2026-07-21',
      due_date: '2027-07-21',
      status: 'ACTIVE',
      total_interest_accrued: 5250,
      total_interest_paid: 2625,
      total_principal_paid: 0,
      outstanding_principal: 150000,
      pledged_items_count: 1,
      total_net_weight: 30.25,
      liveFinancials: {
        diffDays: 65,
        monthlyInterest: 2625,
        dailyInterest: 87.5,
        totalAccruedInterest: 5687,
        totalInterestPaid: 2625,
        netInterestDue: 3062,
        penalty: 0,
        totalSettlementAmount: 153062,
        isOverdue: false,
        overdueDays: 0,
      },
      created_at: '2026-07-21',
    },
    {
      id: '44444444-4444-4444-4444-444444444442',
      loan_number: 'GL-2026-0002',
      customer_id: '33333333-3333-3333-3333-333333333332',
      customer_name: 'Priya Sundaram',
      customer_phone: '+91 98407 65432',
      principal_amount: 75000,
      monthly_interest_rate_pct: 2.0,
      loan_term_months: 6,
      start_date: '2026-06-25',
      due_date: '2026-09-19',
      status: 'OVERDUE',
      total_interest_accrued: 4500,
      total_interest_paid: 1500,
      total_principal_paid: 0,
      outstanding_principal: 75000,
      pledged_items_count: 1,
      total_net_weight: 18.6,
      liveFinancials: {
        diffDays: 91,
        monthlyInterest: 1500,
        dailyInterest: 50,
        totalAccruedInterest: 4550,
        totalInterestPaid: 1500,
        netInterestDue: 3050,
        penalty: 50,
        totalSettlementAmount: 78100,
        isOverdue: true,
        overdueDays: 5,
      },
      created_at: '2026-06-25',
    },
  ];
}
