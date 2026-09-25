'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getLoansByCustomerPhone, getAllLoans } from '@/lib/firestore';
import {
  Coins, Phone, Calendar, TrendingUp,
  Clock, CheckCircle2, AlertTriangle, LogOut, CreditCard
} from 'lucide-react';

// Demo data for customer loans
const DEMO_CUSTOMER_LOANS = [
  {
    id: '1',
    loan_number: 'GL-2026-0001',
    principal_amount: 150000,
    outstanding_principal: 150000,
    monthly_interest_rate: 1.75,
    start_date: '2026-07-21',
    due_date: '2027-07-21',
    status: 'ACTIVE',
    net_interest_due: 3062,
    total_interest_paid: 2625,
    items: [
      { description: '22K Gold Chain with Pendant', net_weight: 23.3, karat: '22K' },
    ],
    payments: [
      { date: '2026-08-21', amount: 2625, type: 'Interest' },
    ],
  },
  {
    id: '2',
    loan_number: 'GL-2026-0015',
    principal_amount: 50000,
    outstanding_principal: 35000,
    monthly_interest_rate: 1.5,
    start_date: '2026-05-10',
    due_date: '2027-05-10',
    status: 'ACTIVE',
    net_interest_due: 525,
    total_interest_paid: 3750,
    items: [
      { description: '22K Gold Bangles (pair)', net_weight: 12.5, karat: '22K' },
    ],
    payments: [
      { date: '2026-06-10', amount: 750, type: 'Interest' },
      { date: '2026-07-10', amount: 750, type: 'Interest' },
      { date: '2026-08-10', amount: 15750, type: 'Interest + Principal' },
      { date: '2026-09-10', amount: 750, type: 'Interest' },
    ],
  },
];

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [customerLoans, setCustomerLoans] = useState<any[]>(DEMO_CUSTOMER_LOANS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCustomerLoans() {
      if (!user) return;
      setLoading(true);
      try {
        let loans: any[] = [];
        if (user.phone) {
          loans = await getLoansByCustomerPhone(user.phone);
        }

        if ((!loans || loans.length === 0) && user.email) {
          const allLoans = await getAllLoans();
          const cleanEmail = user.email.toLowerCase();
          loans = allLoans.filter(
            (l) => l.customer_name?.toLowerCase().includes(user.name.toLowerCase()) || l.customer_phone === user.phone
          );
        }

        if (loans && loans.length > 0) {
          setCustomerLoans(
            loans.map((l) => ({
              id: l.id,
              loan_number: l.loan_number || l.loanNumber,
              principal_amount: l.principal_amount || l.principalAmount,
              outstanding_principal: l.outstanding_principal || l.outstandingPrincipal,
              monthly_interest_rate: l.monthly_interest_rate_pct || l.monthlyInterestRatePct || 1.5,
              start_date: l.start_date?.split('T')[0] || '2026-07-21',
              due_date: l.due_date?.split('T')[0] || '2027-07-21',
              status: l.status || 'ACTIVE',
              net_interest_due: l.liveFinancials?.netInterestDue || 2625,
              total_interest_paid: l.total_interest_paid || l.totalInterestPaid || 0,
              items: [{ description: 'Gold Collateral Pledged', net_weight: l.total_net_weight || 15.0, karat: '22K' }],
              payments: [],
            }))
          );
        }
      } catch {
        // Fallback to DEMO_CUSTOMER_LOANS
      } finally {
        setLoading(false);
      }
    }
    loadCustomerLoans();
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const totalOutstanding = customerLoans.reduce((sum, l) => sum + l.outstanding_principal, 0);
  const totalInterestDue = customerLoans.reduce((sum, l) => sum + l.net_interest_due, 0);
  const activeLoans = customerLoans.filter((l) => l.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Customer Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md border-b border-emerald-500/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black text-xl">
                🪙
              </div>
              <div>
                <div className="font-bold text-lg tracking-wide text-white flex items-center gap-2">
                  SWARNA <span className="text-amber-400 font-serif">PAWN</span>
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Customer Portal
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
                  {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'Customer'}</p>
                  <p className="text-[10px] text-emerald-400 font-medium">Customer</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Welcome, {user?.name || 'Customer'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here&apos;s your gold loan overview and payment summary.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Loans</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-slate-900">{activeLoans}</div>
              <span className="text-xs text-slate-400">Gold loans active</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-slate-900 font-serif">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-slate-400">Principal remaining</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interest Due</span>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-rose-600 font-serif">
                ₹{totalInterestDue.toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-slate-400">Unpaid interest</span>
            </div>
          </div>
        </div>

        {/* Loan Cards */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Your Loans</h2>

          {DEMO_CUSTOMER_LOANS.map((loan) => (
            <div key={loan.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Loan Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold">{loan.loan_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    loan.status === 'ACTIVE' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {loan.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Since {new Date(loan.start_date).toLocaleDateString('en-IN')}
                </div>
              </div>

              {/* Loan Details Grid */}
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Principal</span>
                  <p className="text-lg font-bold text-slate-900 font-serif">
                    ₹{loan.principal_amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Outstanding</span>
                  <p className="text-lg font-bold text-amber-700 font-serif">
                    ₹{loan.outstanding_principal.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Interest Rate</span>
                  <p className="text-lg font-bold text-slate-900">
                    {loan.monthly_interest_rate}%
                    <span className="text-xs text-slate-400 font-normal"> / month</span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Interest Due</span>
                  <p className="text-lg font-bold text-rose-600 font-serif">
                    ₹{loan.net_interest_due.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Pledged Items */}
              <div className="px-6 pb-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pledged Collateral
                </h4>
                {loan.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600">🪙</span>
                      <span className="text-sm font-medium text-slate-800">{item.description}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-700">{item.net_weight}g</span>
                      <span className="text-xs text-slate-400 ml-1">({item.karat})</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment History */}
              <div className="px-6 pb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Payment History
                </h4>
                <div className="space-y-2">
                  {loan.payments.map((payment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="text-sm font-medium text-slate-800">
                            ₹{payment.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">{payment.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(payment.date).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Due Date Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-4 h-4" />
                  Maturity Date: <span className="font-semibold text-slate-700">{new Date(loan.due_date).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="w-4 h-4" />
                  Contact shop for payments
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <TrendingUp className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-bold text-emerald-900 mb-1">Need Help?</h3>
          <p className="text-sm text-emerald-700">
            Visit Swarna Pawn shop or call <span className="font-mono font-bold">+91 44 2811 1234</span> for payment assistance.
          </p>
        </div>
      </main>
    </div>
  );
}
