// src/lib/money.ts

const moneyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number, options?: { hide?: boolean }): string {
  if (options?.hide) return "••••";
  return moneyFormatter.format(value);
}
