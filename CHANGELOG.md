# Changelog

All notable changes to this project will be documented in this file.

---

## 0.1.0 — Initial Dashboard + Profile System  
**2025-11-28**

### Added
- Full profile creation system:
  - Welcome screen
  - Create Profile
  - Choose Profile
  - Unlock Profile (password-protected)
- ActiveProfileContext for managing profile sessions.
- LocalStorage-backed dashboard state per profile.

### Dashboard
- Accounts:
  - Add new accounts
  - Edit account name and balance
  - Balance adjustments auto-create a transaction
  - Two-pill carousel with left/right arrows
  - Selected-account edit button restored

- Transactions:
  - Add new income/expense transactions
  - Ready-only 3-transaction preview
  - Full transaction history modal
  - Sort by date / expenses-first / income-first
  - Edit transaction title + date modal
  - Edit amount modal with automatic balance recalculation

- Transfers:
  - Transfer modal (from → to)
  - Auto-create transfer-in / transfer-out transactions
  - Balance adjustments handled cleanly

- Number Pad:
  - Reusable number pad for amount fields
  - Used in New Transaction, New Account, Edit Account, Edit Amount

### UI / Styling
- Implemented light/dark theme support through ThemeProvider.
- Fixed Tailwind class issues (`bg-white`, text colors, hover colors).
- Gradient backgrounds consistent across layout.
- Responsive text wrapping for dashboard button labels.

### Infrastructure
- Project deployed to Vercel (`finance-web-delta.vercel.app`)
- GitHub repository created (`github.com/sameoldmason/finance-web`)
- Automated deployments from GitHub → Vercel

---

## 0.0.1 — Project Setup  
**2025-11-24**

### Added
- Vite + React project initialization
- Base folder structure
- ThemeProvider
- Routing screens for account creation flow
- Starter components and layout
