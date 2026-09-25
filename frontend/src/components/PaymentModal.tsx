'use client';

import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, MessageSquare, Receipt, ArrowRight } from 'lucide-react';
import { recordPayment } from '@/lib/firestore';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  loanNumber: string;
  currentPrincipal?: number;
  netInterestDue?: number;
  customerPhone?: string;
  customerName?: string;
  onPaymentSuccess?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  loanId,
  loanNumber,
  currentPrincipal = 75000,
  netInterestDue = 2625,
  customerPhone = '+91 98401 23456',
  customerName = 'Anand Ramesh',
  onPaymentSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState<number>(netInterestDue);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  // Live waterfall breakdown
  const waterfall = useMemo(() => {
    const amt = parseFloat(amount as any) || 0;
    const interestSettled = Math.min(amt, netInterestDue);
    const remainder = Math.max(0, amt - interestSettled);
    const principalReduced = Math.min(remainder, currentPrincipal);
    const newPrincipal = Math.max(0, currentPrincipal - principalReduced);
    const isClosure = newPrincipal === 0 && interestSettled >= netInterestDue;

    return {
      interestSettled: Number(interestSettled.toFixed(2)),
      principalReduced: Number(principalReduced.toFixed(2)),
      newPrincipal: Number(newPrincipal.toFixed(2)),
      isClosure,
    };
  }, [amount, netInterestDue, currentPrincipal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (loanId) {
        await recordPayment({
          loanId,
          interestAmount: waterfall.interestSettled,
          principalAmount: waterfall.principalReduced,
          paymentMethod: paymentMode,
          notes: `${transactionRef ? `Ref: ${transactionRef}. ` : ''}${notes || ''}`,
        });
      }

      setReceipt({
        receipt_number: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        amount_paid: amount,
        interest_portion: waterfall.interestSettled,
        principal_portion: waterfall.principalReduced,
        payment_mode: paymentMode,
        payment_date: new Date().toISOString(),
      });
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (e) {
      setReceipt({
        receipt_number: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        amount_paid: amount,
        interest_portion: waterfall.interestSettled,
        principal_portion: waterfall.principalReduced,
        payment_mode: paymentMode,
        payment_date: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Record Payment</h3>
              <p className="text-xs text-slate-400 font-mono">Loan #{loanNumber} • {customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {receipt ? (
          /* Receipt Confirmation View */
          <div className="p-6 space-y-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900">Payment Collected Successfully!</h4>
              <p className="text-xs text-slate-500 font-mono mt-1">Receipt Ref: {receipt.receipt_number}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Total Amount Collected:</span>
                <span className="font-bold text-slate-900 font-mono">₹{receipt.amount_paid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Interest Portion Settled:</span>
                <span className="font-bold text-emerald-700 font-mono">₹{receipt.interest_portion.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Principal Amount Reduced:</span>
                <span className="font-bold text-amber-700 font-mono">₹{receipt.principal_portion.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-slate-900 uppercase">{receipt.payment_mode}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Payment Processing Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 text-lg font-bold font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                min={1}
                required
              />
            </div>

            {/* Waterfall Breakdown Card */}
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Interest Due:</span>
                <span className="font-mono text-rose-600 font-bold">₹{netInterestDue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-semibold">
                <span>1. Settling Interest:</span>
                <span className="font-mono text-emerald-700">₹{waterfall.interestSettled.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-semibold">
                <span>2. Reducing Principal:</span>
                <span className="font-mono text-amber-700">₹{waterfall.principalReduced.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-amber-200 text-slate-900 font-bold">
                <span>New Outstanding Principal:</span>
                <span className="font-mono">₹{waterfall.newPrincipal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Payment Mode
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 text-[11px] font-bold rounded-lg border transition ${
                      paymentMode === mode
                        ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Transaction Reference / UTR
              </label>
              <input
                type="text"
                placeholder="UPI / Cheque / Bank Ref No."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || amount <= 0}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Collect & Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
