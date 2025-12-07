// src/lib/financeTypes.ts

export type AccountCategory = "asset" | "debt";

export type Account = {
  id: string;
  name: string;
  balance: number;
  accountCategory: AccountCategory;
  /** Optional explicit debt marker; falls back to accountCategory === "debt" */
  isDebt?: boolean;
  /** APR as a decimal (e.g. 0.2199 for 21.99%) */
  apr?: number;
  /** Monthly minimum payment for debt accounts */
  minimumPayment?: number;
  /**
   * Balance snapshot at the start of a payoff plan; used for progress.
   * Stored as a positive number representing the amount owed.
   */
  startingBalance?: number;

  /** Only meaningful for credit (debt) accounts; can be undefined or null */
  creditLimit?: number | null;

  /** APR as a percentage, e.g. 19.99 means 19.99% APR */
  aprPercent?: number | null;
};

export type DebtPayoffMode = "snowball" | "avalanche";

export type DebtPayoffSettings = {
  mode: DebtPayoffMode;
  monthlyAllocation: number;
  showInterest: boolean;
};

export type Transaction = {
  id: string;
  accountId: string;
  amount: number; // positive = income, negative = expense
  date: string;
  description: string;
  kind?: "transaction" | "transfer";
  /** Shared id for the two sides of a transfer */
  transferGroupId?: string;
};

export type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note?: string;
};

export type DashboardData = {
  accounts: Account[];
  deletedAccounts?: Account[];
  transactions: Transaction[];
  bills: Bill[];
  netWorthHistory?: NetWorthSnapshot[];
  netWorthViewMode?: "minimal" | "detailed";
  hideMoney?: boolean;
  debtPayoffSettings?: DebtPayoffSettings;
};

export type NetWorthSnapshot = {
  date: string; // ISO date (YYYY-MM-DD)
  value: number; // net worth in CAD
  totalAssets: number;
  totalDebts: number;
};


export type Bill = {
  id: string;
  name: string;
  amount: number;      // positive number (we’ll treat as expense)
  dueDate: string;     // "YYYY-MM-DD"
  accountId: string;   // which account it usually comes from
  frequency?: "once" | "weekly" | "biweekly" | "monthly"; // for later
  isPaid?: boolean;    // for marking a specific occurrence paid
};
