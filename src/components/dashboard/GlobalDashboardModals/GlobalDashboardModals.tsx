// src/components/dashboard/GlobalDashboardModals/GlobalDashboardModals.tsx
import { useEffect, useState } from "react";
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
} from "../modals/modalStyles";
import { NumberPad } from "../modals/NumberPad";
import { useTheme, ThemeMode, ThemePalette } from "../../../ThemeProvider";
import { DebtPayoffSettings, DebtPayoffMode } from "../../../lib/financeTypes";
import { DebtInput, DebtPayoffResult } from "../../../lib/debtPayoffMath";

// ---- shared helpers (local copy, no dependency on Dashboard.tsx) ----

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  });
}

function formatFriendlyDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

// ---- DebtPayoffModal ----

type DebtPayoffModalProps = {
  onClose: () => void;
  debts: DebtInput[];
  summary: DebtPayoffResult | null;
  settings: DebtPayoffSettings;
  totalMinimumPayments: number;
  onModeChange: (mode: DebtPayoffMode) => void;
  onMonthlyAllocationChange: (amount: number) => void;
  onShowInterestChange: (show: boolean) => void;
};

function DebtPayoffModal({
  onClose,
  debts,
  summary,
  settings,
  totalMinimumPayments,
  onModeChange,
  onMonthlyAllocationChange,
  onShowInterestChange,
}: DebtPayoffModalProps) {
  const [allocationInput, setAllocationInput] = useState(
    settings.monthlyAllocation.toString()
  );
  const [isPadOpen, setIsPadOpen] = useState(false);

  useEffect(() => {
    setAllocationInput(settings.monthlyAllocation.toString());
  }, [settings.monthlyAllocation]);

  const handleAllocationChange = (value: string) => {
    setAllocationInput(value);
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      if (value.trim() === "") {
        onMonthlyAllocationChange(0);
      }
      return;
    }
    onMonthlyAllocationChange(Math.max(0, parsed));
  };

  const insufficient =
    (summary?.insufficientAllocation ||
      settings.monthlyAllocation < totalMinimumPayments) &&
    debts.length > 0;

  const displayDebts =
    summary?.debts ??
    debts.map((debt) => ({
      ...debt,
      estimatedPayoffDate: null as Date | null,
    }));

  const progress =
    summary && debts.length > 0
      ? settings.mode === "snowball"
        ? summary.progressToNextDebt
        : summary.progressTotalPaid
      : 0;
  const progressPercent = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  const nextDebt =
    summary?.nextDebtId && summary.debts
      ? summary.debts.find((debt) => debt.id === summary.nextDebtId)
      : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
      <div className={`relative z-40 w-full max-w-4xl ${modalCardBase} p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Debt tools
            </p>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Debt Payoff Progress
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Switch modes, adjust your monthly allocation, and see estimated
              payoff dates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseButtonClass}
            aria-label="Close debt payoff"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full bg-[var(--color-surface-alt)] px-1 py-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onModeChange("snowball")}
              className={`rounded-full px-3 py-1 transition ${
                settings.mode === "snowball"
                  ? modalToggleActiveClass
                  : modalToggleInactiveClass
              }`}
            >
              Snowball
            </button>
            <button
              type="button"
              onClick={() => onModeChange("avalanche")}
              className={`rounded-full px-3 py-1 transition ${
                settings.mode === "avalanche"
                  ? modalToggleActiveClass
                  : modalToggleInactiveClass
              }`}
            >
              Avalanche
            </button>
          </div>

          <button
            type="button"
            onClick={() => onShowInterestChange(!settings.showInterest)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              settings.showInterest
                ? modalToggleActiveClass
                : modalToggleInactiveClass
            }`}
          >
            {settings.showInterest ? "Hide interest" : "Show interest"}
          </button>
        </div>

        <div className="mb-4">
          <label className={modalLabelClass}>Monthly Allocation for Debt</label>
          <input
            type="text"
            inputMode="decimal"
            value={allocationInput}
            onChange={(e) => handleAllocationChange(e.target.value)}
            onBlur={(e) => handleAllocationChange(e.target.value)}
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
          {insufficient && (
            <p className="mt-1 text-xs text-[#FBD5D5]">
              Monthly allocation must be at least your total minimum payments (
              {formatCurrency(totalMinimumPayments)}).
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Debts
            </p>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              Progress: {progressPercent}%
            </span>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {displayDebts.length === 0 ? (
              <div
                className={`${modalSurfaceAltCard} px-3 py-3 text-sm text-[var(--color-text-secondary)]`}
              >
                Mark an account as credit to start tracking payoff progress.
              </div>
            ) : (
              displayDebts.map((debt) => (
                <div
                  key={debt.id}
                  className={`grid gap-3 rounded-xl ${modalSurfaceAltCard} px-4 py-3 text-sm ${
                    settings.showInterest ? "sm:grid-cols-4" : "sm:grid-cols-3"
                  }`}
                >
                  <div className="sm:col-span-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {debt.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Balance: {formatCurrency(-debt.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                      Minimum
                    </p>
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(debt.minimumPayment)}
                    </p>
                  </div>
                  {settings.showInterest && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                        APR
                      </p>
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {(debt.apr * 100).toFixed(2)}%
                      </p>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        Est. monthly{" "}
                        {formatCurrency(debt.balance * (debt.apr / 12))}
                      </p>
                    </div>
                  )}
                  <div className="sm:text-right">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                      Est. payoff
                    </p>
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {formatFriendlyDate(debt.estimatedPayoffDate)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/60 p-4">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Summary
          </p>
          <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                Mode
              </p>
              <p className="font-semibold capitalize">{settings.mode}</p>
              {settings.mode === "snowball" && (
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Next payoff: {nextDebt?.name ?? "—"}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                Estimated debt-free
              </p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {formatFriendlyDate(
                  summary?.overallEstimatedDebtFreeDate ?? null
                )}
              </p>
              {settings.mode === "snowball" && (
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Next debt est.:{" "}
                  {formatFriendlyDate(
                    summary?.nextDebtEstimatedPayoffDate ?? null
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPadOpen && (
        <NumberPad
          value={allocationInput}
          onChange={(v) => handleAllocationChange(v)}
          onClose={() => setIsPadOpen(false)}
        />
      )}
    </div>
  );
}

// ---- Reset / profile / logout / about / feedback / theme ----

export type ResetChoice =
  | "transactions"
  | "transfers"
  | "transactions-transfers"
  | "accounts-all";

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
      detail:
        "Clear everyday income and expenses. Transfers and accounts stay put.",
    },
    {
      key: "transfers",
      title: "Delete only transfers",
      detail:
        "Remove transfer history while keeping transactions and account balances.",
    },
    {
      key: "transactions-transfers",
      title: "Delete transactions + transfers",
      detail: "Keep your accounts but wipe all activity records.",
    },
    {
      key: "accounts-all",
      title: "Accounts + transactions + transfers",
      detail:
        "Start fresh with empty accounts. You can delete the profile next if you want.",
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
              Stay on the dashboard for the first three options. The last option
              offers a profile delete.
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
          Accounts, transactions, and transfers are cleared. Stay to rebuild the
          dashboard, or delete the profile to head back to the profile selector.
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
          We&apos;ll take you back to the profile screen. Your data stays saved
          for the next sign in.
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
            bare.money is a simple personal finance dashboard I'm building for
            myself.
            <br />
            In Toronto, "bare" means a lot - and that's what money usually feels
            like. A lot to think about. A lot to manage. A lot to learn. I
            wanted something that made all of that feel lighter. Something
            clean, fast, and not packed with features I'd never touch. So I made
            my own.
          </p>
          <p className={modalSubtleTextClass}>
            The app keeps everything straightforward. You can create profiles,
            manage accounts, track income and expenses, move money around, and
            see your activity at a glance. Everything stays stored locally in
            your browser - your data is yours. No sign-ups. No syncing. No
            servers. Just a calm, simple tool that helps you understand where
            your money is going.
          </p>
          <p className={modalSubtleTextClass}>
            bare.money is still growing. Soon, it'll include recurring bills,
            net-worth tracking, and debt payoff tools. The goal is for all of it
            to feel soft, minimal, and personal - something that supports your
            life instead of overwhelming it.
          </p>
          <p className={modalSubtleTextClass}>
            You don't need to be a finance expert. You don't need perfect
            habits. You just need a place to start.
          </p>
          <p className={modalSubtleTextClass}>
            This project isn't a company or a startup (at least not yet). It's
            just me learning, building, and trying to get my money right. I want
            bare.money to reflect that journey - real progress, real mistakes,
            and real change. If it works for me, maybe it'll work for anyone
            else who feels the same way.
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

// ---- ThemePickerModal + ThemePreview ----

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
            className={modalCloseButtonClass}
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

export {
  DebtPayoffModal,
  ResetDataModal,
  DeleteProfilePrompt,
  LogoutPrompt,
  AboutModal,
  FeedbackModal,
  ThemePickerModal,
};
