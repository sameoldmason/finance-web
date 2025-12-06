// src/routes/Dashboard.tsx
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeMode, ThemePalette, useTheme } from "../ThemeProvider";
import { useActiveProfile } from "../ActiveProfileContext";
import {
  Account,
  AccountCategory,
  NetWorthSnapshot,
  Transaction,
  TransferInput,
} from "../lib/financeTypes";
import { loadDashboardData, saveDashboardData } from "../lib/dashboardStore";
import type { Bill } from "../lib/financeTypes";
import { calculateNetWorthFromAccounts } from "../lib/netWorth";
import { MoneyVisibilityProvider } from "../MoneyVisibilityContext";
import { NetWorthCard } from "../components/dashboard/NetWorthCard";
import { deleteProfile, updateProfileName } from "../lib/profiles";

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

type ResetChoice =
  | "transactions"
  | "transfers"
  | "transactions-transfers"
  | "accounts-all";

function isTransferTransaction(tx: Transaction) {
  if (tx.kind === "transfer") return true;
  const description = tx.description?.toLowerCase() ?? "";
  return (
    description.startsWith("transfer") ||
    description.includes("transfer in") ||
    description.includes("transfer out")
  );
}

function rollbackAccountsFromTransactions(
  accounts: Account[],
  txs: Transaction[]
) {
  if (txs.length === 0) return accounts;

  const deltaByAccount = new Map<string, number>();
  txs.forEach((tx) => {
    deltaByAccount.set(
      tx.accountId,
      (deltaByAccount.get(tx.accountId) ?? 0) + tx.amount
    );
  });

  return accounts.map((acc) => {
    const delta = deltaByAccount.get(acc.id);
    if (!delta) return acc;
    return { ...acc, balance: acc.balance - delta };
  });
}

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getNextDueDate(bill: Bill, paidOn: string) {
  const baseDate = bill.dueDate || paidOn;
  const d = new Date(`${baseDate}T00:00:00`);

  if (Number.isNaN(d.getTime())) return paidOn;

  switch (bill.frequency) {
    case "weekly": {
      d.setDate(d.getDate() + 7);
      break;
    }
    case "biweekly": {
      d.setDate(d.getDate() + 14);
      break;
    }
    case "monthly":
    default: {
      d.setMonth(d.getMonth() + 1);
    }
  }

  return d.toISOString().slice(0, 10);
}

