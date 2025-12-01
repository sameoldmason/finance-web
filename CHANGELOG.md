# CHANGELOG

## 0.2.0 — Dashboard Update (Bills + Stability Fixes)
2025-11-28

### Added
- Full Upcoming Bills system:
  - Create (once or monthly)
  - Edit bills
  - Monthly recurrence auto-advances due date
  - One-time bills hide after payment
- Mark as Paid flow:
  - Auto-creates expense transaction
  - Updates correct account balance
  - Handles monthly rollovers
- New Bill Modal with keypad + theme-consistent UI
- Edit Bill Modal with validation + frequency toggle
- Bills now persisted via dashboardStore
- Transactions History sorting: date, expenses-first, income-first
- Edit Transaction Amount & Edit Details fully functional

### Fixed
- Black background in modal text fields
- New Bill button styling corrected to match theme
- Missing onTransfer prop in transfer modal
- Carousel no longer forces selected account to left position
- Removed phantom default accounts on new profiles
- Edit Account button visibility restored

### Improved
- Cleaner persistence logic (loadDashboardData / saveDashboardData)
- Smoother modal styling consistency
- Dashboard reorganized for stability before deployment

---

## 0.1.0 — Initial Dashboard + Profile System
2025-11-28

### Added
- Full profile flow (Welcome → Create → Choose → Unlock)
- Password protection + local storage persistence
- Dashboard saved separately per profile
- Accounts:
  - Add / Edit
  - Balance adjustments create auto-transactions
  - 2-pill carousel
- Transactions:
  - Add income/expense
  - Preview (3 max)
  - Full history modal
  - Edit details + edit amount
- Transfers system (from → to) with auto in/out transactions
- Reusable number pad

### UI
- Light/dark theme support
- Cleaner Tailwind classes + gradient layout
- Responsive button labels

### Infrastructure
- GitHub repo initialized
- Vercel deployment (auto-deploy from GitHub)

---

## 0.0.1 — Project Setup
2025-11-24

### Added
- Vite + React setup
- Routing + theme provider
- Initial folder structure
