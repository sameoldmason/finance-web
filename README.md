# Finance Web App

A personal finance dashboard built with **React + Vite**, designed for simple, fast, and local budgeting.  
Each profile stores its own data securely in the browser using `localStorage`, with no external database required.

Live site:  
➡️ **https://finance-web-delta.vercel.app**

---

## 🚀 Features

### Profiles
- Create up to 3 profiles
- Password-protected unlock screen
- Local data stored separately per profile
- Auto-locking behavior planned for future versions

### Dashboard
#### Accounts
- Add, edit, and manage multiple accounts
- Two-pill carousel navigation
- Automatic balance tracking
- Balance adjustment transactions created automatically

#### Transactions
- Add income or expense transactions
- Quick number pad input
- Edit title, date, and amount
- 3-item preview on dashboard
- Full history modal with:
  - Sort by date
  - Sort by expenses first
  - Sort by income first

#### Transfers
- Move money between accounts
- Automatically generates outgoing + incoming entries
- Account balances update instantly

#### Upcoming Bills (coming soon)
- Add recurring bills
- Monthly/bi-weekly due dates
- Upcoming bill alerts

#### Net Worth (coming soon)
- Automatic net worth calculation
- Trends and history planned

#### Debt Payoff Progress (coming soon)
- Track credit cards, loans, and installment plans
- Snowball and avalanche payoff modes

---

## 🗂 Project Structure

src/
├─ routes/ # App pages (Dashboard, Welcome, CreateProfile, etc.)
├─ lib/ # Shared types + storage helpers
├─ ThemeProvider.tsx # Light/Dark theme context
└─ ActiveProfileContext.tsx


---

## 💾 Storage

All data is stored per-profile using `localStorage`:

- Accounts
- Transactions
- (Bills, Debts coming soon)

If the browser storage is cleared, the profile's data resets.

---

## 🛠 Tech Stack

- **React**
- **Vite**
- **TypeScript**
- **TailwindCSS**
- **LocalStorage**
- **Vercel** (deployments)
- **GitHub** (version control)

---

## 🧩 Development

Clone the project:

```bash
git clone https://github.com/sameoldmason/finance-web
cd finance-web
npm install
npm run dev

To Build for production:
npm run build
