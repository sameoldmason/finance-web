# bare.money - Finance Web App

Local-first personal finance dashboard built with React and Vite. All data stays in the browser per profile; no accounts, servers, or syncing.

Live site: https://finance-web-delta.vercel.app

---

## What's live

- Profiles: create up to 3 profiles with a password and optional hint, unlock screen, rename, delete, and session-level rehydration of the active profile.
- Appearance: theme picker with palette options (bare, warm) plus light/dark modes; floating shortcut button.
- Accounts: add debit or credit accounts with balances; credit supports limits, APR %, minimum payments, and starting balance snapshots; edit/delete/restore through the accounts list; balance changes generate adjustment transactions.
- Transactions: add income/expense with a number pad, edit description/date/amount, delete, see a 3-item preview per account, and open a sortable full history; transfers are linked pairs.
- Transfers: move money between accounts with paired entries and balance updates; prevents same-account transfers and warns before overpaying debts.
- Upcoming bills: add one-time or recurring (weekly, bi-weekly, monthly) bills tied to an account; due-status badges; marking paid posts the expense and rolls recurring bills forward.
- Net worth: automatic daily snapshots from account balances, Recharts-powered chart, minimal/detailed views with asset/debt breakdown, and a hide-money toggle.
- Debt payoff: snowball or avalanche modes with configurable monthly allocation, optional interest display, minimum-payment guardrail, progress bar, and estimated payoff dates.
- Data tools: reset transactions/transfers or wipe all accounts; optional profile deletion after a full reset; logout without clearing data.

---

## Data and storage

- Profiles, dashboard data, and theme choices are stored in `localStorage`; the active profile id is kept in `sessionStorage`.
- No remote storage or sync. Clearing browser storage will wipe the app.
- Passwords are stored locally (not hashed); they are a light lock for shared devices, not strong security.

---

## Project structure

- `src/routes/` - Landing, Welcome, profile create/unlock, Dashboard.
- `src/lib/` - Persistence, finance types, net worth and debt-payoff math.
- `src/components/dashboard/ – Dashboard components (header, accounts, bills, net worth, debt payoff).
- `src/ThemeProvider.tsx`, `src/MoneyVisibilityContext.tsx` - Theme palette/mode and hide-money state.

---

## Tech stack

- React 19, TypeScript, Vite, React Router.
- TailwindCSS for styling.
- Recharts for net worth charting.

---

## Run locally

```bash
npm install
npm run dev
```

Build: `npm run build` then `npm run preview`  
Tests: `npm test`

Note: Project may switch to path aliases in the future (@components/_, @lib/_) to reduce long relative imports.
