// src/lib/dashboardStore.ts
import type {
  Account,
  DashboardData,
  AccountCategory,
  DebtPayoffSettings,
} from "./financeTypes";

const LS_ROOT_KEY = "finance-web:dashboard";

function key(profileId: string) {
  return `${LS_ROOT_KEY}:${profileId}`;
}

const DEFAULT_DEBT_SETTINGS: DebtPayoffSettings = {
  mode: "snowball",
  monthlyAllocation: 0,
  showInterest: false,
};

function normalizeDebtSettings(
  settings: unknown
): DebtPayoffSettings {
  if (!settings || typeof settings !== "object") {
    return { ...DEFAULT_DEBT_SETTINGS };
  }

  const typed = settings as Partial<DebtPayoffSettings>;

  return {
    mode: typed.mode === "avalanche" ? "avalanche" : "snowball",
    monthlyAllocation:
      typeof typed.monthlyAllocation === "number"
        ? typed.monthlyAllocation
        : DEFAULT_DEBT_SETTINGS.monthlyAllocation,
    showInterest:
      typeof typed.showInterest === "boolean"
        ? typed.showInterest
        : DEFAULT_DEBT_SETTINGS.showInterest,
  };
}

function ensureStartingBalance(acc: Account): Account {
  const isDebt = acc.isDebt ?? acc.accountCategory === "debt";
  if (!isDebt) return acc;

  if (acc.startingBalance === undefined) {
    return { ...acc, startingBalance: Math.abs(acc.balance) };
  }
  return acc;
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

    const normalizedAccounts: Account[] = accounts.map((acc): Account => {
      const accountCategory = (acc.accountCategory === "debt"
        ? "debt"
        : "asset") as AccountCategory;
      const aprFromPercent =
        typeof acc.aprPercent === "number"
          ? acc.aprPercent / 100
          : undefined;

      const withDerivedApr: Account = {
        ...acc,
        accountCategory,
        isDebt: acc.isDebt ?? accountCategory === "debt",
        apr: typeof acc.apr === "number" ? acc.apr : aprFromPercent,
        aprPercent:
          acc.aprPercent === undefined
            ? null
            : acc.aprPercent,
        minimumPayment:
          typeof acc.minimumPayment === "number"
            ? acc.minimumPayment
            : undefined,
      };

      return ensureStartingBalance(withDerivedApr);
    });

    const deletedAccounts = Array.isArray(parsed.deletedAccounts)
      ? (parsed.deletedAccounts as Account[])
      : [];

    const normalizedDeleted: Account[] = deletedAccounts.map((acc) => {
      const accountCategory = (acc.accountCategory === "debt"
        ? "debt"
        : "asset") as AccountCategory;
      const aprFromPercent =
        typeof acc.aprPercent === "number"
          ? acc.aprPercent / 100
          : undefined;

      return ensureStartingBalance({
        ...acc,
        accountCategory,
        isDebt: acc.isDebt ?? accountCategory === "debt",
        apr: typeof acc.apr === "number" ? acc.apr : aprFromPercent,
        aprPercent:
          acc.aprPercent === undefined ? null : acc.aprPercent,
        minimumPayment:
          typeof acc.minimumPayment === "number"
            ? acc.minimumPayment
            : undefined,
      });
    });

    return {
      accounts: normalizedAccounts,
      deletedAccounts: normalizedDeleted,
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
      debtPayoffSettings: normalizeDebtSettings(parsed.debtPayoffSettings),
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
    const accounts = (data.accounts ?? []).map(ensureStartingBalance);
    const deletedAccounts = (data.deletedAccounts ?? []).map(
      ensureStartingBalance
    );

    const payload: DashboardData = {
      accounts,
      deletedAccounts,
      transactions: data.transactions ?? [],
      bills: data.bills ?? [],
      netWorthHistory: data.netWorthHistory ?? [],
      netWorthViewMode: data.netWorthViewMode,
      hideMoney: data.hideMoney,
      debtPayoffSettings: normalizeDebtSettings(data.debtPayoffSettings),
    };

    localStorage.setItem(key(profileId), JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save dashboard data:", err);
  }
}
