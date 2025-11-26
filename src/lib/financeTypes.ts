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
};
