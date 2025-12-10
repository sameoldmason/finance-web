// src/routes/Dashboard.tsx
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeMode, ThemePalette, useTheme } from "../ThemeProvider";
import { useActiveProfile } from "../ActiveProfileContext";
import {
  Account,
  AccountCategory,
  DebtPayoffMode,
  DebtPayoffSettings,
  NetWorthSnapshot,
  Transaction,
  TransferInput,
} from "../lib/financeTypes";
import { loadDashboardData, saveDashboardData } from "../lib/dashboardStore";
import type { Bill } from "../lib/financeTypes";
import { calculateNetWorthFromAccounts } from "../lib/netWorth";
import { MoneyVisibilityProvider } from "../MoneyVisibilityContext";
import { NetWorthCard } from "../components/dashboard/net-worth/NetWorthCard";
import { deleteProfile, updateProfileName } from "../lib/profiles";
import {
  calculateDebtPayoff,
  DebtInput,
  DebtPayoffResult,
} from "../lib/debtPayoffMath";
import { AccountsSection } from "../components/dashboard/accounts/AccountsSection";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { BillsSection } from "../components/dashboard/bills/BillsSection";
import { DebtPayoffSection } from "../components/dashboard/debt/DebtPayoffSection";
import {
  modalCardBase,
  modalSurfaceAltCard,
  modalInputClass,
  modalLabelClass,
  modalSubtleTextClass,
  modalCloseButtonClass,
  modalPrimaryButtonClass,
  modalGhostButtonClass,
  modalToggleActiveClass,
  modalToggleInactiveClass,
} from "../components/dashboard/modals/modalStyles";
import { NumberPad } from "../components/dashboard/modals/NumberPad";
import {
  DebtPayoffModal,
  ResetDataModal,
  DeleteProfilePrompt,
  LogoutPrompt,
  AboutModal,
  FeedbackModal,
  ThemePickerModal,
  type ResetChoice,
} from "../components/dashboard/GlobalDashboardModals/GlobalDashboardModals";

// New profiles should start with NO accounts
const INITIAL_ACCOUNTS: Account[] = [];
const DEFAULT_DEBT_SETTINGS: DebtPayoffSettings = {
  mode: "snowball",
  monthlyAllocation: 0,
  showInterest: false,
};

function isTransferTransaction(tx: Transaction) {
  if (tx.kind === "transfer") return true;
  const description = tx.description?.toLowerCase() ?? "";

  return (
    description.startsWith("transfer") ||
    description.includes("transfer in") ||
    description.includes("transfer out")
  );
}

