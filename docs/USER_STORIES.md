# User Story Map

## User Journey Stages

### Stage 1: Discovery

*How users find and understand your product*

**Must Have (MVP):**
- [x] N/A - Building for yourselves, no discovery needed

**Should Have (v2):**
- [ ] Landing page with clear value prop (if sharing with others)

**Could Have (Future):**
- [ ] Demo mode with sample data
- [ ] Comparison with spreadsheets/other tools

**Won't Have (Excluded):**
- [ ] Marketing site
- [ ] SEO optimization

### Stage 2: Signup/Onboarding

*Getting users into the product*

**Must Have (MVP):**
- [x] N/A - No auth, just open the app and start using

**Should Have (v2):**
- [ ] First-run wizard to set up accounts/projects/expenses
- [ ] Import from spreadsheet (CSV)

**Could Have (Future):**
- [ ] OAuth login (when cloud sync added)
- [ ] Onboarding tutorial/tooltips

**Won't Have (Excluded):**
- [ ] Email verification
- [ ] Team/family invites (for MVP)

### Stage 3: First Value (Aha! Moment)

*The moment users experience core value — seeing your cashflow projection*

**Must Have (MVP):**
- [ ] Add bank accounts (checking, savings, investment)
- [ ] Set current balance for each account
- [ ] Add projects (income sources) with payment schedule and certainty
- [ ] Add fixed expenses with due dates
- [ ] Add credit cards with statement balance and due date
- [ ] View 30-day cashflow projection chart
- [ ] See both optimistic and pessimistic scenarios
- [ ] Danger day flagging (days where balance goes negative)

**Should Have (v2):**
- [ ] Configurable projection length (7, 14, 30, 60, 90 days)
- [ ] Quick "update balances" flow for monthly ritual
- [ ] Summary stats (total income, total expenses, surplus)

**Could Have (Future):**
- [ ] Notifications for upcoming danger days
- [ ] "What-if" scenario planning

**Won't Have (Excluded):**
- [ ] Transaction-level tracking
- [ ] Category-based budgeting
- [ ] Bank account sync/import

### Stage 4: Regular Use

*Ongoing engagement and retention — the monthly ritual*

**Must Have (MVP):**
- [ ] Edit existing accounts/projects/expenses/credit cards
- [ ] Delete accounts/projects/expenses/credit cards
- [ ] Toggle projects/expenses active/inactive
- [ ] Update credit card statement balance (monthly)
- [ ] Update account balances (monthly)
- [ ] Persistent data (survives browser refresh)

**Should Have (v2):**
- [ ] Dashboard with at-a-glance health indicator
- [ ] Quick actions for common tasks
- [ ] Data export (JSON/CSV backup)

**Could Have (Future):**
- [ ] Data import (restore from backup)
- [ ] Historical snapshots (what did last month look like?)
- [ ] Trends over time

**Won't Have (Excluded):**
- [ ] Automatic bank sync
- [ ] Receipt scanning
- [ ] Bill reminders/notifications

### Stage 5: Referral/Growth

*How users spread the word*

**Must Have (MVP):**
- [x] N/A - Personal tool, no referral needed

**Should Have (v2):**
- [ ] Share app link (if hosted publicly)

**Could Have (Future):**
- [ ] "Built with" badge
- [ ] Open source repository

**Won't Have (Excluded):**
- [ ] Referral program
- [ ] Affiliate system

---

## MVP Feature Checklist

### Data Management
- [ ] **Accounts**: CRUD operations for bank accounts
  - [ ] Create account (name, type, initial balance)
  - [ ] Edit account
  - [ ] Delete account
  - [ ] View all accounts with balances

- [ ] **Projects (Income)**: CRUD operations for income sources
  - [ ] Create project (name, amount, payment day, frequency, certainty)
  - [ ] Edit project
  - [ ] Delete project
  - [ ] Toggle active/inactive
  - [ ] View all projects

- [ ] **Fixed Expenses**: CRUD operations for recurring expenses
  - [ ] Create expense (name, amount, due day)
  - [ ] Edit expense
  - [ ] Delete expense
  - [ ] Toggle active/inactive
  - [ ] View all expenses

- [ ] **Credit Cards**: CRUD operations for credit cards
  - [ ] Create credit card (name, statement balance, due day)
  - [ ] Edit credit card (especially statement balance for monthly update)
  - [ ] Delete credit card
  - [ ] View all credit cards

### Cashflow Engine
- [ ] Calculate daily cashflow projection
- [ ] Support optimistic scenario (all income)
- [ ] Support pessimistic scenario (guaranteed income only)
- [ ] Identify danger days (negative balance)
- [ ] Configurable projection length (default 30 days)

### Visualization
- [ ] Cashflow chart (line/area chart showing balance over time)
- [ ] Visual distinction between optimistic/pessimistic
- [ ] Danger day markers/highlights
- [ ] Day-by-day breakdown view

### UX/UI
- [ ] Clean, modern dashboard layout
- [ ] Responsive design (works on desktop, usable on mobile)
- [ ] Quick access to update balances
- [ ] Clear visual hierarchy

---

## Technical Feasibility Notes

**Quick wins (build first):**
- Data model and Dexie.js setup (1 day)
- Basic CRUD forms for all entities (2-3 days)
- Cashflow calculation engine (1 day)
- Simple chart with Recharts (1 day)

**Complex but critical:**
- Dual-scenario visualization (optimistic vs pessimistic)
- Handling different payment frequencies (weekly, biweekly, monthly)
- Edge cases: payments on 31st of month, leap years, etc.

**Defer with workarounds:**
- Data backup → Workaround: Manual copy of IndexedDB (dev tools)
- Cloud sync → Workaround: Use same browser/device
- Import from spreadsheet → Workaround: Manual entry (only done once)

---

## Success Metrics per Stage

| Stage | Metric | MVP Target | v2 Target |
|-------|--------|------------|-----------|
| First Value | Time to see first projection | < 10 min | < 5 min |
| First Value | All data entered correctly | 100% | 100% |
| Regular Use | Monthly update time | < 5 min | < 2 min |
| Regular Use | Actually replaces spreadsheet | Yes | Yes |
| Regular Use | Reduces cashflow anxiety | Subjective | Subjective |

---

## User Flows

### Flow 1: Initial Setup (One-time)

```
1. Open app (no login)
2. Add checking accounts (yours + wife's)
3. Add savings account
4. Add investment account (optional)
5. Set current balance for each
6. Add all active projects with payment details
7. Add all fixed expenses
8. Add all credit cards
9. View cashflow projection → Aha moment!
```

### Flow 2: Monthly Update Ritual

```
1. Open app
2. Update credit card statement balances (for each card)
3. Update account balances (checking, savings, investment)
4. Review cashflow projection
5. Note any danger days → Plan transfers from savings
6. Calculate surplus → Decide allocation (invest, trip, etc.)
7. Done until next month
```

### Flow 3: Ad-hoc Check

```
1. Open app
2. View dashboard
3. Check if any danger days coming up
4. Adjust if needed (maybe a project got delayed → mark as uncertain)
5. Close app
```

---

## Definition of Done (MVP)

The MVP is complete when:

1. ✅ Can add/edit/delete all entity types (accounts, projects, expenses, credit cards)
2. ✅ Can see 30-day cashflow projection with both scenarios
3. ✅ Danger days are clearly flagged
4. ✅ Data persists across browser sessions
5. ✅ The app successfully replaces your Excel spreadsheet
6. ✅ Monthly update ritual takes less than 5 minutes
7. ✅ Both you and your wife can use it (usability)
