// src/routes/Dashboard.tsx
import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "../ThemeProvider";
import { useActiveProfile } from "../ActiveProfileContext";
import {
  Account,
  Transaction,
  TransferInput,
} from "../lib/financeTypes";
import {
  loadDashboardData,
  saveDashboardData,
} from "../lib/dashboardStore";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// New profiles should start with NO accounts
const INITIAL_ACCOUNTS: Account[] = [];

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  });
}

export default function Dashboard() {
  const { theme, toggle } = useTheme();
  const { activeProfile } = useActiveProfile();

  // Accounts + selection
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    INITIAL_ACCOUNTS[0]?.id ?? ""
  );
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [editButtonForId, setEditButtonForId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Modals
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] =
    useState(false);

  // Edit-transaction modals
  const [editingDetailsTx, setEditingDetailsTx] = useState<Transaction | null>(
    null
  );
  const [editingAmountTx, setEditingAmountTx] = useState<Transaction | null>(
    null
  );

  // Load saved data when the active profile changes
  useEffect(() => {
    const profileId = activeProfile?.id;

    // No profile selected → fall back to empty in memory
    if (!profileId) {
      setAccounts([]);
      setSelectedAccountId("");
      setTransactions([]);
      setCarouselStartIndex(0);
      setEditButtonForId(null);
      setEditingAccount(null);
      return;
    }

    const loaded = loadDashboardData(profileId);

    // Nothing in storage yet → start with no accounts
    if (!loaded) {
      setAccounts([]);
      setSelectedAccountId("");
      setTransactions([]);
      setCarouselStartIndex(0);
      setEditButtonForId(null);
      setEditingAccount(null);
      return;
    }

    const accountsFromStore = Array.isArray(loaded.accounts)
      ? loaded.accounts
      : [];
    const txFromStore = Array.isArray(loaded.transactions)
      ? loaded.transactions
      : [];

    setAccounts(accountsFromStore);
    setSelectedAccountId(accountsFromStore[0]?.id ?? "");
    setTransactions(txFromStore);
    setCarouselStartIndex(0);
    setEditButtonForId(null);
    setEditingAccount(null);
  }, [activeProfile?.id]);

  // Save whenever accounts or transactions change
  useEffect(() => {
    const profileId = activeProfile?.id;
    if (!profileId) return;

    saveDashboardData(profileId, { accounts, transactions });
  }, [accounts, transactions, activeProfile?.id]);

  // Selected account derived from state
  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const visibleTransactions = selectedAccount
    ? transactions.filter((tx) => tx.accountId === selectedAccount.id)
    : [];

  const lightBg =
    "bg-brand-primary bg-gradient-to-b from-[#B6C8CE] via-brand-primary to-[#869BA1]";
  const darkBg =
    "bg-[#1E3A5F] bg-gradient-to-b from-[#2E517F] via-[#1E3A5F] to-[#10263F]";

  const handlePrevAccount = () => {
    if (accounts.length <= 1) return;
    const nextStart =
      carouselStartIndex === 0 ? accounts.length - 1 : carouselStartIndex - 1;
    setCarouselStartIndex(nextStart);
    const nextAccount = accounts[nextStart];
    if (nextAccount) {
      setSelectedAccountId(nextAccount.id);
      setEditButtonForId(null);
    }
  };

  const handleNextAccount = () => {
    if (accounts.length <= 1) return;
    const nextStart = (carouselStartIndex + 1) % accounts.length;
    setCarouselStartIndex(nextStart);
    const nextAccount = accounts[nextStart];
    if (nextAccount) {
      setSelectedAccountId(nextAccount.id);
      setEditButtonForId(null);
    }
  };

  const handleAccountClick = (id: string) => {
    setSelectedAccountId(id);
    setEditButtonForId((current) => (current === id ? null : id));
  };

  // Add a new transaction + update account balance
  function addTransaction(t: Transaction) {
    setTransactions((prev) => [...prev, t]);

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === t.accountId
          ? { ...acc, balance: acc.balance + t.amount }
          : acc
      )
    );
  }

  // Update an existing transaction (amount / date / description)
  function handleUpdateTransaction(
    id: string,
    updates: Partial<Pick<Transaction, "amount" | "date" | "description">>
  ) {
    let amountDiff = 0;
    let accountIdForDiff: string | null = null;

    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;

        const next: Transaction = {
          ...tx,
          ...updates,
          amount: updates.amount !== undefined ? updates.amount : tx.amount,
          date: updates.date ?? tx.date,
          description: updates.description ?? tx.description,
        };

        if (updates.amount !== undefined && updates.amount !== tx.amount) {
          amountDiff = updates.amount - tx.amount;
          accountIdForDiff = tx.accountId;
        }

        return next;
      })
    );

    if (amountDiff !== 0 && accountIdForDiff) {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountIdForDiff
            ? { ...acc, balance: acc.balance + amountDiff }
            : acc
        )
      );
    }
  }

  function handleAddAccount(newAccount: Account) {
    setAccounts((prev) => [...prev, newAccount]);
    setSelectedAccountId(newAccount.id);
    if (accounts.length === 0) {
      setCarouselStartIndex(0);
    }
  }

  function handleTransfer({
    fromAccountId,
    toAccountId,
    amount,
    date,
    note,
  }: TransferInput) {
    if (!amount || amount <= 0) return;
    if (fromAccountId === toAccountId) return;

    const cleanAmount = Math.abs(amount);

    // Update balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === fromAccountId) {
          return { ...acc, balance: acc.balance - cleanAmount };
        }
        if (acc.id === toAccountId) {
          return { ...acc, balance: acc.balance + cleanAmount };
        }
        return acc;
      })
    );

    // Add two transactions (out + in)
    setTransactions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        accountId: fromAccountId,
        amount: -cleanAmount,
        date,
        description: note || "Transfer out",
      },
      {
        id: crypto.randomUUID(),
        accountId: toAccountId,
        amount: cleanAmount,
        date,
        description: note || "Transfer in",
      },
    ]);
  }

  // When an account is edited (name + balance)
  function handleSaveEditedAccount(
    original: Account,
    updates: { name: string; balance: number }
  ) {
    const trimmedName = updates.name.trim() || original.name;
    const nextBalance = updates.balance;
    const delta = nextBalance - original.balance;

    // Update account name + balance
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === original.id
          ? { ...acc, name: trimmedName, balance: nextBalance }
          : acc
      )
    );

    // If balance changed, create a single adjustment transaction
    if (delta !== 0) {
      const today = new Date().toISOString().slice(0, 10);
      setTransactions((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          accountId: original.id,
          amount: delta,
          date: today,
          description:
            delta > 0
              ? "Balance adjustment (increase)"
              : "Balance adjustment (decrease)",
        },
      ]);
    }
  }

  const profileName = "Profile";

  // Compute which accounts to show in the 2-pill carousel
  let visibleAccounts: Account[] = [];
  if (accounts.length <= 2) {
    visibleAccounts = accounts;
  } else if (accounts.length > 2) {
    const first = accounts[carouselStartIndex];
    const second = accounts[(carouselStartIndex + 1) % accounts.length];
    visibleAccounts = [first, second].filter(Boolean) as Account[];
  }

  return (
    <div
      className={`min-h-[100svh] w-full ${
        theme === "dark" ? darkBg : lightBg
      } text-brand-accent`}
    >
      <div className="mx-auto flex h-full max-w-[1280px] px-6 py-6">
        {/* LEFT SIDEBAR – months */}
        <aside className="mr-6 flex w-40 shrink-0 flex-col justify-end rounded-2xl bg-black/10 px-4 py-6 backdrop-blur-sm shadow-md">
          {MONTHS.map((m) => (
            <button
              key={m}
              type="button"
              className="
                w-full mb-2 flex items-center
                rounded-xl px-3 py-2
                text-base font-bold tracking-wide
                bg-transparent text-[#F5FEFA]/80
                hover:bg-white/10 hover:text-white
                transition-all duration-150
              "
            >
              <span className="mr-3 h-6 w-1.5 rounded-full bg-white/10" />
              <span className="truncate">{m}</span>
            </button>
          ))}
        </aside>

        {/* MAIN AREA */}
        <div className="flex min-h-[calc(100svh-3rem)] flex-1 flex-col gap-6">
          {/* TOP BAR */}
          <header className="flex items-center justify-between rounded-2xl bg-black/10 px-6 py-4 backdrop-blur-sm shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#454545]">
                <span className="text-lg font-bold">£</span>
              </div>
              <span className="text-sm font-semibold tracking-wide">
                Web App
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm">{profileName}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#454545]">
                <span className="text-xs font-semibold">PN</span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="text-white/80"
              >
                <path
                  d="M6 9l6 6 6-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </header>

          {/* TOP ROW: BALANCE + TRANSACTIONS */}
          <div className="mt-6 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
            {/* CURRENT BALANCE CARD */}
            <section className="rounded-2xl bg-black/10 px-6 pt-5 pb-2 backdrop-blur-sm shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                    Current Balance
                  </p>
                  <p className="mt-1 text-3xl font-extrabold">
                    {formatCurrency(selectedAccount?.balance ?? 0)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewAccountOpen(true)}
                  className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-[#F5FEFA] hover:bg-white/30"
                  aria-label="Add account"
                >
                  +
                </button>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsNewTxOpen(true)}
                  className="
                    w-full
                    rounded-full
                    bg-[#F5FEFA]
                    py-3
                    text-sm font-semibold
                    text-[#454545]
                    shadow-sm
                    hover:bg-[#454545]
                    hover:text-[#F5FEFA]
                    transition
                  "
                >
                  <span className="btn-label-full">New Transaction</span>
                  <span className="btn-label-wrap">
                    New
                    <br />
                    Transaction
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTransferOpen(true)}
                  className="
                    w-full
                    rounded-full
                    bg-[#F5FEFA]
                    py-3
                    text-sm font-semibold
                    text-[#454545]
                    shadow-sm
                    hover:bg-[#454545]
                    hover:text-[#F5FEVA]
                    transition
                  "
                >
                  <span className="btn-label-full">New Transfer</span>
                  <span className="btn-label-wrap">
                    New
                    <br />
                    Transfer
                  </span>
                </button>
              </div>

              {/* ACCOUNT CAROUSEL */}
              <div className="mt-6 flex items-center gap-3">
                {/* Left arrow */}
                <button
                  type="button"
                  onClick={handlePrevAccount}
                  className="
                    flex h-7 w-7 items-center justify-center
                    rounded-full text-xs
                    bg-white/10 text-white/80
                    hover:bg-white/20 hover:text.white
                    transition
                  "
                >
                  {"<"}
                </button>

                {/* Account pills */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    {visibleAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => handleAccountClick(account.id)}
                          className={`
                            h-10 w-full rounded-2xl text-sm font-semibold transition
                            ${
                              selectedAccount &&
                              account.id === selectedAccount.id
                                ? "bg-white/20 text-[#F5FEFA]"
                                : "bg-white/10 text-[#F5FEFA]/80 hover:bg-white/16"
                            }
                          `}
                        >
                          {account.name}
                        </button>
                        {selectedAccount &&
                          selectedAccount.id === account.id &&
                          editButtonForId === account.id && (
                            <button
                              type="button"
                              onClick={() => setEditingAccount(account)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs text-[#F5FEFA] hover:bg-white/30"
                              title="Edit account"
                            >
                              ✎
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right arrow */}
                <button
                  type="button"
                  onClick={handleNextAccount}
                  className="
                    flex h-7 w-7 items-center justify-center
                    rounded-full text-xs
                    bg-white/10 text-white/80
                    hover:bg-white/20 hover:text-white
                    transition
                  "
                >
                  {">"}
                </button>
              </div>
            </section>

            {/* TRANSACTIONS CARD */}
            <section className="rounded-2xl bg-black/10 px-6 py-5 backdrop-blur-sm shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Transactions</p>
                <button
                  type="button"
                  onClick={() => setIsTransactionsModalOpen(true)}
                  className="text-xs text-white/80 hover:text-white"
                >
                  more
                </button>
              </div>

              <div className="space-y-2 text-sm opacity-90">
                {visibleTransactions.length === 0 && (
                  <div className="text-xs opacity-60">
                    No transactions yet for this account.
                  </div>
                )}

                {visibleTransactions
                  .slice()
                  .reverse()
                  .slice(0, 3)
                  .map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                    >
                      <span>{tx.description || "Transaction"}</span>
                      <span
                        className={
                          tx.amount < 0
                            ? "text-red-200"
                            : "text-emerald-200"
                        }
                      >
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          </div>

          {/* MIDDLE ROW: NET WORTH + UPCOMING BILLS */}
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
            <section className="rounded-2xl bg-black/10 px-6 py-5 backdrop-blur-sm shadow-md">
              <p className="mb-3 text-sm font-semibold">Net Worth</p>
              <div className="flex h-40 items-center justify-center rounded-xl bg-white/5 text-xs opacity-60">
                Net worth chart placeholder
              </div>
            </section>

            <section className="rounded-2xl bg-black/10 px-6 py-5 backdrop-blur-sm shadow-md">
              <p className="mb-3 text-sm font-semibold">Upcoming Bills</p>
              <div className="flex h-40 items-center justify-center rounded-xl bg-white/5 text-xs opacity-60">
                Upcoming bills list placeholder
              </div>
            </section>
          </div>

          {/* BOTTOM ROW: DEBT PAYOFF PROGRESS */}
          <section className="mb-2 flex items-center justify-between rounded-2xl bg-black/10 px-6 py-4 backdrop-blur-sm shadow-md">
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-sm font-semibold">Debt Payoff Progress</p>
              <div className="h-4 w-full rounded-full bg-white/10">
                <div className="h-4 w-1/3 rounded-full bg-[#715B64]" />
              </div>
            </div>
            <button
              type="button"
              className="ml-4 text-xs text-white/80 hover:text-white"
            >
              Edit
            </button>
          </section>
        </div>
      </div>

      {/* NEW TRANSACTION MODAL */}
      {isNewTxOpen && selectedAccount && (
        <NewTransactionModal
          onClose={() => setIsNewTxOpen(false)}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSave={addTransaction}
        />
      )}

      {/* NEW TRANSFER MODAL */}
      {isTransferOpen && selectedAccount && (
        <NewTransferModal
          onClose={() => setIsTransferOpen(false)}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onTransfer={handleTransfer}
        />
      )}

      {/* NEW ACCOUNT MODAL */}
      {isNewAccountOpen && (
        <NewAccountModal
          onClose={() => setIsNewAccountOpen(false)}
          onSave={handleAddAccount}
        />
      )}

      {/* EDIT ACCOUNT MODAL */}
      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => {
            setEditingAccount(null);
            setEditButtonForId(null);
          }}
          onSave={({ name, balance }) => {
            handleSaveEditedAccount(editingAccount, { name, balance });
            setEditingAccount(null);
            setEditButtonForId(null);
          }}
        />
      )}

      {/* FULL TRANSACTIONS MODAL */}
      {isTransactionsModalOpen && selectedAccount && (
        <TransactionsHistoryModal
          onClose={() => setIsTransactionsModalOpen(false)}
          account={selectedAccount}
          transactions={transactions.filter(
            (tx) => tx.accountId === selectedAccount.id
          )}
          onEditDetails={(tx) => setEditingDetailsTx(tx)}
          onEditAmount={(tx) => setEditingAmountTx(tx)}
        />
      )}

      {/* EDIT TRANSACTION – DETAILS (title + date) */}
      {editingDetailsTx && (
        <EditTransactionDetailsModal
          transaction={editingDetailsTx}
          onClose={() => setEditingDetailsTx(null)}
          onSave={(updates) => {
            handleUpdateTransaction(editingDetailsTx.id, updates);
            setEditingDetailsTx(null);
          }}
        />
      )}

      {/* EDIT TRANSACTION – AMOUNT */}
      {editingAmountTx && (
        <EditTransactionAmountModal
          transaction={editingAmountTx}
          onClose={() => setEditingAmountTx(null)}
          onSave={(amount) => {
            handleUpdateTransaction(editingAmountTx.id, { amount });
            setEditingAmountTx(null);
          }}
        />
      )}

      {/* THEME TOGGLE */}
      <button
        onClick={toggle}
        className={`fixed bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-colors duration-200 ${
          theme === "dark"
            ? "bg-white/10 text-brand-accent hover:bg-white/15"
            : "bg-black/10 text-[#454545] hover:bg-black/15"
        }`}
        aria-label="Toggle theme"
        aria-pressed={theme === "dark"}
        title={
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="11" r="4" />
          <path d="M10 18h4M10 21h4" />
        </svg>
      </button>
    </div>
  );
}

/* ---------- MODALS ---------- */

type ModalPropsBase = {
  onClose: () => void;
  accounts: Account[];
  selectedAccountId: string;
};

type NewTransactionModalProps = ModalPropsBase & {
  onSave: (t: Transaction) => void;
};

function NewTransactionModal({
  onClose,
  accounts,
  selectedAccountId,
  onSave,
}: NewTransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);
  const [txType, setTxType] = useState<"expense" | "income">("expense");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const rawAmount = amount;
    const amountNumber = parseFloat(rawAmount);

    if (!rawAmount || Number.isNaN(amountNumber) || amountNumber === 0) {
      setAmountError("Enter an amount");
      return;
    }

    setAmountError("");

    const accountId =
      (formData.get("accountId") as string) || selectedAccountId;

    const finalAmount =
      txType === "income" ? Math.abs(amountNumber) : -Math.abs(amountNumber);

    const date =
      (formData.get("date") as string) ||
      new Date().toISOString().slice(0, 10);

    const description =
      (formData.get("description") as string) || "Transaction";

    onSave({
      id: crypto.randomUUID(),
      accountId,
      amount: finalAmount,
      date,
      description,
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-[#E9F2F5] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#454545]">
              New Transaction
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#454545]/70 hover:text-[#454545]"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Account
              </label>
              <select
                name="accountId"
                defaultValue={selectedAccountId}
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                  Amount
                </label>
                <input
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={() => setIsPadOpen(true)}
                  className="mt-1 text-[11px] font-semibold text-[#715B64] hover:text-[#5d4953]"
                >
                  Open number pad
                </button>
                {amountError && (
                  <p className="mt-1 text-xs text-red-500">{amountError}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                  Type
                </label>
                <div className="mt-[2px] flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType("expense")}
                    className={`
                      flex-1 rounded-full px-3 py-2 text-xs font-semibold transition
                      ${
                        txType === "expense"
                          ? "bg-[#715B64] text-white shadow-sm"
                          : "bg-white text-[#454545] border border-[#C2D0D6] hover:bg-[#F3F6F8]"
                      }
                    `}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType("income")}
                    className={`
                      flex-1 rounded-full px-3 py-2 text-xs font-semibold transition
                      ${
                        txType === "income"
                          ? "bg-[#715B64] text-white shadow-sm"
                          : "bg-white text-[#454545] border border-[#C2D0D6] hover:bg-[#F3F6F8]"
                      }
                    `}
                  >
                    Income
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                  Date
                </label>
                <input
                  name="date"
                  type="date"
                  className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                  Description
                </label>
                <input
                  name="description"
                  type="text"
                  className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                  placeholder="e.g. Groceries"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#454545]/80 hover:bg.black/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#715B64] px-4 py-2 text-xs font-semibold text.white hover:bg-[#5d4953]"
              >
                Save Transaction
              </button>
            </div>
          </form>
        </div>
      </div>

      {isPadOpen && (
        <NumberPad
          value={amount}
          onChange={setAmount}
          onClose={() => setIsPadOpen(false)}
        />
      )}
    </>
  );
}

type NewAccountModalProps = {
  onClose: () => void;
  onSave: (account: Account) => void;
};

function NewAccountModal({ onClose, onSave }: NewAccountModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let valid = true;

    if (!name.trim()) {
      setNameError("Enter a name");
      valid = false;
    } else {
      setNameError("");
    }

    const rawAmount = amount;
    const parsedAmount = rawAmount === "" ? 0 : parseFloat(rawAmount);

    if (rawAmount !== "" && Number.isNaN(parsedAmount)) {
      setAmountError("Enter an amount");
      valid = false;
    } else {
      setAmountError("");
    }

    if (!valid) return;

    const newAccount: Account = {
      id: crypto.randomUUID(),
      name: name.trim(),
      balance: parsedAmount,
    };

    onSave(newAccount);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg.black/50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-[#E9F2F5] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#454545]">
              New Account
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#454545]/70 hover:text-[#454545]"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Account name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                placeholder="e.g. Chequing, Savings 2, Travel"
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-500">{nameError}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Starting balance
              </label>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setIsPadOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[#715B64] hover:text-[#5d4953]"
              >
                Open number pad
              </button>
              {amountError && (
                <p className="mt-1 text-xs text-red-500">{amountError}</p>
              )}
              <p className="mt-1 text-[11px] text-[#454545]/60">
                You can use negative values for debts or credit balances.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#454545]/80 hover:bg.black/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#715B64] px-4 py-2 text-xs font-semibold text.white hover:bg-[#5d4953]"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      </div>

      {isPadOpen && (
        <NumberPad
          value={amount}
          onChange={setAmount}
          onClose={() => setIsPadOpen(false)}
        />
      )}
    </>
  );
}

type EditAccountModalProps = {
  account: Account;
  onClose: () => void;
  onSave: (updates: { name: string; balance: number }) => void;
};

function EditAccountModal({
  account,
  onClose,
  onSave,
}: EditAccountModalProps) {
  const [name, setName] = useState(account.name);
  const [balanceStr, setBalanceStr] = useState(account.balance.toString());
  const [nameError, setNameError] = useState("");
  const [balanceError, setBalanceError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let valid = true;

    if (!name.trim()) {
      setNameError("Enter a name");
      valid = false;
    } else {
      setNameError("");
    }

    const raw = balanceStr.trim();
    const parsed = raw === "" ? 0 : parseFloat(raw);

    if (raw !== "" && Number.isNaN(parsed)) {
      setBalanceError("Enter an amount");
      valid = false;
    } else {
      setBalanceError("");
    }

    if (!valid) return;

    onSave({
      name: name.trim(),
      balance: parsed,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-30 flex items-center justify-center bg.black/50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-[#E9F2F5] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#454545]">
              Edit Account
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#454545]/70 hover:text-[#454545]"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Account name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-500">{nameError}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Balance
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setIsPadOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[#715B64] hover:text-[#5d4953]"
              >
                Open number pad
              </button>
              {balanceError && (
                <p className="mt-1 text-xs text-red-500">{balanceError}</p>
              )}
              <p className="mt-1 text-[11px] text-[#454545]/60">
                Negative values represent debts or credit card balances.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#454545]/80 hover:bg.black/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#715B64] px-4 py-2 text-xs font-semibold text.white hover:bg-[#5d4953]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {isPadOpen && (
        <NumberPad
          value={balanceStr}
          onChange={setBalanceStr}
          onClose={() => setIsPadOpen(false)}
        />
      )}
    </>
  );
}

type NewTransferModalProps = ModalPropsBase & {
  onTransfer: (args: TransferInput) => void;
};

function NewTransferModal({
  onClose,
  accounts,
  selectedAccountId,
  onTransfer,
}: NewTransferModalProps) {
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [formError, setFormError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setAmountError("");
    setFormError("");

    const rawAmount = amount;
    const parsed = parseFloat(rawAmount);

    if (!rawAmount || Number.isNaN(parsed) || parsed === 0) {
      setAmountError("Enter an amount");
      return;
    }

    const amountNumber = Math.abs(parsed);

    const fromAccountId =
      (formData.get("fromAccountId") as string) || selectedAccountId;
    const toAccountId =
      (formData.get("toAccountId") as string) || selectedAccountId;

    if (fromAccountId === toAccountId) {
      setFormError("Choose two different accounts.");
      return;
    }

    const date =
      (formData.get("date") as string) ||
      new Date().toISOString().slice(0, 10);

    const note = (formData.get("note") as string) || "";

    onTransfer({
      fromAccountId,
      toAccountId,
      amount: amountNumber,
      date,
      note,
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg.black/50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-[#E9F2F5] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#454545]">
              New Transfer
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#454545]/70 hover:text-[#454545]"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                  From
                </label>
                <select
                  name="fromAccountId"
                  defaultValue={selectedAccountId}
                  className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                  To
                </label>
                <select
                  name="toAccountId"
                  defaultValue={
                    accounts.find((a) => a.id !== selectedAccountId)?.id ||
                    selectedAccountId
                  }
                  className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Amount
              </label>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setIsPadOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[#715B64] hover:text-[#5d4953]"
              >
                Open number pad
              </button>
              {amountError && (
                <p className="mt-1 text-xs text-red-500">{amountError}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Date
              </label>
              <input
                name="date"
                type="date"
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                defaultValue={new Date().toISOString().slice(0, 10)}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
                Note (optional)
              </label>
              <input
                name="note"
                type="text"
                className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
                placeholder="e.g. Move to savings"
              />
              {formError && (
                <p className="mt-1 text-xs text-red-500">{formError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#454545]/80 hover:bg.black/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#715B64] px-4 py-2 text-xs font-semibold text.white hover:bg-[#5d4953]"
              >
                Save Transfer
              </button>
            </div>
          </form>
        </div>
      </div>

      {isPadOpen && (
        <NumberPad
          value={amount}
          onChange={setAmount}
          onClose={() => setIsPadOpen(false)}
        />
      )}
    </>
  );
}

type TransactionsHistoryModalProps = {
  onClose: () => void;
  account: Account;
  transactions: Transaction[];
  onEditDetails: (tx: Transaction) => void;
  onEditAmount: (tx: Transaction) => void;
};

function TransactionsHistoryModal({
  onClose,
  account,
  transactions,
  onEditDetails,
  onEditAmount,
}: TransactionsHistoryModalProps) {
  type SortMode = "date" | "expense" | "income";
  const [sortMode, setSortMode] = useState<SortMode>("date");

  const sorted = [...transactions].sort((a, b) => {
    const dateDiff =
      new Date(b.date).getTime() - new Date(a.date).getTime();

    if (sortMode === "date") {
      return dateDiff;
    }

    const signA = a.amount < 0 ? -1 : 1;
    const signB = b.amount < 0 ? -1 : 1;

    if (sortMode === "expense") {
      if (signA !== signB) return signA - signB; // negatives first
      return dateDiff;
    }

    if (sortMode === "income") {
      if (signA !== signB) return signB - signA; // positives first
      return dateDiff;
    }

    return dateDiff;
  });

  const sortBtnBase =
    "ml-2 rounded-full border border-[#C2D0D6] px-2 py-1 text-xs font-semibold text-[#454545]/80 hover:bg.black/5";

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg.black/50 px-4">
      <div className="flex w-full max-w-2xl max-h-[70vh] flex-col rounded-2xl bg-[#E9F2F5] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#454545]">
                Transactions – {account.name}
              </h2>
              <button
                type="button"
                className={`${sortBtnBase} ${
                  sortMode === "date" ? "bg.black/5" : ""
                }`}
                onClick={() => setSortMode("date")}
                title="Sort by date"
              >
                📅
              </button>
              <button
                type="button"
                className={`${sortBtnBase} ${
                  sortMode === "expense" ? "bg.black/5" : ""
                }`}
                onClick={() => setSortMode("expense")}
                title="Show expenses first"
              >
                -$
              </button>
              <button
                type="button"
                className={`${sortBtnBase} ${
                  sortMode === "income" ? "bg.black/5" : ""
                }`}
                onClick={() => setSortMode("income")}
                title="Show income first"
              >
                +$
              </button>
            </div>
            <p className="mt-1 text-xs text-[#454545]/70">
              Full history for this account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#454545]/70 hover:text-[#454545]"
          >
            ✕
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-[#454545]/60">
            No transactions yet for this account.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-2 text-sm">
              {sorted.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[#454545]"
                >
                  <button
                    type="button"
                    onClick={() => onEditDetails(tx)}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <span className="font-semibold">
                      {tx.description || "Transaction"}
                    </span>
                    <span className="text-xs text-[#454545]/70">
                      {tx.date}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditAmount(tx)}
                    className={`ml-4 text-right text-sm font-semibold ${
                      tx.amount < 0 ? "text-red-500" : "text-emerald-600"
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* EDIT TRANSACTION – DETAILS MODAL */

type EditTransactionDetailsModalProps = {
  transaction: Transaction;
  onClose: () => void;
  onSave: (updates: { description: string; date: string }) => void;
};

function EditTransactionDetailsModal({
  transaction,
  onClose,
  onSave,
}: EditTransactionDetailsModalProps) {
  const [description, setDescription] = useState(transaction.description);
  const [date, setDate] = useState(transaction.date);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave({
      description: description.trim() || "Transaction",
      date,
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg.black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#E9F2F5] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#454545]">
            Edit Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#454545]/70 hover:text-[#454545]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
              Title
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-semibold text-[#454545]/80 hover:bg.black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#715B64] px-4 py-2 text-xs font-semibold text.white hover:bg-[#5d4953]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* EDIT TRANSACTION – AMOUNT MODAL */

type EditTransactionAmountModalProps = {
  transaction: Transaction;
  onClose: () => void;
  onSave: (amount: number) => void;
};

function EditTransactionAmountModal({
  transaction,
  onClose,
  onSave,
}: EditTransactionAmountModalProps) {
  const [amountStr, setAmountStr] = useState(
    Math.abs(transaction.amount).toString()
  );
  const [error, setError] = useState("");

  const isExpense = transaction.amount < 0;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = parseFloat(amountStr);
    if (!amountStr || Number.isNaN(parsed) || parsed === 0) {
      setError("Enter an amount");
      return;
    }
    const finalAmount = isExpense ? -Math.abs(parsed) : Math.abs(parsed);
    onSave(finalAmount);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg.black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#E9F2F5] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#454545]">
            Edit Amount
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#454545]/70 hover:text-[#454545]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#454545]/80">
              Amount ({isExpense ? "expense" : "income"})
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full rounded-lg border border-[#C2D0D6] bg-white px-3 py-2 text-sm text-[#454545] outline-none focus:ring-2 focus:ring-[#715B64]"
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-semibold text-[#454545]/80 hover:bg.black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#715B64] px-4 py-2 text-xs font-semibold text.white hover:bg-[#5d4953]"
            >
              Save Amount
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* NUMBER PAD */

type NumberPadProps = {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
};

function NumberPad({ value, onChange, onClose }: NumberPadProps) {
  const handleDigit = (digit: string) => {
    if (digit === ".") {
      if (value.includes(".")) return;
      const next = value === "" ? "0." : value + ".";
      onChange(next);
      return;
    }

    if (value === "0") {
      onChange(digit);
    } else {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    if (!value) return;
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange("");
  };

  const display = value === "" ? "0.00" : value;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg.black/40 px-4">
      <div className="w-full max-w-xs rounded-2xl bg-[#E9F2F5] p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#454545]/70">
            Amount
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#454545]/70 hover:text-[#454545]"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 rounded-lg bg-white px-3 py-2 text-right text-lg font-semibold text-[#454545]">
          {display}
        </div>

        <div className="mb-2 grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigit(String(n))}
              className="rounded-lg bg-white px-3 py-2 text-base font-semibold text-[#454545] hover:bg[#D9E3E8]"
            >
              {n}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="rounded-lg bg-white px-3 py-2 text-base font-semibold text-[#454545] hover:bg[#D9E3E8]"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleDigit(".")}
            className="rounded-lg bg-white px-3 py-2 text-base font-semibold text-[#454545] hover:bg[#D9E3E8]"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="rounded-lg bg-white px-3 py-2 text-base font-semibold text-[#454545] hover:bg[#D9E3E8]"
          >
            ⌫
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 rounded-full border border-[#C2D0D6] px-3 py-2 text-xs font-semibold text-[#454545]/80 hover:bg.black/5"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-[#715B64] px-3 py-2 text-xs font-semibold text.white hover:bg[#5d4953]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
