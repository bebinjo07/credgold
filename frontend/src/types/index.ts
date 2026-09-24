export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  address: string;
  kyc_type: string;
  kyc_number: string;
  kyc_document_url?: string;
  customer_photo_url?: string;
  created_at: string;
}

export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM';

export interface PledgedItem {
  id?: string;
  metal_type: MetalType;
  item_description: string;
  karat: string;
  purity_pct: number;
  gross_weight_grams: number;
  stone_weight_grams: number;
  net_weight_grams?: number;
  market_rate_per_gram: number;
  appraised_value?: number;
  packet_number: string;
  photo_urls?: string[];
  status?: 'IN_VAULT' | 'RELEASED' | 'AUCTIONED';
}

export interface LiveFinancials {
  diffDays: number;
  monthlyInterest: number;
  dailyInterest: number;
  totalAccruedInterest: number;
  totalInterestPaid: number;
  netInterestDue: number;
  penalty: number;
  totalSettlementAmount: number;
  isOverdue: boolean;
  overdueDays: number;
}

export interface Loan {
  id: string;
  loan_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  kyc_type?: string;
  kyc_number?: string;
  principal_amount: number;
  monthly_interest_rate_pct: number;
  loan_term_months: number;
  start_date: string;
  due_date: string;
  status: 'ACTIVE' | 'OVERDUE' | 'CLOSED' | 'DEFAULTED' | 'AUCTIONED';
  total_interest_accrued: number;
  total_interest_paid: number;
  total_principal_paid: number;
  outstanding_principal: number;
  pledged_items_count?: number;
  total_net_weight?: number;
  total_gross_weight?: number;
  total_appraised_value?: number;
  liveFinancials?: LiveFinancials;
  items?: PledgedItem[];
  payments?: Payment[];
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  loan_id: string;
  receipt_number: string;
  payment_date: string;
  amount_paid: number;
  interest_portion: number;
  principal_portion: number;
  penalty_portion: number;
  payment_mode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  transaction_ref?: string;
  received_by_name?: string;
  whatsapp_receipt_sent: boolean;
  notes?: string;
  created_at: string;
}

export interface DashboardMetrics {
  summary: {
    activeLoansCount: number;
    totalActivePrincipal: number;
    overdueLoansCount: number;
    totalOverduePrincipal: number;
    closedLoansCount: number;
  };
  vault: {
    totalGoldNetGrams: number;
    totalSilverNetGrams: number;
    breakdown: Array<{
      metal_type: string;
      karat: string;
      item_count: string;
      total_gross_weight: string;
      total_net_weight: string;
      total_appraised_value: string;
    }>;
  };
  collections: {
    thisMonth: {
      total: number;
      interest: number;
      principal: number;
      txCount: number;
    };
    today: {
      total: number;
      txCount: number;
    };
  };
  overdueAlerts: Array<{
    id: string;
    loan_number: string;
    customer_name: string;
    customer_phone: string;
    outstanding_principal: string;
    due_date: string;
    days_overdue: number;
    estimated_interest_due: string;
  }>;
  recentLoans: Array<{
    id: string;
    loan_number: string;
    customer_name: string;
    customer_phone: string;
    principal_amount: string;
    outstanding_principal: string;
    start_date: string;
    status: string;
  }>;
}
