// src/lib/financeTypes.ts

export type Account = {
  id: string;
  name: string;
  balance: number;
};

export type Transaction = {
  id: string;
  accountId: string;
  amount: number; // positive = income, negative = expense
  date: string;
  description: string;
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
  transactions: Transaction[];
  bills: Bill[];
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
