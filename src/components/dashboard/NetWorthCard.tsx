import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import {
  calculateNetWorthFromAccounts,
  NET_WORTH_MAX_POINTS,
} from "../../lib/netWorth";
import { formatMoney } from "../../lib/money";
import type { Account, NetWorthSnapshot } from "../../lib/financeTypes";
import { useMoneyVisibility } from "../../MoneyVisibilityContext";
import { useTheme } from "../../ThemeProvider";

const chartFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
});

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return chartFormatter.format(parsed);
}

type ViewMode = "minimal" | "detailed";

type NetWorthCardProps = {
  accounts: Account[];
  netWorthHistory: NetWorthSnapshot[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function NetWorthCard({
  accounts,
  netWorthHistory,
  viewMode,
  onViewModeChange,
}: NetWorthCardProps) {
  const { hideMoney, toggleHideMoney } = useMoneyVisibility();
  const { theme } = useTheme();

  const { netWorth, totalAssets, totalDebts } = useMemo(
    () => calculateNetWorthFromAccounts(accounts),
    [accounts]
  );

  const sortedHistory = useMemo(
    () => [...netWorthHistory].sort((a, b) => a.date.localeCompare(b.date)),
    [netWorthHistory]
  );

  const trimmedHistory = sortedHistory.slice(-NET_WORTH_MAX_POINTS);
  const latestSnapshot = trimmedHistory[trimmedHistory.length - 1];
  const previousSnapshot =
    trimmedHistory.length > 1 ? trimmedHistory[trimmedHistory.length - 2] : null;

  const changeSincePrevious =
    latestSnapshot && previousSnapshot
      ? latestSnapshot.value - previousSnapshot.value
      : null;

  const hasData = accounts.length > 0 && trimmedHistory.length > 0;
  const isDetailed = viewMode === "detailed";
  const gradientColor = theme === "dark" ? "#F9F3D6" : "#E37B3F";
  const axisColor =
    theme === "dark" ? "rgba(249,243,214,0.7)" : "rgba(44,35,31,0.6)";
  const gridColor =
    theme === "dark" ? "rgba(249,243,214,0.2)" : "rgba(44,35,31,0.12)";
  const tooltipStyle =
    theme === "dark"
      ? {
          background: "#211916",
          border: "1px solid #3A2F28",
          borderRadius: "10px",
        }
      : {
          background: "#F7F2D9",
          border: "1px solid #C9C3A6",
          borderRadius: "10px",
        };

  return (
    <section className="rounded-2xl bg-cardYellow dark:bg-cardYellowDark px-6 py-5 text-textPrimary dark:text-textPrimaryDark shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-textPrimary dark:text-textPrimaryDark">Net Worth</p>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full bg-borderSoft dark:bg-borderSoftDark p-1 text-xs">
            {["minimal", "detailed"].map((mode) => {
              const typedMode = mode as ViewMode;
              const isActive = viewMode === typedMode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(typedMode)}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    isActive
                      ? "bg-primaryButton dark:bg-primaryButtonDark text-toggleDark dark:text-toggleDarkText"
                      : "text-textMuted dark:text-textMutedDark hover:text-textPrimary dark:hover:text-textPrimaryDark"
                  }`}
                >
                  {typedMode === "minimal" ? "Minimal" : "Detailed"}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={toggleHideMoney}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-primaryButtonBorder dark:border-primaryButtonBorderDark bg-primaryButton dark:bg-primaryButtonDark text-toggleDark dark:text-toggleDarkText hover:bg-primaryButtonBorder dark:hover:bg-primaryButtonBorderDark"
            aria-label={hideMoney ? "Show amounts" : "Hide amounts"}
          >
            {hideMoney ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3l18 18M10.477 10.489a2.5 2.5 0 013.033 3.033m1.75 1.757A4.973 4.973 0 0112 17c-2.761 0-5-2.239-5-5 0-.662.133-1.293.372-1.866m2.258-2.26A4.973 4.973 0 0112 7c2.761 0 5 2.239 5 5 0 .728-.155 1.419-.434 2.043M4.5 4.5c2.667-2.667 12.333-2.667 15 0 1.5 1.5 2.277 3.5 2.277 3.5s-.777 2-2.277 3.5a14.919 14.919 0 01-2.011 1.595"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-56 items-center justify-center rounded-xl bg-cardDebt dark:bg-cardDebtDark text-center text-xs text-textSubtle dark:text-textSubtleDark">
          Add your first account or transaction to start tracking your net worth.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-textPrimary dark:text-textPrimaryDark">
                {formatMoney(netWorth, { hide: hideMoney })}
              </p>
              <p className="mt-1 text-xs text-textMuted dark:text-textMutedDark">
                {isDetailed && changeSincePrevious !== null ? (
                  <span
                    className={
                      changeSincePrevious >= 0
                        ? "text-cardGreen dark:text-cardGreenDark"
                        : "text-cardOrange dark:text-cardOrangeDark"
                    }
                  >
                    {changeSincePrevious >= 0 ? "↑" : "↓"}{" "}
                    {formatMoney(Math.abs(changeSincePrevious), {
                      hide: hideMoney,
                    })} {" "}
                    vs last snapshot
                  </span>
                ) : (
                  "Tracked automatically from your accounts"
                )}
              </p>
            </div>
          </div>

          <div className="h-44 rounded-xl bg-cardDebt dark:bg-cardDebtDark px-2 py-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trimmedHistory} margin={{ top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gradientColor} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  stroke={axisColor}
                  tick={{ fontSize: 11, fill: axisColor }}
                />
                <YAxis
                  stroke={axisColor}
                  tickFormatter={(value) => formatMoney(value as number, { hide: hideMoney })}
                  tick={{ fontSize: 11, fill: axisColor }}
                  width={70}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(label) => formatDateLabel(label as string)}
                  formatter={(value: number) =>
                    formatMoney(value, { hide: hideMoney })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={theme === "dark" ? "#F18A4A" : "#E37B3F"}
                  fillOpacity={1}
                  fill="url(#netWorthGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {isDetailed && (
            <div className="grid grid-cols-3 gap-4 text-xs text-textPrimary dark:text-textPrimaryDark">
              <div className="rounded-xl bg-cardDebt dark:bg-cardDebtDark px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-textSubtle dark:text-textSubtleDark">
                  Assets
                </p>
                <p className="text-sm font-semibold text-textPrimary dark:text-textPrimaryDark">
                  {formatMoney(totalAssets, { hide: hideMoney })}
                </p>
              </div>
              <div className="rounded-xl bg-cardDebt dark:bg-cardDebtDark px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-textSubtle dark:text-textSubtleDark">
                  Debts
                </p>
                <p className="text-sm font-semibold text-textPrimary dark:text-textPrimaryDark">
                  {formatMoney(totalDebts, { hide: hideMoney })}
                </p>
              </div>
              <div className="rounded-xl bg-cardDebt dark:bg-cardDebtDark px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-textSubtle dark:text-textSubtleDark">
                  Net Worth
                </p>
                <p className="text-sm font-semibold text-textPrimary dark:text-textPrimaryDark">
                  {formatMoney(netWorth, { hide: hideMoney })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

