import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, serverTimestamp,
  setDoc, increment
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================
// COLLECTION REFERENCES
// ============================================
const customersRef = collection(db, 'customers');
const loansRef = collection(db, 'loans');
const paymentsRef = collection(db, 'payments');
const pledgedItemsRef = collection(db, 'pledgedItems');
const countersRef = collection(db, 'counters');

// ============================================
// LOAN NUMBER GENERATOR
// ============================================
export async function generateLoanNumber(): Promise<string> {
  const counterDoc = doc(countersRef, 'loans');
  try {
    const snap = await getDoc(counterDoc);
    if (snap.exists()) {
      const current = snap.data().count || 0;
      const next = current + 1;
      await updateDoc(counterDoc, { count: next });
      return `GL-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`;
    } else {
      await setDoc(counterDoc, { count: 1 });
      return `GL-${new Date().getFullYear()}-0001`;
    }
  } catch {
    const fallback = Math.floor(Math.random() * 9000) + 1000;
    return `GL-${new Date().getFullYear()}-${fallback}`;
  }
}

// ============================================
// CUSTOMER OPERATIONS
// ============================================
export async function createCustomer(data: {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: string;
  kycType: string;
  kycNumber: string;
}) {
  // Check if customer already exists by phone
  const q = query(customersRef, where('phone', '==', data.phone));
  const existing = await getDocs(q);

  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    return { id: existingDoc.id, ...existingDoc.data(), isExisting: true };
  }

  const docRef = await addDoc(customersRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, ...data, isExisting: false };
}

