// src/lib/dashboardStore.ts
import type { DashboardData } from "./financeTypes";

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

return {
  accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
  transactions: Array.isArray(parsed.transactions)
    ? parsed.transactions
    : [],
  bills: Array.isArray(parsed.bills) ? parsed.bills : [],
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
};

    localStorage.setItem(key(profileId), JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save dashboard data:", err);
  }
}
