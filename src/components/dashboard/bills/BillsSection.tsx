// src/components/dashboard/bills/BillsSection.tsx
import type { Bill } from "../../../lib/financeTypes";

type DueStatusTone = "danger" | "warning" | "muted";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDueStatus(dueDate: string): { label: string; tone: DueStatusTone } {
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.ceil(
    (due.getTime() - startOfToday().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (Number.isNaN(diffDays)) {
    return { label: "No due date", tone: "muted" };
  }

  if (diffDays < 0) {
    const overdueBy = Math.abs(diffDays);
    return {
      label: `Overdue by ${overdueBy} day${overdueBy === 1 ? "" : "s"}`,
      tone: "danger",
    };
  }

  if (diffDays === 0) {
    return { label: "Due today", tone: "warning" };
  }

  if (diffDays === 1) {
    return { label: "Due tomorrow", tone: "warning" };
  }

  if (diffDays <= 7) {
    return { label: `Due in ${diffDays} days`, tone: "warning" };
  }

  return { label: `Due ${dueDate}`, tone: "muted" };
}

export interface BillsSectionProps {
  accountsCount: number;
  unpaidBills: Bill[];
  onOpenNewBill: () => void;
  onOpenBillsModal: () => void;
  onEditBill: (bill: Bill) => void;
  onMarkBillPaid: (bill: Bill) => void;
}

export function BillsSection({
  accountsCount,
  unpaidBills,
  onOpenNewBill,
  onOpenBillsModal,
  onEditBill,
  onMarkBillPaid,
}: BillsSectionProps) {
  const hasAccounts = accountsCount > 0;

  return (
    <section className="rounded-2xl bg-black/10 px-6 py-5 backdrop-blur-sm shadow-md min-h-[260px] md:col-span-1 md:order-4 xl:px-7 xl:py-7 xl:min-h-[30vh]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Upcoming Bills</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => hasAccounts && onOpenNewBill()}
            disabled={!hasAccounts}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition ${
              !hasAccounts
                ? "bg-[var(--color-surface-alt)]/10 text-white/30 cursor-not-allowed"
                : "bg-[var(--color-surface-alt)]/20 text-[#F5FEFA] hover:bg-[var(--color-surface-alt)]/30"
            }`}
            aria-label="Add bill"
            title={!hasAccounts ? "Create an account first" : "Add new bill"}
          >
            +
          </button>
          <button
            type="button"
            onClick={onOpenBillsModal}
            className="text-xs text-white/60 hover:text-white transition"
          >
            more
          </button>
        </div>
      </div>

      <div className="flex min-h-[232px] flex-col">
        {unpaidBills.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl bg-[var(--color-surface-alt)]/5 text-xs text-white/60">
            No upcoming bills yet. Add your first bill to get reminders here.
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="space-y-2">
              {[...unpaidBills]
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 3)
                .map((bill) => {
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
                    <div
                      key={bill.id}
                      className="flex items-center justify-between rounded-xl bg-[var(--color-surface-alt)]/5 px-4 py-3 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onEditBill(bill)}
                        className="flex flex-1 flex-col text-left"
                      >
                        <span className="font-semibold">{bill.name}</span>
                        <span className="flex items-center gap-2 text-[11px] text-white/60">
                          <span>Due {bill.dueDate}</span>
                          <span className={`${badgeBase} ${badgeColor}`}>
                            {status.label}
                          </span>
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
                          onClick={() => onMarkBillPaid(bill)}
                          className="mt-1 rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold text-white/80 hover:bg-[var(--color-surface-alt)]/10"
                        >
                          Mark paid
                        </button>
                      </div>
                    </div>
                  );
                })}
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
  );
}
