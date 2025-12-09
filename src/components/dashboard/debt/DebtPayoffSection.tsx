// src/components/dashboard/debt/DebtPayoffSection.tsx

type DebtPayoffSectionProps = {
  progressPercent: number;
  statusText: string;
  hasInsufficientAllocation: boolean;
  onOpen: () => void;
};

export function DebtPayoffSection({
  progressPercent,
  statusText,
  hasInsufficientAllocation,
  onOpen,
}: DebtPayoffSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-black/10 px-6 py-4 backdrop-blur-sm shadow-md md:col-span-3 md:order-5 md:flex-row md:items-center md:justify-between xl:px-7 xl:py-5 xl:min-h-[16vh]">
      <div className="flex flex-1 flex-col gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="w-fit rounded-md text-left text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-transparent"
        >
          Debt Payoff Progress
        </button>

        <div className="h-4 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
          <div
            className="h-4 rounded-full bg-[var(--color-accent)] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p
          className={`text-[11px] ${
            hasInsufficientAllocation ? "text-[#FBD5D5]" : "text-white/70"
          }`}
        >
          {statusText}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="ml-4 rounded-full px-3 py-2 text-xs font-semibold text-white/80 transition hover:text-white"
      >
        Edit
      </button>
    </section>
  );
}
