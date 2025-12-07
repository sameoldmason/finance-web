// src/lib/debtPayoffMath.ts
import type { DebtPayoffMode } from "./financeTypes";

export type DebtInput = {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  apr: number;
  startingBalance: number;
};

export type DebtPayoffResult = {
  debts: Array<{
    id: string;
    name: string;
    balance: number;
    minimumPayment: number;
    apr: number;
    startingBalance: number;
    estimatedPayoffDate: Date | null;
  }>;
  nextDebtId: string | null;
  nextDebtEstimatedPayoffDate: Date | null;
  overallEstimatedDebtFreeDate: Date | null;
  progressToNextDebt: number;
  progressTotalPaid: number;
  insufficientAllocation: boolean;
};

const MAX_MONTHS = 600;

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function addMonths(base: Date, count: number) {
  const next = new Date(base);
  next.setMonth(base.getMonth() + count);
  return next;
}

export function calculateDebtPayoff(
  debtsInput: DebtInput[],
  mode: DebtPayoffMode,
  monthlyAllocation: number
): DebtPayoffResult {
  const normalized = debtsInput
    .filter((debt) => debt.balance > 0)
    .map((debt) => ({
      ...debt,
      balance: Math.max(0, debt.balance),
      minimumPayment: Math.max(0, debt.minimumPayment),
      apr: Math.max(0, debt.apr),
      startingBalance: Math.max(0, debt.startingBalance),
    }));

  const ordered = [...normalized].sort((a, b) => {
    if (mode === "snowball") {
      return a.balance - b.balance;
    }
    return b.apr - a.apr;
  });

  const debtsForReturn = ordered.map((debt) => ({
    ...debt,
    estimatedPayoffDate: null as Date | null,
  }));

  const totalMinimums = ordered.reduce(
    (sum, debt) => sum + debt.minimumPayment,
    0
  );

  if (monthlyAllocation < totalMinimums || monthlyAllocation <= 0) {
    const target = ordered.find((debt) => debt.balance > 0);
    const totalStarting = ordered.reduce(
      (sum, debt) => sum + debt.startingBalance,
      0
    );
    const totalRemaining = ordered.reduce(
      (sum, debt) => sum + debt.balance,
      0
    );

    return {
      debts: debtsForReturn,
      nextDebtId: target?.id ?? null,
      nextDebtEstimatedPayoffDate: null,
      overallEstimatedDebtFreeDate: null,
      progressToNextDebt:
        mode === "snowball" && target
          ? clamp(
              target.startingBalance > 0
                ? 1 - target.balance / target.startingBalance
                : 0
            )
          : 0,
      progressTotalPaid:
        mode === "avalanche"
          ? clamp(
              totalStarting > 0 ? 1 - totalRemaining / totalStarting : 0
            )
          : 0,
      insufficientAllocation: true,
    };
  }

  // Working copies for simulation
  const working = debtsForReturn.map((debt) => ({ ...debt }));

  const startDate = new Date();
  startDate.setDate(1);

  let month = 0;
  while (
    working.some((debt) => debt.balance > 0.01) &&
    month < MAX_MONTHS
  ) {
    month += 1;
    const currentMonthDate = addMonths(startDate, month);

    // Apply monthly interest
    working.forEach((debt) => {
      if (debt.balance <= 0) return;
      const monthlyRate = debt.apr / 12;
      debt.balance += debt.balance * monthlyRate;
    });

    // Pay minimums
    let remainingBudget = monthlyAllocation;
    working.forEach((debt) => {
      if (debt.balance <= 0) return;
      const payment = Math.min(debt.balance, debt.minimumPayment);
      debt.balance -= payment;
      remainingBudget -= payment;
      if (debt.balance <= 0.01 && debt.estimatedPayoffDate === null) {
        debt.balance = 0;
        debt.estimatedPayoffDate = currentMonthDate;
      }
    });

    if (remainingBudget > 0) {
      const target = working.find((debt) => debt.balance > 0.01);
      if (target) {
        const extra = Math.min(target.balance, remainingBudget);
        target.balance -= extra;
        remainingBudget -= extra;
        if (target.balance <= 0.01 && target.estimatedPayoffDate === null) {
          target.balance = 0;
          target.estimatedPayoffDate = currentMonthDate;
        }
      }
    }
  }

  // Copy payoff dates back to the return structure
  const debts = debtsForReturn.map((debt) => {
    const matching = working.find((d) => d.id === debt.id);
    return {
      ...debt,
      estimatedPayoffDate: matching?.estimatedPayoffDate ?? null,
    };
  });

  const target = debts.find((debt) => debt.balance > 0);
  const totalStarting = debts.reduce(
    (sum, debt) => sum + debt.startingBalance,
    0
  );
  const totalRemaining = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const payoffDates = debts
    .map((debt) => debt.estimatedPayoffDate)
    .filter((date): date is Date => !!date);
  const overallEstimatedDebtFreeDate =
    payoffDates.length > 0
      ? payoffDates.reduce((latest, date) =>
          latest && latest > date ? latest : date
        )
      : null;

  return {
    debts,
    nextDebtId: mode === "snowball" ? target?.id ?? null : null,
    nextDebtEstimatedPayoffDate:
      mode === "snowball" ? target?.estimatedPayoffDate ?? null : null,
    overallEstimatedDebtFreeDate,
    progressToNextDebt:
      mode === "snowball" && target
        ? clamp(
            target.startingBalance > 0
              ? 1 - target.balance / target.startingBalance
              : 0
          )
        : 0,
    progressTotalPaid:
      mode === "avalanche"
        ? clamp(
            totalStarting > 0 ? 1 - totalRemaining / totalStarting : 0
          )
        : 0,
    insufficientAllocation: false,
  };
}
