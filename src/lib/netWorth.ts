// src/lib/netWorth.ts
import type { Account } from "./financeTypes";

export const NET_WORTH_MAX_POINTS = 180;

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateNetWorthFromAccounts(accounts: Account[]): {
  netWorth: number;
  totalAssets: number;
  totalDebts: number;
} {
  let totalAssets = 0;
  let totalDebts = 0;

  accounts.forEach((account) => {
    if (account.accountCategory === "debt") {
      if (account.balance < 0) {
        totalDebts += Math.abs(account.balance);
      } else {
        totalAssets += account.balance;
      }
    } else {
      totalAssets += account.balance;
    }
  });

  const netWorth = totalAssets - totalDebts;

  return {
    netWorth: roundToTwo(netWorth),
    totalAssets: roundToTwo(totalAssets),
    totalDebts: roundToTwo(totalDebts),
  };
}