export async function getCustomerByPhone(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const q = query(customersRef, where('phone', '==', cleanPhone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getCustomerByEmail(email: string) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const q = query(customersRef, where('email', '==', cleanEmail));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getCustomerById(customerId: string) {
  const snap = await getDoc(doc(customersRef, customerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getAllCustomers() {
  const q = query(customersRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============================================
// LOAN OPERATIONS
// ============================================
export async function createLoan(data: {
  customerId: string;
  customerName: string;
  customerPhone: string;
  principalAmount: number;
  monthlyInterestRatePct: number;
  loanTermMonths: number;
  gracePeriodDays?: number;
  notes?: string;
  items: any[];
}) {
  const loanNumber = await generateLoanNumber();
  const startDate = new Date();
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + data.loanTermMonths);

  // Create the loan document
  const loanDoc = await addDoc(loansRef, {
    loanNumber,
    customerId: data.customerId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    principalAmount: data.principalAmount,
    outstandingPrincipal: data.principalAmount,
    monthlyInterestRatePct: data.monthlyInterestRatePct,
    loanTermMonths: data.loanTermMonths,
    gracePeriodDays: data.gracePeriodDays || 7,
    startDate: Timestamp.fromDate(startDate),
    dueDate: Timestamp.fromDate(dueDate),
    status: 'ACTIVE',
    totalInterestPaid: 0,
    totalPrincipalPaid: 0,
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create pledged items
  let totalNetWeight = 0;
  for (const item of data.items) {
    const netWeight = Math.max(0, (item.gross_weight_grams || 0) - (item.stone_weight_grams || 0));
    totalNetWeight += netWeight;

    await addDoc(pledgedItemsRef, {
      loanId: loanDoc.id,
      metalType: item.metal_type || 'GOLD',
      itemDescription: item.item_description || '',
      karat: item.karat || '22K',
      purityPct: item.purity_pct || 91.6,
      grossWeightGrams: item.gross_weight_grams || 0,
      stoneWeightGrams: item.stone_weight_grams || 0,
      netWeightGrams: netWeight,
      marketRatePerGram: item.market_rate_per_gram || 0,
      packetNumber: item.packet_number || '',
      createdAt: serverTimestamp(),
    });
  }

  // Update loan with total net weight
  await updateDoc(doc(loansRef, loanDoc.id), {
    totalNetWeight,
    pledgedItemsCount: data.items.length,
  });

  return {
    id: loanDoc.id,
    loanNumber,
    principalAmount: data.principalAmount,
    startDate: startDate.toISOString(),
    dueDate: dueDate.toISOString(),
    status: 'ACTIVE',
    totalNetWeight,
  };
}

export async function getAllLoans(filters?: { status?: string; search?: string }) {
  let q;

  if (filters?.status && filters.status !== 'ALL') {
    q = query(loansRef, where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  } else {
    q = query(loansRef, orderBy('createdAt', 'desc'));
  }

  const snap = await getDocs(q);
  let loans = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      loan_number: data.loanNumber,
      customer_id: data.customerId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      principal_amount: data.principalAmount,
      outstanding_principal: data.outstandingPrincipal,
      monthly_interest_rate_pct: data.monthlyInterestRatePct,
      loan_term_months: data.loanTermMonths,
      start_date: data.startDate?.toDate?.()?.toISOString() || new Date().toISOString(),
      due_date: data.dueDate?.toDate?.()?.toISOString() || new Date().toISOString(),
      status: data.status,
      total_interest_accrued: data.totalInterestAccrued || 0,
      total_interest_paid: data.totalInterestPaid || 0,
      total_principal_paid: data.totalPrincipalPaid || 0,
      total_net_weight: data.totalNetWeight || 0,
      pledged_items_count: data.pledgedItemsCount || 0,
      created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      liveFinancials: calculateLiveFinancials(data),
    };
  });

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    loans = loans.filter(
      (l) =>
        l.loan_number?.toLowerCase().includes(searchLower) ||
        l.customer_name?.toLowerCase().includes(searchLower) ||
        l.customer_phone?.includes(searchLower)
    );
  }

  return loans;
}

export async function getLoansByCustomerPhone(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const q = query(loansRef, where('customerPhone', '==', cleanPhone), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      loanNumber: data.loanNumber,
      principalAmount: data.principalAmount,
      outstandingPrincipal: data.outstandingPrincipal,
      monthlyInterestRatePct: data.monthlyInterestRatePct,
      startDate: data.startDate?.toDate?.()?.toISOString(),
      dueDate: data.dueDate?.toDate?.()?.toISOString(),
      status: data.status,
      totalInterestPaid: data.totalInterestPaid || 0,
      totalNetWeight: data.totalNetWeight || 0,
      liveFinancials: calculateLiveFinancials(data),
    };
  });
}

export async function getLoanById(loanId: string) {
  const snap = await getDoc(doc(loansRef, loanId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getPledgedItems(loanId: string) {
  const q = query(pledgedItemsRef, where('loanId', '==', loanId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============================================
// PAYMENT OPERATIONS
// ============================================
export async function recordPayment(data: {
  loanId: string;
  interestAmount: number;
  principalAmount: number;
  paymentMethod: string;
  notes?: string;
}) {
  const totalAmount = data.interestAmount + data.principalAmount;

  // Record payment
  const paymentDoc = await addDoc(paymentsRef, {
    loanId: data.loanId,
    interestAmount: data.interestAmount,
    principalAmount: data.principalAmount,
    totalAmount,
    paymentMethod: data.paymentMethod,
    notes: data.notes || '',
    paymentDate: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  // Update loan totals
  const loanRef = doc(loansRef, data.loanId);
  const loanSnap = await getDoc(loanRef);

  if (loanSnap.exists()) {
    const loanData = loanSnap.data();
    const newOutstanding = Math.max(0, (loanData.outstandingPrincipal || 0) - data.principalAmount);

    await updateDoc(loanRef, {
      totalInterestPaid: increment(data.interestAmount),
      totalPrincipalPaid: increment(data.principalAmount),
      outstandingPrincipal: newOutstanding,
      updatedAt: serverTimestamp(),
    });
  }

  return { id: paymentDoc.id, totalAmount };
}

export async function getPaymentsByLoan(loanId: string) {
  const q = query(paymentsRef, where('loanId', '==', loanId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function closeLoan(loanId: string) {
  const loanRef = doc(loansRef, loanId);
  await updateDoc(loanRef, {
    status: 'CLOSED',
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// DASHBOARD METRICS
// ============================================
export async function getDashboardMetrics() {
  const allLoans = await getDocs(loansRef);
  const allPayments = await getDocs(paymentsRef);
  const allItems = await getDocs(pledgedItemsRef);

  let activeLoansCount = 0;
  let totalActivePrincipal = 0;
  let overdueLoansCount = 0;
  let totalOverduePrincipal = 0;
  let closedLoansCount = 0;
  const overdueAlerts: any[] = [];
  const recentLoans: any[] = [];

  const now = new Date();

  allLoans.docs.forEach((d) => {
    const data = d.data();
    const dueDate = data.dueDate?.toDate?.() || new Date();

    if (data.status === 'ACTIVE') {
      activeLoansCount++;
      totalActivePrincipal += data.outstandingPrincipal || 0;

      if (now > dueDate) {
        overdueLoansCount++;
        totalOverduePrincipal += data.outstandingPrincipal || 0;
        const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const monthlyInterest = (data.outstandingPrincipal || 0) * (data.monthlyInterestRatePct || 0) / 100;

        overdueAlerts.push({
          id: d.id,
          loan_number: data.loanNumber,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          outstanding_principal: String(data.outstandingPrincipal || 0),
          due_date: dueDate.toISOString(),
          days_overdue: diffDays,
          estimated_interest_due: String(Math.round(monthlyInterest * (diffDays / 30))),
        });
      }

      recentLoans.push({
        id: d.id,
        loan_number: data.loanNumber,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        principal_amount: String(data.principalAmount || 0),
        outstanding_principal: String(data.outstandingPrincipal || 0),
        start_date: data.startDate?.toDate?.()?.toISOString() || '',
        status: data.status,
      });
    } else if (data.status === 'CLOSED') {
      closedLoansCount++;
    }
  });

  // Vault calculations
  let totalGoldNetGrams = 0;
  let totalSilverNetGrams = 0;
  const breakdownMap: Record<string, { metal_type: string; karat: string; item_count: number; total_gross_weight: number; total_net_weight: number; total_appraised_value: number }> = {};

  allItems.docs.forEach((d) => {
    const data = d.data();
    const net = data.netWeightGrams || 0;
    const gross = data.grossWeightGrams || 0;
    const rate = data.marketRatePerGram || 0;
    const karat = data.karat || '22K';
    const metal = data.metalType || 'GOLD';

    if (metal === 'GOLD') totalGoldNetGrams += net;
    else totalSilverNetGrams += net;

    const key = `${metal}-${karat}`;
    if (!breakdownMap[key]) {
      breakdownMap[key] = { metal_type: metal, karat, item_count: 0, total_gross_weight: 0, total_net_weight: 0, total_appraised_value: 0 };
    }
    breakdownMap[key].item_count++;
    breakdownMap[key].total_gross_weight += gross;
    breakdownMap[key].total_net_weight += net;
    breakdownMap[key].total_appraised_value += net * rate;
  });

  // Monthly collections
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  let monthInterest = 0;
  let monthPrincipal = 0;
  let monthTxCount = 0;
  let todayTotal = 0;
  let todayTxCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  allPayments.docs.forEach((d) => {
    const data = d.data();
    const payDate = data.paymentDate?.toDate?.() || data.createdAt?.toDate?.() || new Date(0);

    if (payDate >= thisMonth) {
      monthInterest += data.interestAmount || 0;
      monthPrincipal += data.principalAmount || 0;
      monthTxCount++;
    }
    if (payDate >= today) {
      todayTotal += data.totalAmount || 0;
      todayTxCount++;
    }
  });

  return {
    summary: {
      activeLoansCount,
      totalActivePrincipal,
      overdueLoansCount,
      totalOverduePrincipal,
      closedLoansCount,
    },
    vault: {
      totalGoldNetGrams: parseFloat(totalGoldNetGrams.toFixed(3)),
      totalSilverNetGrams: parseFloat(totalSilverNetGrams.toFixed(3)),
      breakdown: Object.values(breakdownMap).map((b) => ({
        ...b,
        item_count: String(b.item_count),
        total_gross_weight: b.total_gross_weight.toFixed(3),
        total_net_weight: b.total_net_weight.toFixed(3),
        total_appraised_value: String(Math.round(b.total_appraised_value)),
      })),
    },
    collections: {
      thisMonth: {
        total: monthInterest + monthPrincipal,
        interest: monthInterest,
        principal: monthPrincipal,
        txCount: monthTxCount,
      },
      today: {
        total: todayTotal,
        txCount: todayTxCount,
      },
    },
    overdueAlerts,
    recentLoans: recentLoans.slice(0, 5),
  };
}

// ============================================
// HELPER: Calculate live financials
// ============================================
function calculateLiveFinancials(loanData: any) {
  const startDate = loanData.startDate?.toDate?.() || new Date();
  const dueDate = loanData.dueDate?.toDate?.() || new Date();
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const principal = loanData.outstandingPrincipal || 0;
  const rate = loanData.monthlyInterestRatePct || 0;
  const monthlyInterest = principal * (rate / 100);
  const dailyInterest = monthlyInterest / 30;
  const totalAccrued = Math.round(dailyInterest * diffDays);
  const totalPaid = loanData.totalInterestPaid || 0;
  const netDue = Math.max(0, totalAccrued - totalPaid);

  const isOverdue = now > dueDate;
  const overdueDays = isOverdue ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const penalty = isOverdue ? Math.round(dailyInterest * overdueDays * 0.02) : 0;

  return {
    diffDays,
    monthlyInterest: Math.round(monthlyInterest),
    dailyInterest: Math.round(dailyInterest),
    totalAccruedInterest: totalAccrued,
    totalInterestPaid: totalPaid,
    netInterestDue: netDue,
    penalty,
    totalSettlementAmount: principal + netDue + penalty,
    isOverdue,
    overdueDays,
  };
}
