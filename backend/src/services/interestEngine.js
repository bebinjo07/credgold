/**
 * Gold Loan Financial Engine
 * Handles valuation, interest accrual, partial payment waterfall, and settlement
 */

const PURITY_MAP = {
  '24K': 99.90,
  '22K': 91.60,
  '18K': 75.00,
  '14K': 58.50,
  'SILVER_999': 99.90,
  'SILVER_925': 92.50,
};

const DEFAULT_LTV_LIMIT_PCT = 75.0; // Standard 75% LTV limit for gold loans

/**
 * Calculate appraised value and max eligible loan for collateral items
 */
const calculateCollateralValuation = (items, defaultLtvPct = DEFAULT_LTV_LIMIT_PCT) => {
  let totalGrossWeight = 0;
  let totalStoneWeight = 0;
  let totalNetWeight = 0;
  let totalAppraisedValue = 0;

  const processedItems = items.map((item) => {
    const grossWeight = parseFloat(item.gross_weight_grams) || 0;
    const stoneWeight = parseFloat(item.stone_weight_grams) || 0;
    const netWeight = Math.max(0, grossWeight - stoneWeight);
    const purityPct = parseFloat(item.purity_pct) || PURITY_MAP[item.karat] || 91.6;
    const marketRate = parseFloat(item.market_rate_per_gram) || 0;

    // Appraised Value = Net Weight * Market Rate (adjusted for karat purity)
    const appraisedValue = (netWeight * marketRate * (purityPct / 100));

    totalGrossWeight += grossWeight;
    totalStoneWeight += stoneWeight;
    totalNetWeight += netWeight;
    totalAppraisedValue += appraisedValue;

    return {
      ...item,
      gross_weight_grams: Number(grossWeight.toFixed(3)),
      stone_weight_grams: Number(stoneWeight.toFixed(3)),
      net_weight_grams: Number(netWeight.toFixed(3)),
      purity_pct: purityPct,
      market_rate_per_gram: marketRate,
      appraised_value: Number(appraisedValue.toFixed(2)),
    };
  });

  const maxEligibleLoan = Number((totalAppraisedValue * (defaultLtvPct / 100)).toFixed(2));

  return {
    items: processedItems,
    summary: {
      totalGrossWeight: Number(totalGrossWeight.toFixed(3)),
      totalStoneWeight: Number(totalStoneWeight.toFixed(3)),
      totalNetWeight: Number(totalNetWeight.toFixed(3)),
      totalAppraisedValue: Number(totalAppraisedValue.toFixed(2)),
      ltvPercentage: defaultLtvPct,
      maxEligibleLoan,
    },
  };
};

/**
 * Calculate interest accrued for a loan up to a given date
 * @param {Object} loan 
 * @param {Date|string} asOfDate 
 */
const calculateAccruedInterest = (loan, asOfDate = new Date()) => {
  const targetDate = new Date(asOfDate);
  const startDate = new Date(loan.start_date);
  
  // Calculate days elapsed
  const diffTime = Math.max(0, targetDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const monthlyRatePct = parseFloat(loan.monthly_interest_rate_pct);
  const principal = parseFloat(loan.outstanding_principal);
  
  // Monthly interest amount
  const monthlyInterest = (principal * monthlyRatePct) / 100;
  
  // Daily interest rate (using standard 30-day month convention in pawn lending)
  const dailyInterest = monthlyInterest / 30;
  const totalAccruedInterest = Number((dailyInterest * diffDays).toFixed(2));
  
  // Net interest due = Total accrued - Total interest already paid
  const totalInterestPaid = parseFloat(loan.total_interest_paid || 0);
  const netInterestDue = Math.max(0, Number((totalAccruedInterest - totalInterestPaid).toFixed(2)));

  // Check if overdue
  const dueDate = new Date(loan.due_date);
  const isOverdue = targetDate > dueDate;
  const overdueDays = isOverdue ? Math.ceil((targetDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  // Optional late penalty: 0.5% per month on overdue interest
  let penalty = 0;
  if (isOverdue && overdueDays > (loan.grace_period_days || 7)) {
    penalty = Number(((netInterestDue * 0.02 * overdueDays) / 30).toFixed(2));
  }

  const totalSettlementAmount = Number((principal + netInterestDue + penalty).toFixed(2));

  return {
    diffDays,
    monthlyInterest: Number(monthlyInterest.toFixed(2)),
    dailyInterest: Number(dailyInterest.toFixed(2)),
    totalAccruedInterest,
    totalInterestPaid,
    netInterestDue,
    penalty,
    totalSettlementAmount,
    isOverdue,
    overdueDays,
  };
};

/**
 * Process a repayment using the strict Pawn Waterfall Allocation:
 * 1. Late Penalty (if any)
 * 2. Unpaid Accrued Interest
 * 3. Principal Reduction (Remainder)
 */
const allocateRepayment = (amountPaid, netInterestDue, penaltyDue = 0, currentPrincipal) => {
  let remaining = parseFloat(amountPaid);
  
  // 1. Settle Penalty
  const penaltyPortion = Math.min(remaining, penaltyDue);
  remaining -= penaltyPortion;

  // 2. Settle Interest
  const interestPortion = Math.min(remaining, netInterestDue);
  remaining -= interestPortion;

  // 3. Settle Principal
  const principalPortion = Math.min(remaining, currentPrincipal);
  remaining -= principalPortion;

  const newPrincipal = Math.max(0, currentPrincipal - principalPortion);
  const excessRefund = remaining; // Any excess over total payoff

  return {
    amountPaid: parseFloat(amountPaid),
    penaltyPortion: Number(penaltyPortion.toFixed(2)),
    interestPortion: Number(interestPortion.toFixed(2)),
    principalPortion: Number(principalPortion.toFixed(2)),
    excessRefund: Number(excessRefund.toFixed(2)),
    newPrincipal: Number(newPrincipal.toFixed(2)),
    isFullClosure: newPrincipal === 0 && (netInterestDue - interestPortion) <= 0.01,
  };
};

module.exports = {
  PURITY_MAP,
  DEFAULT_LTV_LIMIT_PCT,
  calculateCollateralValuation,
  calculateAccruedInterest,
  allocateRepayment,
};