function findTransferPartner(tx: Transaction, all: Transaction[]) {
  if (!isTransferTransaction(tx)) return undefined;

  if (tx.transferGroupId) {
    return all.find(
      (other) =>
        other.id !== tx.id && other.transferGroupId === tx.transferGroupId
    );
  }

  const absAmount = Math.abs(tx.amount);
  const sameDate = tx.date;

  return all.find(
    (other) =>
      other.id !== tx.id &&
      isTransferTransaction(other) &&
      other.accountId !== tx.accountId &&
      Math.abs(other.amount) === absAmount &&
      other.date === sameDate
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

function isDebtAccount(account: Account) {
  return account.isDebt === true || account.accountCategory === "debt";
}

function willOverpayDebt(account: Account, delta: number) {
  if (!isDebtAccount(account)) return false;
  if (account.balance >= 0) return false;
  const nextBalance = account.balance + delta;
  return nextBalance > 0;
}

function formatFriendlyDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
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
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthSnapshot[]>(
    []
  );
  const [netWorthViewMode, setNetWorthViewMode] = useState<
    "minimal" | "detailed"
  >("detailed");
  const [hideMoney, setHideMoney] = useState(false);
  const [debtPayoffSettings, setDebtPayoffSettings] =
    useState<DebtPayoffSettings>(DEFAULT_DEBT_SETTINGS);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [pendingOverpay, setPendingOverpay] = useState<{
    accountId: string;
    accountName: string;
    delta: number;
    nextBalance: number;
    onConfirm: () => void;
  } | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");

  // Modals
  const [isDebtPayoffOpen, setIsDebtPayoffOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteProfilePromptOpen, setIsDeleteProfilePromptOpen] =
    useState(false);
  const [isLogoutPromptOpen, setIsLogoutPromptOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

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
      setDebtPayoffSettings(DEFAULT_DEBT_SETTINGS);
      setEditButtonForId(null);
      setIsAccountsListOpen(false);
      setIsDebtPayoffOpen(false);
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
      setDebtPayoffSettings(DEFAULT_DEBT_SETTINGS);
      setEditButtonForId(null);
      setIsAccountsListOpen(false);
      setIsDebtPayoffOpen(false);
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
    setDebtPayoffSettings(loaded.debtPayoffSettings ?? DEFAULT_DEBT_SETTINGS);
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
      debtPayoffSettings,
    });
  }, [
    accounts,
    transactions,
    bills,
    netWorthHistory,
    netWorthViewMode,
    hideMoney,
    deletedAccounts,
    debtPayoffSettings,
    activeProfile?.id,
  ]);

  // Derived bits
  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const unpaidBills = bills.filter((b) => !b.isPaid);

  const billsSectionProps = {
    accountsCount: accounts.length,
    unpaidBills,
    onOpenNewBill: () => setIsNewBillOpen(true),
    onOpenBillsModal: () => setIsBillsModalOpen(true),
    onEditBill: (bill: Bill) => setEditingBill(bill),
    onMarkBillPaid: handleMarkBillPaid,
  };

  const visibleTransactions = selectedAccount
    ? transactions.filter((tx) => tx.accountId === selectedAccount.id)
    : [];

  const debtInputs: DebtInput[] = useMemo(() => {
    return accounts
      .filter((acc) => isDebtAccount(acc))
      .map((acc) => {
        const balance = Math.abs(acc.balance);
        const startingBalance =
          acc.startingBalance !== undefined
            ? Math.abs(acc.startingBalance)
            : balance;
        const apr =
          typeof acc.apr === "number"
            ? acc.apr
            : typeof acc.aprPercent === "number"
            ? acc.aprPercent / 100
            : 0.2; // default fallback when no APR is provided
        const minimumPayment =
          typeof acc.minimumPayment === "number"
            ? Math.max(0, acc.minimumPayment)
            : Number((balance * 0.03).toFixed(2)); // simple 3% minimum fallback

        return {
          id: acc.id,
          name: acc.name,
          balance,
          minimumPayment,
          apr,
          startingBalance,
        };
      });
  }, [accounts]);

  const totalMinimumPayments = useMemo(
    () => debtInputs.reduce((sum, debt) => sum + debt.minimumPayment, 0),
    [debtInputs]
  );

  const debtPayoffSummary: DebtPayoffResult | null = useMemo(() => {
    if (debtInputs.length === 0) return null;
    return calculateDebtPayoff(
      debtInputs,
      debtPayoffSettings.mode,
      debtPayoffSettings.monthlyAllocation
    );
  }, [debtInputs, debtPayoffSettings]);

  const debtProgress =
    debtPayoffSummary && debtInputs.length > 0
      ? debtPayoffSettings.mode === "snowball"
        ? debtPayoffSummary.progressToNextDebt
        : debtPayoffSummary.progressTotalPaid
      : 0;
  const debtProgressPercent = Math.round(
    Math.max(0, Math.min(1, debtProgress)) * 100
  );
  const nextDebtName =
    debtPayoffSummary?.nextDebtId && debtPayoffSummary.debts
      ? debtPayoffSummary.debts.find(
          (debt) => debt.id === debtPayoffSummary.nextDebtId
        )?.name ?? null
      : null;
  const debtStatusText =
    debtInputs.length === 0
      ? "Add a debt account to start tracking."
      : debtPayoffSummary?.insufficientAllocation
      ? "Monthly allocation must be at least your total minimum payments."
      : debtPayoffSettings.mode === "snowball"
      ? `Next payoff: ${nextDebtName ?? "—"} · Est. ${formatFriendlyDate(
          debtPayoffSummary?.nextDebtEstimatedPayoffDate ?? null
        )}`
      : `Estimated debt-free: ${formatFriendlyDate(
          debtPayoffSummary?.overallEstimatedDebtFreeDate ?? null
        )}`;

  const debtSectionProps = {
    progressPercent: debtProgressPercent,
    statusText: debtStatusText,
    hasInsufficientAllocation: !!debtPayoffSummary?.insufficientAllocation,
    onOpen: () => setIsDebtPayoffOpen(true),
  };

  const updateDebtPayoffMode = (mode: DebtPayoffMode) => {
    setDebtPayoffSettings((prev) => ({ ...prev, mode }));
  };

  const updateDebtMonthlyAllocation = (amount: number) => {
    const cleanAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    setDebtPayoffSettings((prev) => ({
      ...prev,
      monthlyAllocation: cleanAmount,
    }));
  };

  const updateDebtShowInterest = (show: boolean) => {
    setDebtPayoffSettings((prev) => ({ ...prev, showInterest: show }));
  };

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
  function addTransaction(t: Transaction, skipOverpayCheck = false) {
    const txToAdd: Transaction = { ...t, kind: t.kind ?? "transaction" };

    const targetAccount = accounts.find((acc) => acc.id === txToAdd.accountId);
    if (
      !skipOverpayCheck &&
      targetAccount &&
      willOverpayDebt(targetAccount, txToAdd.amount)
    ) {
      const nextBalance = targetAccount.balance + txToAdd.amount;
      setPendingOverpay({
        accountId: targetAccount.id,
        accountName: targetAccount.name,
        delta: txToAdd.amount,
        nextBalance,
        onConfirm: () => addTransaction(txToAdd, true),
      });
      return;
    }

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

  // Update existing transaction (and adjust account balances if amounts changed)
  function handleUpdateTransaction(
    id: string,
    updates: Partial<Pick<Transaction, "amount" | "date" | "description">>,
    skipOverpayCheck = false
  ) {
    const existing = transactions.find((tx) => tx.id === id);
    if (!existing) return;

    const isTransfer = isTransferTransaction(existing);
    const partner = isTransfer
      ? findTransferPartner(existing, transactions)
      : undefined;

    const nextAmount =
      updates.amount !== undefined ? updates.amount : existing.amount;
    const partnerAmount = partner ? -nextAmount : undefined;

    let groupId =
      existing.transferGroupId ??
      partner?.transferGroupId ??
      (isTransfer ? crypto.randomUUID() : undefined);

    const primaryDelta = nextAmount - existing.amount;
    const partnerDelta =
      partner && partnerAmount !== undefined
        ? partnerAmount - partner.amount
        : 0;

    if (!skipOverpayCheck) {
      const primaryAccount = accounts.find(
        (acc) => acc.id === existing.accountId
      );
      if (primaryAccount && willOverpayDebt(primaryAccount, primaryDelta)) {
        const nextBalance = primaryAccount.balance + primaryDelta;
        setPendingOverpay({
          accountId: primaryAccount.id,
          accountName: primaryAccount.name,
          delta: primaryDelta,
          nextBalance,
          onConfirm: () => handleUpdateTransaction(id, updates, true),
        });
        return;
      }

      if (partner && partnerAmount !== undefined) {
        const partnerAccount = accounts.find(
          (acc) => acc.id === partner.accountId
        );
        if (partnerAccount && willOverpayDebt(partnerAccount, partnerDelta)) {
          const nextBalance = partnerAccount.balance + partnerDelta;
          setPendingOverpay({
            accountId: partnerAccount.id,
            accountName: partnerAccount.name,
            delta: partnerDelta,
            nextBalance,
            onConfirm: () => handleUpdateTransaction(id, updates, true),
          });
          return;
        }
      }
    }

    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id === existing.id) {
          return {
            ...tx,
            ...updates,
            amount: nextAmount,
            date: updates.date ?? tx.date,
            description: updates.description ?? tx.description,
            transferGroupId: groupId,
          };
        }
        if (partner && tx.id === partner.id) {
          return {
            ...tx,
            description: updates.description ?? tx.description,
            date: updates.date ?? tx.date,
            amount: partnerAmount ?? tx.amount,
            transferGroupId: groupId,
          };
        }
        return tx;
      })
    );

    if (primaryDelta !== 0 || partnerDelta !== 0) {
      setAccounts((prev) =>
        prev.map((acc) => {
          let delta = 0;
          if (acc.id === existing.accountId) {
            delta += primaryDelta;
          }
          if (partner && acc.id === partner.accountId) {
            delta += partnerDelta;
          }
          if (delta === 0) return acc;
          return { ...acc, balance: acc.balance + delta };
        })
      );
    }
  }

  function handleDeleteTransaction(id: string) {
    let txToDelete: Transaction | undefined;
    let partnerToDelete: Transaction | undefined;

    setTransactions((prev) => {
      const found = prev.find((tx) => tx.id === id);

      if (!found) return prev;

      txToDelete = found;
      if (isTransferTransaction(found)) {
        partnerToDelete = findTransferPartner(found, prev);
      }

      return prev.filter(
        (tx) =>
          tx.id !== id && (!partnerToDelete || tx.id !== partnerToDelete.id)
      );
    });

    const foundTx = txToDelete;
    if (!foundTx) return;

    setAccounts((prev) =>
      prev.map((acc) => {
        let delta = 0;
        if (acc.id === foundTx.accountId) {
          delta -= foundTx.amount;
        }
        if (partnerToDelete && acc.id === partnerToDelete.accountId) {
          delta -= partnerToDelete.amount;
        }

        if (delta === 0) return acc;
        return { ...acc, balance: acc.balance + delta };
      })
    );
  }

  // Add account
  function handleAddAccount(newAccount: Account) {
    const nextCategory =
      newAccount.accountCategory === "debt" ? "debt" : "asset";
    const isDebt = newAccount.isDebt ?? nextCategory === "debt";
    const derivedApr =
      typeof newAccount.apr === "number"
        ? newAccount.apr
        : typeof newAccount.aprPercent === "number"
        ? newAccount.aprPercent / 100
        : undefined;
    const startingBalance =
      isDebt && newAccount.startingBalance === undefined
        ? Math.abs(newAccount.balance)
        : newAccount.startingBalance;

    const nextAccount: Account = {
      ...newAccount,
      accountCategory: nextCategory,
      isDebt,
      apr: derivedApr,
      startingBalance,
      minimumPayment:
        isDebt && typeof newAccount.minimumPayment === "number"
          ? newAccount.minimumPayment
          : newAccount.minimumPayment,
    };

    setAccounts((prev) => [...prev, nextAccount]);
    setSelectedAccountId(nextAccount.id);
    if (accounts.length === 0) {
      setCarouselStartIndex(0);
    }
  }

  // Transfer between accounts
  function handleTransfer(
    { fromAccountId, toAccountId, amount, date, note }: TransferInput,
    skipOverpayCheck = false
  ) {
    if (!amount || amount <= 0) return;
    if (fromAccountId === toAccountId) return;

    const cleanAmount = Math.abs(amount);
    const transferGroupId = crypto.randomUUID();
    const fromDelta = -cleanAmount;
    const toDelta = cleanAmount;

    const fromAccount = accounts.find((acc) => acc.id === fromAccountId);
    const toAccount = accounts.find((acc) => acc.id === toAccountId);

    if (!fromAccount || !toAccount) return;

    if (!skipOverpayCheck && willOverpayDebt(toAccount, toDelta)) {
      const nextBalance = toAccount.balance + toDelta;
      setPendingOverpay({
        accountId: toAccount.id,
        accountName: toAccount.name,
        delta: toDelta,
        nextBalance,
        onConfirm: () =>
          handleTransfer(
            { fromAccountId, toAccountId, amount: cleanAmount, date, note },
            true
          ),
      });
      return;
    }

    // Update balances (debts use negative balances, so add the deltas directly)
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === fromAccountId) {
          return { ...acc, balance: acc.balance + fromDelta };
        }
        if (acc.id === toAccountId) {
          return { ...acc, balance: acc.balance + toDelta };
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
        amount: fromDelta,
        date,
        description: note || "Transfer out",
        kind: "transfer",
        transferGroupId,
      },
      {
        id: crypto.randomUUID(),
        accountId: toAccountId,
        amount: toDelta,
        date,
        description: note || "Transfer in",
        kind: "transfer",
        transferGroupId,
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
      apr?: number | null;
      minimumPayment?: number | null;
      startingBalance?: number | null;
      isDebt?: boolean;
    }
  ) {
    const trimmedName = updates.name.trim() || original.name;
    const nextBalance = updates.balance;
    const nextCategory = updates.accountCategory ?? original.accountCategory;
    const delta = nextBalance - original.balance;
    const isDebt = updates.isDebt ?? nextCategory === "debt";

    const nextCreditLimit =
      nextCategory === "debt" ? updates.creditLimit ?? null : null;
    const nextAprPercent =
      nextCategory === "debt" ? updates.aprPercent ?? null : null;
    const nextApr =
      nextCategory === "debt"
        ? typeof updates.apr === "number"
          ? updates.apr
          : nextAprPercent != null
          ? nextAprPercent / 100
          : typeof original.apr === "number"
          ? original.apr
          : original.aprPercent != null
          ? original.aprPercent / 100
          : undefined
        : undefined;
    const nextMinimumPayment =
      nextCategory === "debt"
        ? updates.minimumPayment ?? original.minimumPayment
        : undefined;
    const nextStartingBalance = isDebt
      ? updates.startingBalance ??
        original.startingBalance ??
        Math.abs(nextBalance)
      : undefined;

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
              apr: nextApr,
              isDebt,
              minimumPayment: nextMinimumPayment ?? undefined,
              startingBalance: nextStartingBalance,
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
        localStorage.removeItem(`finance-web:dashboard:${activeProfile.id}`);
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
        error instanceof Error
          ? error.message
          : "Failed to update profile name.";
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
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const [profileNameError, setProfileNameError] = useState("");

  // Compute which accounts to show in the 2-pill carousel
  let visibleAccounts: Account[] = [];
  if (accounts.length <= 2) {
    visibleAccounts = accounts;
  } else if (accounts.length > 2) {
    const first = accounts[carouselStartIndex];
    const second = accounts[(carouselStartIndex + 1) % accounts.length];
    visibleAccounts = [first, second].filter(Boolean) as Account[];
  }

  const formattedCurrentBalance = formatCurrency(selectedAccount?.balance ?? 0);

  const accountsSectionProps = {
    selectedAccount,
    visibleAccounts,
    editButtonForId,
    theme,
    formattedBalance: formattedCurrentBalance,
    onNewAccount: () => setIsNewAccountOpen(true),
    onNewTransaction: () => setIsNewTxOpen(true),
    onNewTransfer: () => setIsTransferOpen(true),
    onPrevAccount: handlePrevAccount,
    onNextAccount: handleNextAccount,
    onAccountClick: handleAccountClick,
    onEditAccount: (account: Account) => setEditingAccount(account),
  };

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

  const headerProps = {
    appMenuItems,
    isAppMenuOpen,
    onToggleAppMenu: () => setIsAppMenuOpen((prev) => !prev),

    activeProfileExists: !!activeProfile,
    profileName,
    isEditingProfileName,
    profileNameInput,
    profileNameError,
    onProfileNameInputChange: (value: string) => setProfileNameInput(value),
    onProfileNameSubmit: handleProfileNameSubmit,
    onStartEditingProfileName: handleStartEditingProfileName,

    avatarInitial,
  };

  return (
    <MoneyVisibilityProvider
      initialHideMoney={hideMoney}
      onChange={(next) => setHideMoney(next)}
    >
      <div
        className="min-h-[100svh] w-full text-brand-accent"
        style={{ backgroundColor: currentPalette.background }}
      >
        <div className="flex min-h-[100svh] flex-col">
          {/* TOP BAR */}

          <DashboardHeader {...headerProps} />

          <main className="w-full flex-1">
            <div className="w-full mx-auto px-4 pb-6 pt-6 sm:px-6 lg:px-8 space-y-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-3">
                {/* CURRENT BALANCE CARD */}
                <AccountsSection {...accountsSectionProps} />

                {/* TRANSACTIONS CARD */}
                <section className="rounded-2xl bg-black/10 px-6 py-5 backdrop-blur-sm shadow-md md:col-span-1 md:order-2 xl:px-7 xl:py-7 xl:min-h-[30vh]">
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
                              tx.amount < 0
                                ? "text-red-200"
                                : "text-emerald-200"
                            }
                          >
                            {formatCurrency(tx.amount)}
                          </span>
                        </button>
                      ))}
                  </div>
                </section>

                {/* UPCOMING BILLS CARD */}
                <BillsSection {...billsSectionProps} />

                {/* DEBT PAYOFF PROGRESS */}
                <DebtPayoffSection {...debtSectionProps} />

                {/* NET WORTH */}
                <div className="md:col-span-2 md:order-3 xl:h-full">
                  <NetWorthCard
                    accounts={accounts}
                    netWorthHistory={netWorthHistory}
                    viewMode={netWorthViewMode}
                    onViewModeChange={(mode) => setNetWorthViewMode(mode)}
                  />
                </div>
              </div>
            </div>
          </main>
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

        {/* OVERPAY CONFIRMATION MODAL */}
        {pendingOverpay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div
              className={`w-full max-w-md ${modalCardBase} p-6 backdrop-blur-sm`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Confirm Overpayment
                </h2>
                <button
                  type="button"
                  onClick={() => setPendingOverpay(null)}
                  className={modalCloseButtonClass}
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)]">
                Paying {formatCurrency(Math.abs(pendingOverpay.delta))} will
                push{" "}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {pendingOverpay.accountName}
                </span>{" "}
                above $0 (new balance{" "}
                {formatCurrency(pendingOverpay.nextBalance)}). Continue?
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingOverpay(null)}
                  className={modalGhostButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = pendingOverpay.onConfirm;
                    setPendingOverpay(null);
                    action?.();
                  }}
                  className={modalPrimaryButtonClass}
                >
                  Continue anyway
                </button>
              </div>
            </div>
          </div>
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
            onSave={({
              name,
              balance,
              accountCategory,
              creditLimit,
              aprPercent,
              apr,
              minimumPayment,
              startingBalance,
              isDebt,
            }) => {
              handleSaveEditedAccount(editingAccount, {
                name,
                balance,
                accountCategory,
                creditLimit,
                aprPercent,
                apr,
                minimumPayment,
                startingBalance,
                isDebt,
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
        {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}

        {/* FEEDBACK MODAL */}
        {isFeedbackOpen && (
          <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />
        )}

        {isThemePickerOpen && (
          <ThemePickerModal onClose={() => setIsThemePickerOpen(false)} />
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
