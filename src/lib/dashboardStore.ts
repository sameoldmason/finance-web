// src/lib/dashboardStore.ts
import type { Account, DashboardData } from "./financeTypes";

const LS_ROOT_KEY = "finance-web:dashboard";

function key(profileId: string) {
  return `${LS_ROOT_KEY}:${profileId}`;
}

/**
 * Read dashboard data for a profile from localStorage.
 * Returns null if nothing valid is stored.
 */
export function loadDashboardData(profileId: string): DashboardData | null {
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DashboardData> | null;
    if (!parsed || typeof parsed !== "object") return null;

    const accounts = Array.isArray(parsed.accounts)
      ? (parsed.accounts as Account[])
      : [];

    const normalizedAccounts = accounts.map((acc) => ({
      ...acc,
      accountCategory: acc.accountCategory === "debt" ? "debt" : "asset",
    }));

    return {
      accounts: normalizedAccounts,
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      netWorthHistory: Array.isArray(parsed.netWorthHistory)
        ? parsed.netWorthHistory
        : [],
      netWorthViewMode:
        parsed.netWorthViewMode === "minimal" || parsed.netWorthViewMode === "detailed"
          ? parsed.netWorthViewMode
          : undefined,
      hideMoney:
        typeof parsed.hideMoney === "boolean" ? parsed.hideMoney : undefined,
    };

  } catch (err) {
    console.error("Failed to read dashboard data:", err);
    return null;
  }
}

/**
 * Save dashboard data for a profile to localStorage.
 */
export function saveDashboardData(
  profileId: string,
  data: DashboardData
): void {
  try {
    const payload: DashboardData = {
      accounts: data.accounts ?? [],
      transactions: data.transactions ?? [],
      bills: data.bills ?? [],
      netWorthHistory: data.netWorthHistory ?? [],
      netWorthViewMode: data.netWorthViewMode,
      hideMoney: data.hideMoney,
    };

    localStorage.setItem(key(profileId), JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save dashboard data:", err);
  }
}