function getDueStatus(dueDate: string) {
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.ceil(
    (due.getTime() - startOfToday().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (Number.isNaN(diffDays)) {
    return { label: "No due date", tone: "muted" as const };
  }

  if (diffDays < 0) {
    const overdueBy = Math.abs(diffDays);
    return {
      label: `Overdue by ${overdueBy} day${overdueBy === 1 ? "" : "s"}`,
      tone: "danger" as const,
    };
  }

  if (diffDays === 0) {
    return { label: "Due today", tone: "warning" as const };
  }

  if (diffDays === 1) {
    return { label: "Due tomorrow", tone: "warning" as const };
  }

  if (diffDays <= 7) {
    return { label: `Due in ${diffDays} days`, tone: "warning" as const };
  }

  return { label: `Due ${dueDate}`, tone: "muted" as const };
}

export default function Dashboard() {
  const { theme, currentPalette } = useTheme();
  const navigate = useNavigate();
  const { activeProfile, setActiveProfileId } = useActiveProfile();

  // Accounts + selection
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [deletedAccounts, setDeletedAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    INITIAL_ACCOUNTS[0]?.id ?? ""
  );
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [editButtonForId, setEditButtonForId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Bills
  const [bills, setBills] = useState<Bill[]>([]);

  // Net worth
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthSnapshot[]>([]);
  const [netWorthViewMode, setNetWorthViewMode] = useState<
    "minimal" | "detailed"
  >("detailed");
  const [hideMoney, setHideMoney] = useState(false);
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileNameError, setProfileNameError] = useState("");

  // Modals
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAccountsListOpen, setIsAccountsListOpen] = useState(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] =
    useState(false);
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [isBillsModalOpen, setIsBillsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetChoice, setResetChoice] = useState<ResetChoice | null>(null);
  const [isDeleteProfilePromptOpen, setIsDeleteProfilePromptOpen] =
    useState(false);
  const [isLogoutPromptOpen, setIsLogoutPromptOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Edit-transaction modals
  const [editingDetailsTx, setEditingDetailsTx] = useState<Transaction | null>(
    null
  );
  const [editingAmountTx, setEditingAmountTx] = useState<Transaction | null>(
    null
  );

  useEffect(() => {
    if (activeProfile) {
      setProfileNameInput(activeProfile.name);
      setIsEditingProfileName(false);
      setProfileNameError("");
    } else {
      setProfileNameInput("");
      setIsEditingProfileName(false);
    }
  }, [activeProfile]);

  // Load saved data when the active profile changes
  useEffect(() => {
    const profileId = activeProfile?.id;

    if (!profileId) {
      setAccounts(INITIAL_ACCOUNTS);
      setDeletedAccounts([]);
      setSelectedAccountId(INITIAL_ACCOUNTS[0]?.id ?? "");
      setCarouselStartIndex(0);
      setTransactions([]);
      setBills([]);
      setNetWorthHistory([]);
      setNetWorthViewMode("detailed");
      setHideMoney(false);
      setEditButtonForId(null);
      setIsAccountsListOpen(false);
      return;
    }

    const loaded = loadDashboardData(profileId);

    if (!loaded) {
      setAccounts(INITIAL_ACCOUNTS);
      setDeletedAccounts([]);
      setSelectedAccountId(INITIAL_ACCOUNTS[0]?.id ?? "");
      setCarouselStartIndex(0);
      setTransactions([]);
      setBills([]);
      setNetWorthHistory([]);
      setNetWorthViewMode("detailed");
      setHideMoney(false);
      setEditButtonForId(null);
      setIsAccountsListOpen(false);
      return;
    }

    const accountsFromStore: Account[] =
      loaded.accounts && loaded.accounts.length > 0
        ? loaded.accounts
        : INITIAL_ACCOUNTS;

    const normalizedAccounts: Account[] = accountsFromStore.map(
      (acc): Account => ({
        ...acc,
        accountCategory: (acc.accountCategory === "debt"
          ? "debt"
          : "asset") as AccountCategory,
      })
    );

    const txFromStore = loaded.transactions ?? [];
    const billsFromStore = loaded.bills ?? [];

    const deletedFromStore = dedupeAccountsById(loaded.deletedAccounts ?? []);
    const deletedIds = new Set(deletedFromStore.map((acc) => acc.id));
    const cleanedAccounts = dedupeAccountsById(
      normalizedAccounts.filter((acc) => !deletedIds.has(acc.id))
    );

    setAccounts(cleanedAccounts);
    setDeletedAccounts(deletedFromStore);
    setSelectedAccountId(cleanedAccounts[0]?.id ?? "");
    setCarouselStartIndex(0);
    setTransactions(txFromStore);
    setBills(billsFromStore);
    setNetWorthHistory(loaded.netWorthHistory ?? []);
    setNetWorthViewMode(loaded.netWorthViewMode ?? "detailed");
    setHideMoney(loaded.hideMoney ?? false);
    setEditButtonForId(null);
  }, [activeProfile?.id]);

  // Update net worth snapshot when accounts change
  useEffect(() => {
    const profileId = activeProfile?.id;
    if (!profileId) return;
    if (accounts.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const { netWorth, totalAssets, totalDebts } =
      calculateNetWorthFromAccounts(accounts);

    const snapshot: NetWorthSnapshot = {
      date: today,
      value: netWorth,
      totalAssets,
      totalDebts,
    };

    setNetWorthHistory((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.date === today);
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = snapshot;
        return next;
      }
      return [...prev, snapshot];
    });
  }, [accounts, activeProfile?.id]);

  // Save whenever accounts / transactions / bills change
  useEffect(() => {
    const profileId = activeProfile?.id;
    if (!profileId) return;

    saveDashboardData(profileId, {
      accounts,
      deletedAccounts,
      transactions,
      bills,
      netWorthHistory,
      netWorthViewMode,
      hideMoney,
    });
  }, [
    accounts,
    transactions,
    bills,
    netWorthHistory,
    netWorthViewMode,
    hideMoney,
    deletedAccounts,
    activeProfile?.id,
  ]);

  // Derived bits
  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const unpaidBills = bills.filter((b) => !b.isPaid);

  const visibleTransactions = selectedAccount
    ? transactions.filter((tx) => tx.accountId === selectedAccount.id)
    : [];

  // Account carousel
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

  // Transactions
  function addTransaction(t: Transaction) {
    const txToAdd: Transaction = { ...t, kind: t.kind ?? "transaction" };
    setTransactions((prev) => [...prev, txToAdd]);

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === txToAdd.accountId
          ? { ...acc, balance: acc.balance + txToAdd.amount }
          : acc
      )
    );
  }

  // Bills
  function handleAddBill(newBill: Bill) {
    setBills((prev) => [...prev, newBill]);
  }

  function handleUpdateBill(updatedBill: Bill) {
    setBills((prev) =>
      prev.map((bill) => (bill.id === updatedBill.id ? updatedBill : bill))
    );
  }

  function handleMarkBillPaid(bill: Bill) {
    const today = new Date().toISOString().slice(0, 10);
    const amount = Math.abs(bill.amount);

    // 1) Create a transaction (expense)
    const tx: Transaction = {
      id: crypto.randomUUID(),
      accountId: bill.accountId,
      amount: -amount,
      date: today,
      description: bill.name || "Bill payment",
      kind: "transaction",
    };

    setTransactions((prev) => [...prev, tx]);

    // 2) Update account balance
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === bill.accountId
          ? { ...acc, balance: acc.balance - amount }
          : acc
      )
    );

    // 3) Update bill: move monthly forward, hide one-time bills
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== bill.id) return b;

        const frequency = b.frequency ?? "once";

        if (frequency === "once") {
          // one-time bill → mark as paid so it disappears from “upcoming”
          return { ...b, isPaid: true };
        }

        const nextDue = getNextDueDate(b, today);
        return { ...b, dueDate: nextDue, isPaid: false };
      })
    );
  }

  // Update existing transaction (and adjust account balance if amount changed)
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

  function handleDeleteTransaction(id: string) {
    let txToDelete: Transaction | undefined;

    setTransactions((prev) => {
      const found = prev.find((tx) => tx.id === id);

      if (!found) return prev;

      txToDelete = found;
      return prev.filter((tx) => tx.id !== id);
    });

    const foundTx = txToDelete;
    if (!foundTx) return;

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === foundTx.accountId
          ? { ...acc, balance: acc.balance - foundTx.amount }
          : acc
      )
    );
  }

  // Add account
  function handleAddAccount(newAccount: Account) {
    const nextAccount: Account = {
      ...newAccount,
      accountCategory:
        newAccount.accountCategory === "debt" ? "debt" : "asset",
    };

    setAccounts((prev) => [...prev, nextAccount]);
    setSelectedAccountId(nextAccount.id);
    if (accounts.length === 0) {
      setCarouselStartIndex(0);
    }
  }

  // Transfer between accounts
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
    const fromAccount = accounts.find((acc) => acc.id === fromAccountId);
    const toAccount = accounts.find((acc) => acc.id === toAccountId);

    if (!fromAccount || !toAccount) return;

    const fromIsDebt = fromAccount.accountCategory === "debt";
    const toIsDebt = toAccount.accountCategory === "debt";

    // Update balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === fromAccountId) {
          const delta = fromIsDebt ? cleanAmount : -cleanAmount;
          return { ...acc, balance: acc.balance + delta };
        }
        if (acc.id === toAccountId) {
          const delta = toIsDebt ? -cleanAmount : cleanAmount;
          return { ...acc, balance: acc.balance + delta };
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
        amount: fromIsDebt ? cleanAmount : -cleanAmount,
        date,
        description: note || "Transfer out",
        kind: "transfer",
      },
      {
        id: crypto.randomUUID(),
        accountId: toAccountId,
        amount: toIsDebt ? -cleanAmount : cleanAmount,
        date,
        description: note || "Transfer in",
        kind: "transfer",
      },
    ]);
  }

  // Save edited account (and create a balance adjustment transaction if needed)
  function handleSaveEditedAccount(
    original: Account,
    updates: {
      name: string;
      balance: number;
      accountCategory: AccountCategory;
      creditLimit?: number | null;
      aprPercent?: number | null;
    }
  ) {
    const trimmedName = updates.name.trim() || original.name;
    const nextBalance = updates.balance;
    const nextCategory = updates.accountCategory ?? original.accountCategory;
    const delta = nextBalance - original.balance;

    const nextCreditLimit =
      nextCategory === "debt" ? updates.creditLimit ?? null : null;
    const nextAprPercent =
      nextCategory === "debt" ? updates.aprPercent ?? null : null;

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === original.id
          ? {
              ...acc,
              name: trimmedName,
              balance: nextBalance,
              accountCategory: nextCategory,
              creditLimit: nextCreditLimit,
              aprPercent: nextAprPercent,
            }
          : acc
      )
    );

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
          kind: "transaction",
        },
      ]);
    }
  }

  function handleDeleteAccount(accountId: string) {
    setAccounts((prev) => {
      const index = prev.findIndex((acc) => acc.id === accountId);
      if (index === -1) return prev;

      const removedAccount = prev[index];
      setDeletedAccounts((prevDeleted) =>
        dedupeAccountsById([...prevDeleted, removedAccount])
      );

      const next = prev.filter((acc) => acc.id !== accountId);

      let nextSelectedId = selectedAccountId;
      if (selectedAccountId === accountId) {
        if (next.length === 0) {
          nextSelectedId = "";
        } else {
          const replacementIndex = Math.min(index, next.length - 1);
          nextSelectedId = next[replacementIndex]?.id ?? next[0].id;
        }
      }

      let nextCarouselStart = carouselStartIndex;
      if (next.length === 0) {
        nextCarouselStart = 0;
      } else if (carouselStartIndex >= next.length) {
        nextCarouselStart = next.length - 1;
      } else if (index < carouselStartIndex && carouselStartIndex > 0) {
        nextCarouselStart = carouselStartIndex - 1;
      }

      setSelectedAccountId(nextSelectedId);
      setCarouselStartIndex(nextCarouselStart);

      return next;
    });

    setTransactions((prev) => prev.filter((tx) => tx.accountId !== accountId));
    setBills((prev) => prev.filter((bill) => bill.accountId !== accountId));

    setEditingAccount(null);
    setEditButtonForId(null);
  }

  function handleRestoreAccount(accountId: string) {
    let restored: Account | undefined;

    setDeletedAccounts((prevDeleted) => {
      restored = prevDeleted.find((acc) => acc.id === accountId);
      return prevDeleted.filter((acc) => acc.id !== accountId);
    });

    if (!restored) return;

    setAccounts((prevAccounts) => {
      if (prevAccounts.some((acc) => acc.id === accountId)) {
        return prevAccounts;
      }

      const next = dedupeAccountsById([...prevAccounts, restored!]);
      if (!selectedAccountId) {
        setSelectedAccountId(restored!.id);
      }
      if (prevAccounts.length === 0) {
        setCarouselStartIndex(0);
      }
      return next;
    });
  }

  function performReset(choice: ResetChoice) {
    if (!activeProfile) return;

    const removeTransfers =
      choice === "transfers" ||
      choice === "transactions-transfers" ||
      choice === "accounts-all";
    const removeTransactions =
      choice === "transactions" ||
      choice === "transactions-transfers" ||
      choice === "accounts-all";

    const shouldAdjustAccounts = choice !== "accounts-all";
    let removed: Transaction[] = [];

    setTransactions((prev) => {
      if (prev.length === 0) return prev;

      const keep: Transaction[] = [];
      const toRemove: Transaction[] = [];

      prev.forEach((tx) => {
        const isTransfer = isTransferTransaction(tx);
        const shouldRemove =
          (isTransfer && removeTransfers) ||
          (!isTransfer && removeTransactions);

        if (shouldRemove) {
          toRemove.push(tx);
        } else {
          keep.push(tx);
        }
      });

      removed = toRemove;
      return keep;
    });

    if (removed.length > 0 && shouldAdjustAccounts) {
      setAccounts((prev) => rollbackAccountsFromTransactions(prev, removed));
    }

    if (choice === "accounts-all") {
      setAccounts([]);
      setDeletedAccounts([]);
      setBills([]);
      setNetWorthHistory([]);
      setSelectedAccountId("");
      setCarouselStartIndex(0);
      setEditButtonForId(null);
      setEditingAccount(null);
      setEditingBill(null);
      setIsAccountsListOpen(false);
      setIsNewAccountOpen(false);
      setIsNewTxOpen(false);
      setIsTransferOpen(false);
      setIsTransactionsModalOpen(false);
      setIsNewBillOpen(false);
      setIsBillsModalOpen(false);
      setEditingAmountTx(null);
      setEditingDetailsTx(null);
    }

    setIsResetModalOpen(false);
    setResetChoice(null);

    if (choice === "accounts-all") {
      setIsDeleteProfilePromptOpen(true);
    }
  }

  async function handleDeleteProfileAfterReset() {
    if (!activeProfile) {
      setIsDeleteProfilePromptOpen(false);
      return;
    }

    try {
      await deleteProfile(activeProfile.id);
      try {
        localStorage.removeItem(
          `finance-web:dashboard:${activeProfile.id}`
        );
      } catch (err) {
        console.warn("Failed to clear dashboard cache for profile", err);
      }
      setActiveProfileId(null);
      setIsDeleteProfilePromptOpen(false);
      navigate("/profiles");
    } catch (error) {
      console.error("Failed to delete profile", error);
      setIsDeleteProfilePromptOpen(false);
    }
  }

  function handleOpenAccountEditor(account: Account) {
    setSelectedAccountId(account.id);
    setEditingAccount(account);
    setEditButtonForId(account.id);
    setIsAccountsListOpen(false);
  }

  function handleProfileNameSubmit(event?: FormEvent) {
    event?.preventDefault();

    if (!activeProfile) return;

    const nextName = profileNameInput.trim();
    if (!nextName) {
      setProfileNameError("Name is required.");
      return;
    }

    if (nextName === activeProfile.name) {
      setIsEditingProfileName(false);
      setProfileNameError("");
      return;
    }

    try {
      updateProfileName(activeProfile.id, nextName);
      setActiveProfileId(activeProfile.id);
      setIsEditingProfileName(false);
      setProfileNameError("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile name.";
      setProfileNameError(message);
    }
  }

  function handleStartEditingProfileName() {
    if (!activeProfile) return;
    setProfileNameInput(activeProfile.name);
    setProfileNameError("");
    setIsEditingProfileName(true);
  }

  function handleLogout() {
    setIsAppMenuOpen(false);
    setIsLogoutPromptOpen(true);
  }

  function handleConfirmLogout() {
    setIsLogoutPromptOpen(false);
    setActiveProfileId(null);
    navigate("/profiles");
  }

  const profileName = activeProfile?.name ?? "Profile";
  const avatarInitial = profileName.trim().charAt(0)?.toUpperCase() || "P";

  // Compute which accounts to show in the 2-pill carousel
  let visibleAccounts: Account[] = [];
  if (accounts.length <= 2) {
    visibleAccounts = accounts;
  } else if (accounts.length > 2) {
    const first = accounts[carouselStartIndex];
    const second = accounts[(carouselStartIndex + 1) % accounts.length];
    visibleAccounts = [first, second].filter(Boolean) as Account[];
  }

  const appMenuItems = [
    { label: "Accounts", onClick: () => setIsAccountsListOpen(true) },
    {
      label: "Appearance",
      onClick: () => {
        setIsAppMenuOpen(false);
        setIsThemePickerOpen(true);
      },
    },
    { label: "About", onClick: () => setIsAboutOpen(true) },
    { label: "Feedback", onClick: () => setIsFeedbackOpen(true) },
    {
      label: "Reset",
      onClick: () => {
        setResetChoice(null);
        setIsAppMenuOpen(false);
        setIsResetModalOpen(true);
      },
    },
    { label: "Log Out", onClick: handleLogout },
  ];

  return (
    <MoneyVisibilityProvider
      initialHideMoney={hideMoney}
      onChange={(next) => setHideMoney(next)}
    >
      <div
        className="min-h-[100svh] w-full text-brand-accent"
        style={{ backgroundColor: currentPalette.background }}
      >
        <div className="mx-auto flex h-full max-w-[1280px] px-6 py-6">
        {/* LEFT SIDEBAR – months */}
        <aside className="mr-6 flex w-40 shrink-0 flex-col justify-end rounded-2xl bg-black/10 px-4 py-6 backdrop-blur-sm shadow-md">
          {MONTHS.map((m) => (
            <button
              key={m}
              type="button"
              className="w-full mb-2 flex items-center rounded-xl px-3 py-2 text-base font-bold tracking-wide bg-transparent text-[#F5FEFA]/80 hover:bg-[var(--color-surface-alt)]/10 hover:text-white transition-all duration-150"
            >
              <span className="mr-3 h-6 w-1.5 rounded-full bg-[var(--color-surface-alt)]/10" />
              <span className="truncate">{m}</span>
            </button>
          ))}
        </aside>

        {/* MAIN AREA */}
        <div className="flex min-h-[calc(100svh-3rem)] flex-1 flex-col gap-6">
          {/* TOP BAR */}
          <header className="flex items-center justify-between rounded-2xl bg-black/10 px-6 py-4 backdrop-blur-sm shadow-md">
            <div className="flex flex-1 items-center gap-4">
              <button
                type="button"
                onClick={() => setIsAppMenuOpen((prev) => !prev)}
                aria-expanded={isAppMenuOpen}
                aria-controls="app-menu-pills"
                className="rounded-full px-4 py-2.5 text-left text-lg font-semibold text-white/90 transition hover:bg-[var(--color-surface-alt)]/5"
              >
                <span className="tracking-wide">bare</span>
              </button>

              <div
                id="app-menu-pills"
                className={`flex items-center gap-2 overflow-hidden transition-[max-width,opacity,transform] duration-300 ${
                  isAppMenuOpen
                    ? "max-w-[640px] opacity-100 translate-x-0"
                    : "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                }`}
              >
                {appMenuItems.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.onClick();
                    }}
                    style={{
                      transitionDelay: isAppMenuOpen
                        ? `${index * 80}ms`
                        : "0ms",
                    }}
                    className={`rounded-full bg-[var(--color-surface-alt)]/15 px-3 py-1 text-xs font-semibold text-white/80 shadow-sm transition-all duration-300 ${
                      isAppMenuOpen
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-2 opacity-0"
                    } hover:bg-[var(--color-surface-alt)]/25`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <div className="flex items-center gap-3 rounded-full px-3 py-1 text-left text-sm">
                <div className="flex flex-col">
                  {isEditingProfileName ? (
                    <form
                      onSubmit={handleProfileNameSubmit}
                      className="flex items-center gap-2"
                    >
                      <input
                        value={profileNameInput}
                        onChange={(event) => setProfileNameInput(event.target.value)}
                        onBlur={() => handleProfileNameSubmit()}
                        className="w-40 rounded-lg bg-[var(--color-surface-alt)]/10 px-2 py-1 text-sm text-white placeholder-white/50 shadow-inner outline-none ring-1 ring-white/20 focus:ring-white/50"
                        placeholder="Enter name"
                        autoFocus
                      />
                      <button type="submit" className="sr-only">
                        Save profile name
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEditingProfileName}
                      disabled={!activeProfile}
                      className="text-sm font-semibold text-white/90 transition hover:text-white disabled:cursor-not-allowed disabled:text-white/40"
                    >
                      {profileName}
                    </button>
                  )}
                  {profileNameError && (
                    <span className="mt-1 text-xs text-red-300">{profileNameError}</span>
                  )}
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-alt)]/80 text-[var(--color-text-primary)]">
                  <span className="text-xs font-semibold">{avatarInitial}</span>
                </div>
              </div>
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
                  className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-alt)]/20 text-sm font-bold text-[#F5FEFA] hover:bg-[var(--color-surface-alt)]/30"
                  aria-label="Add account"
                >
                  +
                </button>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {(() => {
                  const newActionBase =
                    "w-full rounded-full bg-[#F5FEFA] py-3 text-sm font-semibold shadow-sm transition hover:bg-[#454545] hover:text-[#F5FEFA]";
                  const newActionText =
                    theme === "dark"
                      ? "text-[#1f1f1f]"
                      : "text-[var(--color-text-primary)]";
                  const newActionClasses = `${newActionBase} ${newActionText}`;

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsNewTxOpen(true)}
                        className={newActionClasses}
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
                        className={newActionClasses}
                      >
                        <span className="btn-label-full">New Transfer</span>
                        <span className="btn-label-wrap">
                          New
                          <br />
                          Transfer
                        </span>
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* ACCOUNT CAROUSEL */}
              <div className="mt-6 flex items-center gap-3">
                {/* Left arrow */}
                <button
                  type="button"
                  onClick={handlePrevAccount}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs bg-[var(--color-surface-alt)]/10 text-white/80 hover:bg-[var(--color-surface-alt)]/20 hover:text-white transition"
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
                          className={`h-10 w-full rounded-2xl text-sm font-semibold transition ${
                            selectedAccount &&
                            account.id === selectedAccount.id
                              ? "bg-[var(--color-surface-alt)]/20 text-[#F5FEFA]"
                              : "bg-[var(--color-surface-alt)]/10 text-[#F5FEFA]/80 hover:bg-[var(--color-surface-alt)]/16"
                          }`}
                        >
                          {account.name}
                        </button>
                        {selectedAccount &&
                          selectedAccount.id === account.id &&
                          editButtonForId === account.id && (
                            <button
                              type="button"
                              onClick={() => setEditingAccount(account)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg.white/20 text-xs text-[#F5FEFA] hover:bg-[var(--color-surface-alt)]/30"
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
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs bg-[var(--color-surface-alt)]/10 text-white/80 hover:bg-[var(--color-surface-alt)]/20 hover:text-white transition"
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
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setEditingDetailsTx(tx)}
                      className="flex w-full items-center justify-between rounded-xl bg-[var(--color-surface-alt)]/5 px-3 py-2 text-left hover:bg-[var(--color-surface-alt)]/10"
                    >
                      <span>{tx.description || "Transaction"}</span>
                      <span
                        className={
                          tx.amount < 0 ? "text-red-200" : "text-emerald-200"
                        }
                      >
                        {formatCurrency(tx.amount)}
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          </div>

          {/* MIDDLE ROW: NET WORTH + UPCOMING BILLS */}
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
            <NetWorthCard
              accounts={accounts}
              netWorthHistory={netWorthHistory}
              viewMode={netWorthViewMode}
              onViewModeChange={(mode) => setNetWorthViewMode(mode)}
            />

            {/* UPCOMING BILLS CARD */}
            <section className="rounded-2xl bg-black/10 px-6 py-5 backdrop-blur-sm shadow-md min-h-[260px]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Upcoming Bills</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      accounts.length > 0 && setIsNewBillOpen(true)
                    }
                    disabled={accounts.length === 0}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition ${
                      accounts.length === 0
                        ? "bg-[var(--color-surface-alt)]/10 text-white/30 cursor-not-allowed"
                        : "bg-[var(--color-surface-alt)]/20 text-[#F5FEFA] hover:bg-[var(--color-surface-alt)]/30"
                    }`}
                    aria-label="Add bill"
                    title={
                      accounts.length === 0
                        ? "Create an account first"
                        : "Add new bill"
                    }
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBillsModalOpen(true)}
                    className="text-xs text-white/60 hover:text-white transition"
                  >
                    more
                  </button>
                </div>
              </div>

              <div className="flex min-h-[232px] flex-col">
                {unpaidBills.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl bg-[var(--color-surface-alt)]/5 text-xs text-white/60">
                    No upcoming bills yet. Add your first bill to get reminders
                    here.
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col">
                    <div className="space-y-2">
                      {[...unpaidBills]
                        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                        .slice(0, 3)
                        .map((bill) => (
                          <div
                            key={bill.id}
                            className="flex items-center justify-between rounded-xl bg-[var(--color-surface-alt)]/5 px-4 py-3 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => setEditingBill(bill)}
                              className="flex flex-1 flex-col text-left"
                            >
                              <span className="font-semibold">{bill.name}</span>
                              <span className="flex items-center gap-2 text-[11px] text-white/60">
                                <span>Due {bill.dueDate}</span>

                                {(() => {
                                  const status = getDueStatus(bill.dueDate);

                                  const badgeBase =
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold";

                                  const badgeColor =
                                    status.tone === "danger"
                                      ? "bg-[var(--color-surface-alt)]/20 text-[#FBD5D5]"
                                      : status.tone === "warning"
                                        ? "bg-[var(--color-surface-alt)]/15 text-[#F2E2BE]"
                                        : "bg-[var(--color-surface-alt)]/10 text-white/70";

                                  return (
                                    <span className={`${badgeBase} ${badgeColor}`}>
                                      {status.label}
                                    </span>
                                  );
                                })()}
                              </span>
                            </button>

                            <div className="ml-4 text-right">
                              <div className="text-sm font-semibold text-[#E89A9A]">
                                -$
                                {bill.amount.toLocaleString("en-CA", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div className="text-[11px] text-white/60">
                                {bill.frequency === "weekly"
                                  ? "Weekly"
                                  : bill.frequency === "biweekly"
                                    ? "Bi-weekly"
                                    : bill.frequency === "once"
                                      ? "One-time"
                                      : "Monthly"}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleMarkBillPaid(bill)}
                                className="mt-1 rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold text-white/80 hover:bg-[var(--color-surface-alt)]/10"
                              >
                                Mark paid
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>

                    {unpaidBills.length > 3 && (
                      <p className="pt-1 text-[11px] text-white/60">
                        + {unpaidBills.length - 3} more bill
                        {unpaidBills.length - 3 === 1 ? "" : "s"} not shown
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* BOTTOM ROW: DEBT PAYOFF PROGRESS (placeholder) */}
          <section className="mb-2 flex items-center justify-between rounded-2xl bg-black/10 px-6 py-4 backdrop-blur-sm shadow-md">
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-sm font-semibold">Debt Payoff Progress</p>
              <div className="h-4 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                <div className="h-4 w-1/3 rounded-full bg-[var(--color-accent)]" />
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

      {/* ACCOUNTS LIST MODAL */}
      {isAccountsListOpen && (
        <AccountsListModal
          accounts={accounts}
          deletedAccounts={deletedAccounts}
          onRestore={handleRestoreAccount}
          onDelete={handleDeleteAccount}
          onSelectAccount={handleOpenAccountEditor}
          onClose={() => setIsAccountsListOpen(false)}
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
            onSave={({ name, balance, accountCategory, creditLimit, aprPercent }) => {
              handleSaveEditedAccount(editingAccount, {
                name,
                balance,
                accountCategory,
                creditLimit,
                aprPercent,
              });
              setEditingAccount(null);
              setEditButtonForId(null);
            }}
            onDelete={() => handleDeleteAccount(editingAccount.id)}
          />
        )}

      {/* NEW BILL MODAL */}
      {isNewBillOpen && accounts.length > 0 && (
        <NewBillModal
          onClose={() => setIsNewBillOpen(false)}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSave={handleAddBill}
        />
      )}

      {/* FULL BILLS MODAL */}
      {isBillsModalOpen && bills.length > 0 && (
        <BillsListModal
          bills={bills}
          accounts={accounts}
          onClose={() => setIsBillsModalOpen(false)}
          onEdit={(bill) => {
            setEditingBill(bill);
            setIsBillsModalOpen(false);
          }}
          onMarkPaid={(bill) => handleMarkBillPaid(bill)}
        />
      )}

      {/* EDIT BILL MODAL */}
      {editingBill && (
        <EditBillModal
          bill={editingBill}
          accounts={accounts}
          onClose={() => setEditingBill(null)}
          onSave={(updated) => {
            handleUpdateBill(updated);
            setEditingBill(null);
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
          onDelete={handleDeleteTransaction}
        />
      )}

      {/* EDIT TRANSACTION – DETAILS */}
      {editingDetailsTx && (
        <EditTransactionDetailsModal
          transaction={editingDetailsTx}
          onClose={() => setEditingDetailsTx(null)}
          onSave={(updates) => {
            handleUpdateTransaction(editingDetailsTx.id, updates);
            setEditingDetailsTx(null);
          }}
          onDelete={handleDeleteTransaction}
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

      {isResetModalOpen && (
        <ResetDataModal
          selected={resetChoice}
          onSelect={setResetChoice}
          onConfirm={() => {
            if (resetChoice) {
              performReset(resetChoice);
            }
          }}
          onClose={() => {
            setIsResetModalOpen(false);
            setResetChoice(null);
          }}
          disableConfirm={!resetChoice || !activeProfile}
        />
      )}

      {isDeleteProfilePromptOpen && (
        <DeleteProfilePrompt
          onStay={() => setIsDeleteProfilePromptOpen(false)}
          onDelete={handleDeleteProfileAfterReset}
        />
      )}

      {isLogoutPromptOpen && (
        <LogoutPrompt
          onStay={() => setIsLogoutPromptOpen(false)}
          onConfirm={handleConfirmLogout}
        />
      )}

      {/* ABOUT MODAL */}
      {isAboutOpen && (
        <AboutModal onClose={() => setIsAboutOpen(false)} />
      )}

      {/* FEEDBACK MODAL */}
      {isFeedbackOpen && (
        <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />
      )}

      {isThemePickerOpen && (
        <ThemePickerModal
          onClose={() => setIsThemePickerOpen(false)}
        />
      )}

      {/* THEME TOGGLE */}
      <button
        type="button"
        onClick={() => setIsThemePickerOpen(true)}
        className={`fixed bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-colors duration-200 ${
          theme === "dark"
            ? "bg-[var(--color-surface-alt)]/10 text-brand-accent hover:bg-[var(--color-surface-alt)]/15"
            : "bg-black/10 text-[var(--color-text-primary)] hover:bg-black/15"
        }`}
        aria-label="Open appearance settings"
        title="Open appearance settings"
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
    </MoneyVisibilityProvider>
  );
}

/* ---------- MODALS ---------- */

const modalCardBase =
  "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xl";
const modalSurfaceAltCard =
  "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]";
const modalInputClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] placeholder:text-[var(--color-text-secondary)]";
const modalLabelClass =
  "mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]";
const modalSubtleTextClass = "text-sm text-[var(--color-text-secondary)]";
const modalCloseButtonClass =
  "rounded-full px-2 py-1 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]";
const modalPrimaryButtonClass =
  "rounded-full bg-[var(--color-accent)] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--color-accent-strong)]";
const modalGhostButtonClass =
  "rounded-full px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]";
const modalToggleActiveClass = "bg-[var(--color-accent)] text-white shadow-sm";
const modalToggleInactiveClass =
  "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]";

type ResetDataModalProps = {
  selected: ResetChoice | null;
  disableConfirm?: boolean;
  onSelect: (choice: ResetChoice) => void;
  onConfirm: () => void;
  onClose: () => void;
};

function ResetDataModal({
  selected,
  disableConfirm,
  onSelect,
  onConfirm,
  onClose,
}: ResetDataModalProps) {
  const { currentPalette } = useTheme();

  const options: { key: ResetChoice; title: string; detail: string }[] = [
    {
      key: "transactions",
      title: "Delete only transactions",
      detail: "Clear everyday income and expenses. Transfers and accounts stay put.",
    },
    {
      key: "transfers",
      title: "Delete only transfers",
      detail: "Remove transfer history while keeping transactions and account balances.",
    },
    {
      key: "transactions-transfers",
      title: "Delete transactions + transfers",
      detail: "Keep your accounts but wipe all activity records.",
    },
    {
      key: "accounts-all",
      title: "Accounts + transactions + transfers",
      detail: "Start fresh with empty accounts. You can delete the profile next if you want.",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-data-title"
      className="fixed inset-0 z-30 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative z-40 w-full max-w-4xl ${modalCardBase} p-6 backdrop-blur-sm`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              Reset
            </p>
            <h2
              id="reset-data-title"
              className="mt-1 text-2xl font-semibold leading-tight"
            >
              Choose what to reset
            </h2>
            <p className={`${modalSubtleTextClass} mt-1`}>
              Stay on the dashboard for the first three options. The last option offers a profile delete.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
            aria-label="Close reset dialog"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {options.map((option) => {
            const isActive = selected === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelect(option.key)}
                className={`${modalSurfaceAltCard} flex h-full flex-col items-start px-4 py-4 text-left shadow-sm transition`}
                style={
                  isActive
                    ? {
                        boxShadow: `0 0 0 2px ${currentPalette.accent}`,
                        borderColor: currentPalette.accent,
                      }
                    : undefined
                }
                aria-pressed={isActive}
              >
                <div className="mb-2 flex w-full items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{option.title}</span>
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{
                      borderColor: isActive
                        ? currentPalette.accent
                        : currentPalette.border,
                      backgroundColor: isActive
                        ? currentPalette.accent
                        : "transparent",
                    }}
                    aria-hidden="true"
                  />
                </div>
                <p className={`${modalSubtleTextClass} opacity-90`}>
                  {option.detail}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={modalGhostButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disableConfirm}
            className={`${modalPrimaryButtonClass} ${
              disableConfirm ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            Confirm reset
          </button>
        </div>
      </div>
    </div>
  );
}

type DeleteProfilePromptProps = {
  onStay: () => void;
  onDelete: () => void;
};

function DeleteProfilePrompt({ onStay, onDelete }: DeleteProfilePromptProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-profile-title"
      className="fixed inset-0 z-30 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onStay} />
      <div
        className={`relative z-40 w-full max-w-xl ${modalCardBase} p-6 backdrop-blur-sm`}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              Next step
            </p>
            <h2
              id="delete-profile-title"
              className="mt-1 text-2xl font-semibold leading-tight"
            >
              Delete this profile?
            </h2>
          </div>
          <button
            type="button"
            onClick={onStay}
            className={modalCloseButtonClass}
            aria-label="Stay on dashboard"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className={modalSubtleTextClass}>
          Accounts, transactions, and transfers are cleared. Stay to rebuild the dashboard,
          or delete the profile to head back to the profile selector.
        </p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onStay}
            className={modalGhostButtonClass}
          >
            Stay in dashboard
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full bg-red-500/90 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500"
          >
            Delete profile
          </button>
        </div>
      </div>
    </div>
  );
}

type LogoutPromptProps = {
  onStay: () => void;
  onConfirm: () => void;
};

function LogoutPrompt({ onStay, onConfirm }: LogoutPromptProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      className="fixed inset-0 z-30 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onStay} />
      <div
        className={`relative z-40 w-full max-w-md ${modalCardBase} p-6 backdrop-blur-sm`}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              Heads up
            </p>
            <h2
              id="logout-title"
              className="mt-1 text-2xl font-semibold leading-tight"
            >
              Log out of this profile?
            </h2>
          </div>
          <button
            type="button"
            onClick={onStay}
            className={modalCloseButtonClass}
            aria-label="Stay signed in"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className={modalSubtleTextClass}>
          We&apos;ll take you back to the profile screen. Your data stays saved for the next
          sign in.
        </p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onStay}
            className={modalGhostButtonClass}
          >
            Stay here
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={modalPrimaryButtonClass}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

type AboutModalProps = {
  onClose: () => void;
};

function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-bare-title"
      className="fixed inset-0 z-30 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative z-40 w-full max-w-3xl ${modalCardBase} p-6 backdrop-blur-sm`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              About
            </p>
            <h2
              id="about-bare-title"
              className="mt-1 text-2xl font-semibold leading-tight"
            >
              About bare (aka: my little finance side-project)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${modalCloseButtonClass} transition`}
            aria-label="Close about dialog"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 leading-relaxed">
          <p className={modalSubtleTextClass}>
            bare.money is a simple personal finance dashboard I'm building for myself.
            <br />
            In Toronto, "bare" means a lot - and that's what money usually feels like. A lot to think about. A lot to manage. A lot to learn. I wanted something that made all of that feel lighter. Something clean, fast, and not packed with features I'd never touch. So I made my own.
          </p>
          <p className={modalSubtleTextClass}>
            The app keeps everything straightforward. You can create profiles, manage accounts, track income and expenses, move money around, and see your activity at a glance. Everything stays stored locally in your browser - your data is yours. No sign-ups. No syncing. No servers. Just a calm, simple tool that helps you understand where your money is going.
          </p>
          <p className={modalSubtleTextClass}>
            bare.money is still growing. Soon, it'll include recurring bills, net-worth tracking, and debt payoff tools. The goal is for all of it to feel soft, minimal, and personal - something that supports your life instead of overwhelming it.
          </p>
          <p className={modalSubtleTextClass}>
            You don't need to be a finance expert. You don't need perfect habits. You just need a place to start.
          </p>
          <p className={modalSubtleTextClass}>
            This project isn't a company or a startup (at least not yet). It's just me learning, building, and trying to get my money right. I want bare.money to reflect that journey - real progress, real mistakes, and real change. If it works for me, maybe it'll work for anyone else who feels the same way.
          </p>
          <p className={modalSubtleTextClass}>
            If you like this calm, honest approach to budgeting, stick around.
            <br />
            There's more coming, and we're only getting started.
          </p>
        </div>
      </div>
    </div>
  );
}

type FeedbackModalProps = {
  onClose: () => void;
};

function FeedbackModal({ onClose }: FeedbackModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-bare-title"
      className="fixed inset-0 z-30 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative z-40 w-full max-w-3xl ${modalCardBase} p-6 shadow-xl backdrop-blur-sm`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              Feedback
            </p>
            <h2
              id="feedback-bare-title"
              className="mt-1 text-2xl font-semibold leading-tight"
            >
              Got feedback?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${modalCloseButtonClass} transition`}
            aria-label="Close feedback dialog"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 leading-relaxed">
          <p className={modalSubtleTextClass}>Just text me lol</p>
        </div>
      </div>
    </div>
  );
}

type ThemePickerModalProps = {
  onClose: () => void;
};

function ThemePickerModal({ onClose }: ThemePickerModalProps) {
  const {
    theme,
    setTheme,
    currentThemeKey,
    setThemeKey,
    availableThemes,
    getPalette,
  } = useTheme();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const modeOptions: { value: ThemeMode; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-picker-title"
      className="fixed inset-0 z-30 flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative z-40 w-full max-w-3xl rounded-2xl p-6 shadow-xl backdrop-blur-sm"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] opacity-60">
              Appearance
            </p>
            <h2
              id="theme-picker-title"
              className="mt-1 text-2xl font-semibold leading-tight"
            >
              Theme & mode
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Pick a palette, then choose whether light or dark feels best.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Close appearance dialog"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] opacity-60">
                Theme
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {availableThemes.map((option) => {
                const palette = getPalette(option.key, theme);
                const isActive = option.key === currentThemeKey;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setThemeKey(option.key)}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)] ${
                      isActive
                        ? "border-[var(--color-accent)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                    style={{
                      backgroundColor: palette.surfaceAlt,
                      boxShadow: isActive
                        ? "0 0 0 3px rgba(113, 91, 100, 0.35)"
                        : undefined,
                    }}
                    aria-pressed={isActive}
                  >
                    <ThemePreview palette={palette} />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {option.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] opacity-60">
                Mode
              </p>
            </div>
            <div className="flex gap-3">
              {modeOptions.map((modeOption) => {
                const isActive = theme === modeOption.value;
                return (
                  <button
                    key={modeOption.value}
                    type="button"
                    onClick={() => setTheme(modeOption.value)}
                    className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-[var(--color-accent)] text-white shadow-sm"
                        : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                    }`}
                    aria-pressed={isActive}
                  >
                    {modeOption.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ThemePreview({ palette }: { palette: ThemePalette }) {
  return (
    <div
      className="rounded-2xl border p-2"
      style={{ borderColor: palette.border, backgroundColor: palette.surface }}
    >
      <div
        className="h-3 w-full rounded-full"
        style={{ backgroundColor: palette.background }}
      />
      <div className="mt-2 flex gap-2">
        <div
          className="h-12 w-10 rounded"
          style={{ backgroundColor: palette.neutral }}
        />
        <div className="flex-1 space-y-2">
          <div
            className="h-3 rounded"
            style={{ backgroundColor: palette.surfaceAlt }}
          />
          <div
            className="h-3 w-3/4 rounded"
            style={{ backgroundColor: palette.surfaceAlt }}
          />
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        <span
          className="h-2 flex-1 rounded"
          style={{ backgroundColor: palette.accent }}
        />
        <span
          className="h-2 flex-1 rounded"
          style={{ backgroundColor: palette.accentStrong }}
        />
      </div>
    </div>
  );
}

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
      kind: "transaction",
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
        <div className={`w-full max-w-md ${modalCardBase} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              New Transaction
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={modalCloseButtonClass}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={modalLabelClass}>Account</label>
              <select
                name="accountId"
                defaultValue={selectedAccountId}
                className={modalInputClass}
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
                <label className={modalLabelClass}>Amount</label>
                <input
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={modalInputClass}
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={() => setIsPadOpen(true)}
                  className="mt-1 text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                >
                  Open number pad
                </button>
                {amountError && (
                  <p className="mt-1 text-xs text-red-500">{amountError}</p>
                )}
              </div>

              <div>
                <label className={modalLabelClass}>Type</label>
                <div className="mt-[2px] flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType("expense")}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      txType === "expense"
                        ? modalToggleActiveClass
                        : modalToggleInactiveClass
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType("income")}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      txType === "income"
                        ? modalToggleActiveClass
                        : modalToggleInactiveClass
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={modalLabelClass}>Date</label>
                <input
                  name="date"
                  type="date"
                  className={modalInputClass}
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <label className={modalLabelClass}>Description</label>
                <input
                  name="description"
                  type="text"
                  className={modalInputClass}
                  placeholder="e.g. Groceries"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={modalGhostButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalPrimaryButtonClass}
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

type AccountsListModalProps = {
  accounts: Account[];
  deletedAccounts: Account[];
  onRestore: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  onSelectAccount: (account: Account) => void;
  onClose: () => void;
};

function getAccountCategoryLabel(category: AccountCategory) {
  return category === "debt" ? "Credit" : "Debit";
}

function dedupeAccountsById(list: Account[]) {
  const seen = new Set<string>();
  return list.filter((acc) => {
    if (seen.has(acc.id)) return false;
    seen.add(acc.id);
    return true;
  });
}

function AccountsListModal({
  accounts,
  deletedAccounts,
  onRestore,
  onDelete,
  onSelectAccount,
  onClose,
}: AccountsListModalProps) {
  const [showDeleted, setShowDeleted] = useState(false);

  const uniqueDeleted = dedupeAccountsById(deletedAccounts);
  const deletedIds = new Set(uniqueDeleted.map((acc) => acc.id));
  const activeAccounts = dedupeAccountsById(
    accounts.filter((acc) => !deletedIds.has(acc.id))
  );

  const visibleAccounts = showDeleted ? uniqueDeleted : activeAccounts;
  const noAccountsMessage = showDeleted
    ? "No deleted accounts to display."
    : "No accounts yet. Add your first account to get started.";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
      <div className={`w-full max-w-lg ${modalCardBase} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              {showDeleted ? "Deleted accounts" : "Active accounts"}
            </p>
            <h2 className="text-xl font-semibold">Accounts</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeleted((prev) => !prev)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                showDeleted
                  ? modalToggleActiveClass
                  : modalToggleInactiveClass
              }`}
            >
              {showDeleted ? "Show active" : "Show deleted"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${modalToggleInactiveClass}`}
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pt-1">
          {visibleAccounts.length === 0 ? (
            <p className={modalSubtleTextClass}>{noAccountsMessage}</p>
          ) : (
            visibleAccounts.map((account) => (
              <div
                key={account.id}
                role={!showDeleted ? "button" : undefined}
                tabIndex={!showDeleted ? 0 : -1}
                onClick={() => {
                  if (!showDeleted) {
                    onSelectAccount(account);
                  }
                }}
                onKeyDown={(e) => {
                  if (!showDeleted && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelectAccount(account);
                  }
                }}
                className={`flex items-center gap-4 ${modalSurfaceAltCard} px-4 py-3 shadow-sm ${
                  showDeleted ? "" : "cursor-pointer transition hover:shadow-md"
                }`}
              >
                <div className="w-28 text-right text-lg font-extrabold text-[var(--color-text-primary)]">
                  {formatCurrency(account.balance)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{account.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {getAccountCategoryLabel(account.accountCategory)}
                  </p>
                </div>
                {showDeleted && (
                  <button
                    type="button"
                    onClick={() => onRestore(account.id)}
                    className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-strong)]"
                  >
                    Restore
                  </button>
                )}
                {!showDeleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(account.id);
                    }}
                    className="rounded-full border border-red-300/70 bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
                  >
                    Delete account
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NewAccountModal({ onClose, onSave }: NewAccountModalProps) {
  const [name, setName] = useState("");
  const [balanceStr, setBalanceStr] = useState("");
  const [creditLimitStr, setCreditLimitStr] = useState("");
  const [aprPercentStr, setAprPercentStr] = useState("");
  const [nameError, setNameError] = useState("");
  const [balanceError, setBalanceError] = useState("");
  const [creditLimitError, setCreditLimitError] = useState("");
  const [aprError, setAprError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);
  const [accountCategory, setAccountCategory] =
    useState<AccountCategory>("asset");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let valid = true;

    if (!name.trim()) {
      setNameError("Enter a name");
      valid = false;
    } else {
      setNameError("");
    }

    const rawAmount = balanceStr.trim();
    const parsedAmount = rawAmount === "" ? 0 : parseFloat(rawAmount);

    if (rawAmount !== "" && Number.isNaN(parsedAmount)) {
      setBalanceError("Enter an amount");
      valid = false;
    } else if (accountCategory === "debt" && parsedAmount > 0) {
      setBalanceError("Credit account balances must be negative or 0.");
      valid = false;
    } else {
      setBalanceError("");
    }

    let creditLimit: number | null | undefined;
    let aprPercent: number | null | undefined;

    if (accountCategory === "debt") {
      const creditLimitRaw = creditLimitStr.trim();
      if (creditLimitRaw === "") {
        creditLimit = null;
        setCreditLimitError("");
      } else {
        const parsed = parseFloat(creditLimitRaw);
        if (Number.isNaN(parsed)) {
          setCreditLimitError("Enter a number");
          valid = false;
        } else {
          creditLimit = parsed;
          setCreditLimitError("");
        }
      }

      const aprRaw = aprPercentStr.trim();
      if (aprRaw === "") {
        aprPercent = null;
        setAprError("");
      } else {
        const parsed = parseFloat(aprRaw);
        if (Number.isNaN(parsed)) {
          setAprError("Enter a number");
          valid = false;
        } else {
          aprPercent = parsed;
          setAprError("");
        }
      }
    } else {
      setCreditLimitError("");
      setAprError("");
    }

    if (!valid) return;

    const normalizedAmount =
      accountCategory === "debt" ? parsedAmount : Math.abs(parsedAmount);

    const newAccount: Account = {
      id: crypto.randomUUID(),
      name: name.trim(),
      balance: normalizedAmount,
      accountCategory,
    };

    if (accountCategory === "debt") {
      newAccount.creditLimit = creditLimit ?? null;
      newAccount.aprPercent = aprPercent ?? null;
    }

    onSave(newAccount);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
        <div className={`w-full max-w-md ${modalCardBase} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              New Account
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={modalCloseButtonClass}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={modalLabelClass}>
                Account name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={modalInputClass}
                placeholder="e.g. Chequing, Savings 2, Travel"
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-500">{nameError}</p>
              )}
            </div>

            <div>
              <label className={modalLabelClass}>
                Starting balance
              </label>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                className={modalInputClass}
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setIsPadOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
              >
                Open number pad
              </button>
              {balanceError && (
                <p className="mt-1 text-xs text-red-500">{balanceError}</p>
              )}
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                {accountCategory === "debt"
                  ? "For credit accounts, enter the amount you owe as a negative number (e.g. -500) or 0 if it’s fully paid."
                  : "Balances are stored as positive numbers and add to your net worth."}
              </p>
            </div>

            <div>
              <p className={modalLabelClass}>
                Account type
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(
                  [
                    {
                      value: "asset" as const,
                      label: "Debit",
                      hint: "Chequing, savings, investments",
                    },
                    {
                      value: "debt" as const,
                      label: "Credit",
                      hint: "Credit cards, loans, other liabilities",
                    },
                  ] satisfies { value: AccountCategory; label: string; hint: string }[]
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col ${modalSurfaceAltCard} px-3 py-2 transition ${
                      accountCategory === option.value
                        ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]"
                        : "hover:border-[var(--color-accent)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountCategory"
                      value={option.value}
                      checked={accountCategory === option.value}
                      onChange={() => setAccountCategory(option.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {option.label}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {option.hint}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {accountCategory === "debt" && (
              <div className="space-y-4">
                <div>
                  <label className={modalLabelClass}>
                    Credit limit
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={creditLimitStr}
                    onChange={(e) => setCreditLimitStr(e.target.value)}
                    className={modalInputClass}
                    placeholder="Optional"
                  />
                  {creditLimitError && (
                    <p className="mt-1 text-xs text-red-500">
                      {creditLimitError}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                    Total available credit on this account (optional).
                  </p>
                </div>

                <div>
                  <label className={modalLabelClass}>
                    APR
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={aprPercentStr}
                      onChange={(e) => setAprPercentStr(e.target.value)}
                      className={modalInputClass}
                      placeholder="e.g. 19.99"
                    />
                    <span className="text-sm font-semibold text-[var(--color-text-secondary)]">%</span>
                  </div>
                  {aprError && (
                    <p className="mt-1 text-xs text-red-500">{aprError}</p>
                  )}
                  <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                    Annual interest rate in percent (optional).
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={modalGhostButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalPrimaryButtonClass}
              >
                Save Account
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

type EditAccountModalProps = {
  account: Account;
  onClose: () => void;
  onSave: (updates: {
    name: string;
    balance: number;
    accountCategory: AccountCategory;
    creditLimit?: number | null;
    aprPercent?: number | null;
  }) => void;
  onDelete?: () => void;
};

function EditAccountModal({
  account,
  onClose,
  onSave,
  onDelete,
}: EditAccountModalProps) {
  const [name, setName] = useState(account.name);
  const [balanceStr, setBalanceStr] = useState(account.balance.toString());
  const [creditLimitStr, setCreditLimitStr] = useState(
    account.creditLimit != null ? account.creditLimit.toString() : ""
  );
  const [aprPercentStr, setAprPercentStr] = useState(
    account.aprPercent != null ? account.aprPercent.toString() : ""
  );
  const [nameError, setNameError] = useState("");
  const [balanceError, setBalanceError] = useState("");
  const [creditLimitError, setCreditLimitError] = useState("");
  const [aprError, setAprError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);
  const [accountCategory, setAccountCategory] = useState<AccountCategory>(
    account.accountCategory ?? "asset"
  );

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
    } else if (accountCategory === "debt" && parsed > 0) {
      setBalanceError("Credit account balances must be negative or 0.");
      valid = false;
    } else {
      setBalanceError("");
    }

    let creditLimit: number | null | undefined;
    let aprPercent: number | null | undefined;

    if (accountCategory === "debt") {
      const creditLimitRaw = creditLimitStr.trim();
      if (creditLimitRaw === "") {
        creditLimit = null;
        setCreditLimitError("");
      } else {
        const parsedLimit = parseFloat(creditLimitRaw);
        if (Number.isNaN(parsedLimit)) {
          setCreditLimitError("Enter a number");
          valid = false;
        } else {
          creditLimit = parsedLimit;
          setCreditLimitError("");
        }
      }

      const aprRaw = aprPercentStr.trim();
      if (aprRaw === "") {
        aprPercent = null;
        setAprError("");
      } else {
        const parsedApr = parseFloat(aprRaw);
        if (Number.isNaN(parsedApr)) {
          setAprError("Enter a number");
          valid = false;
        } else {
          aprPercent = parsedApr;
          setAprError("");
        }
      }
    } else {
      setCreditLimitError("");
      setAprError("");
    }

    if (!valid) return;

    const normalizedAmount =
      accountCategory === "debt" ? parsed : Math.abs(parsed);

    onSave({
      name: name.trim(),
      balance: normalizedAmount,
      accountCategory,
      creditLimit,
      aprPercent,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
        <div className={`w-full max-w-md ${modalCardBase} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Edit Account
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={modalCloseButtonClass}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={modalLabelClass}>
                Account name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={modalInputClass}
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-500">{nameError}</p>
              )}
            </div>

            <div>
              <label className={modalLabelClass}>
                Balance
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                className={modalInputClass}
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setIsPadOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
              >
                Open number pad
              </button>
              {balanceError && (
                <p className="mt-1 text-xs text-red-500">{balanceError}</p>
              )}
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                {accountCategory === "debt"
                  ? "For credit accounts, enter the amount you owe as a negative number (e.g. -500) or 0 if it’s fully paid."
                  : "Balances are stored as positive numbers and add to your net worth."}
              </p>
            </div>

            <div>
              <p className={modalLabelClass}>
                Account type
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(
                  [
                    {
                      value: "asset" as const,
                      label: "Debit",
                      hint: "Chequing, savings, investments",
                    },
                    {
                      value: "debt" as const,
                      label: "Credit",
                      hint: "Credit cards, loans, other liabilities",
                    },
                  ] satisfies { value: AccountCategory; label: string; hint: string }[]
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col ${modalSurfaceAltCard} px-3 py-2 transition ${
                      accountCategory === option.value
                        ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]"
                        : "hover:border-[var(--color-accent)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountCategory"
                      value={option.value}
                      checked={accountCategory === option.value}
                      onChange={() => setAccountCategory(option.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {option.label}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {option.hint}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {accountCategory === "debt" && (
              <div className="space-y-4">
                  <div>
                    <label className={modalLabelClass}>
                      Credit limit
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={creditLimitStr}
                      onChange={(e) => setCreditLimitStr(e.target.value)}
                      className={modalInputClass}
                      placeholder="Optional"
                    />
                    {creditLimitError && (
                      <p className="mt-1 text-xs text-red-500">
                        {creditLimitError}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                      Total available credit on this account (optional).
                    </p>
                  </div>

                  <div>
                    <label className={modalLabelClass}>
                      APR
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={aprPercentStr}
                        onChange={(e) => setAprPercentStr(e.target.value)}
                        className={modalInputClass}
                        placeholder="e.g. 19.99"
                      />
                      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">%</span>
                    </div>
                    {aprError && (
                      <p className="mt-1 text-xs text-red-500">{aprError}</p>
                    )}
                    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                      Annual interest rate in percent (optional).
                    </p>
                  </div>
                </div>
              )}

            <div className="flex items-center justify-between gap-3 pt-2">
              {onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-full border border-red-300/70 bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
                >
                  Delete account
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={modalGhostButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={modalPrimaryButtonClass}
                >
                  Save Changes
                </button>
              </div>
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
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
        <div className={`w-full max-w-md ${modalCardBase} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              New Transfer
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={modalCloseButtonClass}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={modalLabelClass}>
                  From
                </label>
                <select
                  name="fromAccountId"
                  defaultValue={selectedAccountId}
                  className={modalInputClass}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={modalLabelClass}>
                  To
                </label>
                <select
                  name="toAccountId"
                  defaultValue={
                    accounts.find((a) => a.id !== selectedAccountId)?.id ||
                    selectedAccountId
                  }
                  className={modalInputClass}
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
              <label className={modalLabelClass}>
                Amount
              </label>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={modalInputClass}
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setIsPadOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
              >
                Open number pad
              </button>
              {amountError && (
                <p className="mt-1 text-xs text-red-500">{amountError}</p>
              )}
            </div>

            <div>
              <label className={modalLabelClass}>
                Date
              </label>
              <input
                name="date"
                type="date"
                className={modalInputClass}
                defaultValue={new Date().toISOString().slice(0, 10)}
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>

            <div>
              <label className={modalLabelClass}>
                Note (optional)
              </label>
              <input
                name="note"
                type="text"
                className={modalInputClass}
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
                className={modalGhostButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalPrimaryButtonClass}
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

type NewBillModalProps = ModalPropsBase & {
  onSave: (bill: Bill) => void;
};

function NewBillModal({
  onClose,
  accounts,
  selectedAccountId,
  onSave,
}: NewBillModalProps) {
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [frequency, setFrequency] = useState<Bill["frequency"]>("once");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = String(formData.get("name") || "").trim();
    const accountId =
      String(formData.get("accountId") || "") || selectedAccountId;
    const dueDate = String(formData.get("dueDate") || today);

    const rawAmount = amount;
    const amountNumber = parseFloat(rawAmount);

    if (!name) return;
    if (!accountId) return;

    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setAmountError("Enter a valid amount");
      return;
    }

    const newBill: Bill = {
      id: crypto.randomUUID(),
      name,
      amount: amountNumber,
      dueDate,
      accountId,
      frequency,
      isPaid: false,
    };

    onSave(newBill);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
        <div className={`w-full max-w-md ${modalCardBase} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">New Bill</h2>
            <button
              type="button"
              onClick={onClose}
              className={modalCloseButtonClass}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={modalLabelClass}>
                Bill name
              </label>
              <input
                name="name"
                placeholder="e.g. Phone bill"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={modalLabelClass}>
                  Amount
                </label>
                <div className="flex flex-col gap-1">
                  <input
                    name="amount"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />

                  <button
                    type="button"
                    onClick={() => setIsPadOpen(true)}
                    className="self-start text-[11px] text-[var(--color-accent)] underline hover:text-[var(--color-accent-strong)]"
                  >
                    Open number pad
                  </button>
                  {amountError && (
                    <p className="text-[11px] text-[#C95454]">{amountError}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={modalLabelClass}>
                  Due date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={today}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={modalLabelClass}>
                  Pay from
                </label>
                <select
                  name="accountId"
                  defaultValue={selectedAccountId}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
              <label className={modalLabelClass}>
                Frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency("once")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "once" ? modalToggleActiveClass : modalToggleInactiveClass
                  }`}
                >
                  Once
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("weekly")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "weekly" ? modalToggleActiveClass : modalToggleInactiveClass
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("biweekly")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "biweekly" ? modalToggleActiveClass : modalToggleInactiveClass
                  }`}
                >
                  Bi-weekly
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("monthly")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "monthly" ? modalToggleActiveClass : modalToggleInactiveClass
                  }`}
                >
                  Monthly
                </button>
              </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={modalGhostButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalPrimaryButtonClass}
              >
                Save Bill
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

type BillsListModalProps = {
  bills: Bill[];
  accounts: Account[];
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
};

type EditBillModalProps = {
  bill: Bill;
  accounts: Account[];
  onClose: () => void;
  onSave: (bill: Bill) => void;
};

function BillsListModal({
  bills,
  accounts,
  onClose,
  onEdit,
  onMarkPaid,
}: BillsListModalProps) {
  const sorted = [...bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || "Unknown";

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
      <div className={`flex w-full max-w-2xl max-h-[70vh] flex-col ${modalCardBase} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">All Bills</h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Tap a bill to edit it, or mark it as paid.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
          >
            ✕
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-text-secondary)]">
            No bills added yet.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-2 text-sm">
              {sorted.map((bill) => {
                const isOneTimePaid =
                  bill.frequency === "once" && bill.isPaid;

                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-xl bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  >
                    <button
                      type="button"
                      onClick={() => onEdit(bill)}
                      className="flex flex-1 flex-col text-left"
                    >
                      <span className="font-semibold">{bill.name}</span>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        Due {bill.dueDate} · {accountName(bill.accountId)}
                      </span>
                    </button>

                    <div className="ml-4 text-right">
                      <div className="text-sm font-semibold text-[#C95454]">
                        -$
                        {bill.amount.toLocaleString("en-CA", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-secondary)]">
                        {bill.frequency === "weekly"
                          ? "Weekly"
                          : bill.frequency === "biweekly"
                            ? "Bi-weekly"
                            : bill.frequency === "once"
                              ? "One-time"
                              : "Monthly"}
                        {isOneTimePaid && " · Paid"}
                      </div>

                      {!isOneTimePaid && (
                        <button
                          type="button"
                          onClick={() => onMarkPaid(bill)}
                          className="mt-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditBillModal({
  bill,
  accounts,
  onClose,
  onSave,
}: EditBillModalProps) {
  const [name, setName] = useState(bill.name);
  const [amount, setAmount] = useState(bill.amount.toString());
  const [dueDate, setDueDate] = useState(bill.dueDate);
  const [accountId, setAccountId] = useState(bill.accountId);
  const [frequency, setFrequency] = useState<Bill["frequency"]>(
    bill.frequency || "monthly"
  );
  const [amountError, setAmountError] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim() || "Bill";
    const parsedAmount = parseFloat(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Enter a valid amount");
      return;
    }

    const updated: Bill = {
      ...bill,
      name: trimmedName,
      amount: parsedAmount,
      dueDate,
      accountId,
      frequency,
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
      <div className={`w-full max-w-md ${modalCardBase} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Edit Bill
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={modalLabelClass}>
              Bill name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={modalLabelClass}>
                Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder="0.00"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
              {amountError && (
                <p className="mt-1 text-xs text-[#C95454]">{amountError}</p>
              )}
            </div>

            <div>
              <label className={modalLabelClass}>
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={modalLabelClass}>
                Pay from
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={modalLabelClass}>
                Frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency("once")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "once"
                      ? modalToggleActiveClass
                      : modalToggleInactiveClass
                  }`}
                >
                  Once
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("weekly")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "weekly"
                      ? modalToggleActiveClass
                      : modalToggleInactiveClass
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("biweekly")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "biweekly"
                      ? modalToggleActiveClass
                      : modalToggleInactiveClass
                  }`}
                >
                  Bi-weekly
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("monthly")}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${
                    frequency === "monthly"
                      ? modalToggleActiveClass
                      : modalToggleInactiveClass
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={modalGhostButtonClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={modalPrimaryButtonClass}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type TransactionsHistoryModalProps = {
  onClose: () => void;
  account: Account;
  transactions: Transaction[];
  onEditDetails: (tx: Transaction) => void;
  onEditAmount: (tx: Transaction) => void;
  onDelete: (id: string) => void;
};

function TransactionsHistoryModal({
  onClose,
  account,
  transactions,
  onEditDetails,
  onEditAmount,
  onDelete,
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
    "ml-2 rounded-full border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]";

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
      <div className={`flex w-full max-w-2xl max-h-[70vh] flex-col ${modalCardBase} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Transactions – {account.name}
              </h2>
              <button
                type="button"
                className={`${sortBtnBase} ${
                  sortMode === "date" ? "bg-black/5" : ""
                }`}
                onClick={() => setSortMode("date")}
                title="Sort by date"
              >
                📅
              </button>
              <button
                type="button"
                className={`${sortBtnBase} ${
                  sortMode === "expense" ? "bg-black/5" : ""
                }`}
                onClick={() => setSortMode("expense")}
                title="Show expenses first"
              >
                -$
              </button>
              <button
                type="button"
                className={`${sortBtnBase} ${
                  sortMode === "income" ? "bg-black/5" : ""
                }`}
                onClick={() => setSortMode("income")}
                title="Show income first"
              >
                +$
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Full history for this account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
          >
            ✕
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-text-secondary)]">
            No transactions yet for this account.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-2 text-sm">
              {sorted.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--color-surface-alt)] px-3 py-2 text-[var(--color-text-primary)]"
                >
                  <button
                    type="button"
                    onClick={() => onEditDetails(tx)}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <span className="font-semibold">
                      {tx.description || "Transaction"}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {tx.date}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditAmount(tx)}
                      className={`text-right text-sm font-semibold ${
                        tx.amount < 0 ? "text-red-500" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(tx.id)}
                      className="rounded-full px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                      aria-label={`Delete ${tx.description || "transaction"}`}
                    >
                      Delete
                    </button>
                  </div>
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
  onSave: (updates: { description: string; date: string; amount: number }) => void;
  onDelete: (id: string) => void;
};

function EditTransactionDetailsModal({
  transaction,
  onClose,
  onSave,
  onDelete,
}: EditTransactionDetailsModalProps) {
  const [description, setDescription] = useState(transaction.description);
  const [date, setDate] = useState(transaction.date);
  const [amountStr, setAmountStr] = useState(transaction.amount.toString());
  const [error, setError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const rawAmount = amountStr.trim();
    const parsedAmount = parseFloat(rawAmount);

    if (rawAmount === "" || Number.isNaN(parsedAmount) || parsedAmount === 0) {
      setError("Enter a valid amount");
      return;
    }

    setError("");
    onSave({
      description: description.trim() || "Transaction",
      date,
      amount: parsedAmount,
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
      <div className={`w-full max-w-md ${modalCardBase} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Edit Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={modalLabelClass}>
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={modalInputClass}
            />
          </div>
          <div>
            <label className={modalLabelClass}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={modalInputClass}
            />
          </div>

          <div>
            <label className={modalLabelClass}>
              Amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className={modalInputClass}
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={() => setIsPadOpen(true)}
              className="mt-1 text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
            >
              Open number pad
            </button>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onDelete(transaction.id);
              onClose();
            }}
              className="rounded-full bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-500/20"
            >
              Delete
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className={modalGhostButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalPrimaryButtonClass}
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>

      {isPadOpen && (
        <NumberPad
          value={amountStr}
          onChange={setAmountStr}
          onClose={() => setIsPadOpen(false)}
        />
      )}
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
  const [amountStr, setAmountStr] = useState(transaction.amount.toString());
  const [error, setError] = useState("");
  const [isPadOpen, setIsPadOpen] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const raw = amountStr.trim();
    const parsed = parseFloat(raw);

    if (raw === "" || Number.isNaN(parsed) || parsed === 0) {
      setError("Enter a valid amount");
      return;
    }

    setError("");
    onSave(parsed);
  };

  return (
    <>
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
        <div className={`w-full max-w-sm ${modalCardBase} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Edit Amount
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={modalCloseButtonClass}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={modalLabelClass}>
                Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={modalInputClass}
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setIsPadOpen(true)}
                className="mt-1 text-[11px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
              >
                Open number pad
              </button>
              {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={modalGhostButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalPrimaryButtonClass}
              >
                Save Amount
              </button>
            </div>
          </form>
        </div>
      </div>

      {isPadOpen && (
        <NumberPad
          value={amountStr}
          onChange={setAmountStr}
          onClose={() => setIsPadOpen(false)}
        />
      )}
    </>
  );
}

/* SHARED NUMBER PAD */

type NumberPadProps = {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
};

function NumberPad({ value, onChange, onClose }: NumberPadProps) {
  const handlePress = (key: string) => {
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === "←") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : value + ".");
      return;
    }
    // digits
    onChange(value + key);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "←"];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className={`w-full max-w-xs ${modalCardBase} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            Number pad
          </span>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
          >
            ✕
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-right text-lg font-semibold text-[var(--color-text-primary)]">
          {value || "0"}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handlePress(k)}
              className="flex h-10 items-center justify-center rounded-lg bg-[var(--color-surface-alt)] text-sm font-semibold text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-surface)]"
            >
              {k}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => handlePress("C")}
            className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent-strong)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
