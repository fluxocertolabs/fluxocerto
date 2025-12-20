# UI Component Contracts: Data Management UI

**Feature**: 005-data-management-ui  
**Date**: 2025-11-26

## Overview

This document defines the component interfaces (props, events, behaviors) for the Data Management UI feature. These contracts serve as the specification for implementation.

---

## Layout Components

### Header

**Path**: `src/components/layout/header.tsx`

```typescript
interface HeaderProps {
  // No props - uses React Router for navigation state
}
```

**Behavior**:
- Displays app title/logo
- Shows navigation links: Dashboard, Manage
- Highlights active route
- Responsive: hamburger menu on mobile (future enhancement, not MVP)

**Renders**:
```tsx
<header className="border-b bg-background">
  <nav className="container flex items-center justify-between h-14">
    <Link to="/">Fluxo Certo</Link>
    <div className="flex gap-4">
      <NavLink to="/">Dashboard</NavLink>
      <NavLink to="/manage">Manage</NavLink>
    </div>
  </nav>
</header>
```

---

## Page Components

### ManagePage

**Path**: `src/pages/manage.tsx`

```typescript
interface ManagePageProps {
  // No props - standalone page component
}
```

**Behavior**:
- Renders tabbed interface with 4 tabs: Accounts, Projects, Expenses, Cards
- Each tab shows corresponding entity list
- Provides "Add" button for each entity type
- Handles loading state while data loads

**Tab Structure**:
| Tab Value | Label | Content Component |
|-----------|-------|-------------------|
| `accounts` | Accounts | `<AccountList />` |
| `projects` | Projects | `<ProjectList />` |
| `expenses` | Expenses | `<ExpenseList />` |
| `cards` | Cards | `<CreditCardList />` |

---

## Entity List Components

### AccountList

**Path**: `src/components/manage/accounts/account-list.tsx`

```typescript
interface AccountListProps {
  accounts: BankAccount[]
  onEdit: (account: BankAccount) => void
  onDelete: (id: string) => void
  onUpdateBalance: (id: string, balance: number) => void
}
```

**Behavior**:
- Displays all accounts in a list
- Shows empty state if no accounts
- Each item supports inline balance editing
- Edit button opens edit dialog
- Delete button shows confirmation

---

### ProjectList

**Path**: `src/components/manage/projects/project-list.tsx`

```typescript
interface ProjectListProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
}
```

**Behavior**:
- Displays all projects in a list
- Active projects displayed normally
- Inactive projects displayed with reduced opacity + "Inactive" badge
- Toggle switch for active/inactive status
- Edit button opens edit dialog
- Delete button shows confirmation

---

### ExpenseList

**Path**: `src/components/manage/expenses/expense-list.tsx`

```typescript
interface ExpenseListProps {
  expenses: FixedExpense[]
  onEdit: (expense: FixedExpense) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
}
```

**Behavior**:
- Same pattern as ProjectList
- Active/inactive visual distinction
- Toggle, edit, delete actions

---

### CreditCardList

**Path**: `src/components/manage/credit-cards/credit-card-list.tsx`

```typescript
interface CreditCardListProps {
  creditCards: CreditCard[]
  onEdit: (card: CreditCard) => void
  onDelete: (id: string) => void
  onUpdateBalance: (id: string, balance: number) => void
}
```

**Behavior**:
- Displays all credit cards in a list
- Inline balance editing for quick updates
- Edit button opens edit dialog
- Delete button shows confirmation
- No active/inactive toggle (per spec)

---

## Entity List Item Components

### AccountListItem

**Path**: `src/components/manage/accounts/account-list-item.tsx`

```typescript
interface AccountListItemProps {
  account: BankAccount
  onEdit: () => void
  onDelete: () => void
  onUpdateBalance: (balance: number) => void
}
```

**Display Fields**:
- Name (truncated with tooltip if > 30 chars)
- Type badge (Checking | Savings | Investment)
- Balance (inline editable)

**Actions**:
- Click balance → inline edit mode
- Edit button → triggers `onEdit`
- Delete button → triggers `onDelete`

---

### ProjectListItem

**Path**: `src/components/manage/projects/project-list-item.tsx`

```typescript
interface ProjectListItemProps {
  project: Project
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}
```

**Display Fields**:
- Name (truncated)
- Amount (formatted currency)
- Frequency badge
- Certainty badge
- Payment day
- Active status indicator

**Actions**:
- Toggle switch → triggers `onToggleActive`
- Edit button → triggers `onEdit`
- Delete button → triggers `onDelete`

---

### ExpenseListItem

**Path**: `src/components/manage/expenses/expense-list-item.tsx`

```typescript
interface ExpenseListItemProps {
  expense: FixedExpense
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}
```

**Display Fields**:
- Name (truncated)
- Amount (formatted currency)
- Due day
- Active status indicator

**Actions**:
- Toggle switch → triggers `onToggleActive`
- Edit button → triggers `onEdit`
- Delete button → triggers `onDelete`

---

### CreditCardListItem

**Path**: `src/components/manage/credit-cards/credit-card-list-item.tsx`

```typescript
interface CreditCardListItemProps {
  card: CreditCard
  onEdit: () => void
  onDelete: () => void
  onUpdateBalance: (balance: number) => void
}
```

**Display Fields**:
- Name (truncated)
- Statement balance (inline editable)
- Due day

**Actions**:
- Click balance → inline edit mode
- Edit button → triggers `onEdit`
- Delete button → triggers `onDelete`

---

## Form Components

### AccountForm

**Path**: `src/components/manage/accounts/account-form.tsx`

```typescript
interface AccountFormProps {
  account?: BankAccount      // undefined for add, defined for edit
  onSubmit: (data: BankAccountInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}
```

**Fields**:
| Field | Type | Label | Placeholder |
|-------|------|-------|-------------|
| name | text | Account Name | "e.g., Main Checking" |
| type | select | Account Type | - |
| balance | number | Current Balance | "0.00" |

**Validation**:
- Name: required, max 100 chars
- Type: required selection
- Balance: required, ≥ 0

---

### ProjectForm

**Path**: `src/components/manage/projects/project-form.tsx`

```typescript
interface ProjectFormProps {
  project?: Project
  onSubmit: (data: ProjectInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}
```

**Fields**:
| Field | Type | Label | Placeholder |
|-------|------|-------|-------------|
| name | text | Project Name | "e.g., Client Retainer" |
| amount | number | Payment Amount | "0.00" |
| paymentDay | number | Payment Day | "1-31" |
| frequency | select | Frequency | - |
| certainty | select | Certainty | - |

**Validation**:
- Name: required, max 100 chars
- Amount: required, > 0
- Payment Day: required, 1-31
- Frequency: required selection
- Certainty: required selection

**Note**: `isActive` defaults to `true` for new projects, not shown in form.

---

### ExpenseForm

**Path**: `src/components/manage/expenses/expense-form.tsx`

```typescript
interface ExpenseFormProps {
  expense?: FixedExpense
  onSubmit: (data: FixedExpenseInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}
```

**Fields**:
| Field | Type | Label | Placeholder |
|-------|------|-------|-------------|
| name | text | Expense Name | "e.g., Mortgage" |
| amount | number | Amount | "0.00" |
| dueDay | number | Due Day | "1-31" |

**Validation**:
- Name: required, max 100 chars
- Amount: required, > 0
- Due Day: required, 1-31

**Note**: `isActive` defaults to `true` for new expenses, not shown in form.

---

### CreditCardForm

**Path**: `src/components/manage/credit-cards/credit-card-form.tsx`

```typescript
interface CreditCardFormProps {
  card?: CreditCard
  onSubmit: (data: CreditCardInput) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}
```

**Fields**:
| Field | Type | Label | Placeholder |
|-------|------|-------|-------------|
| name | text | Card Name | "e.g., Amex Gold" |
| statementBalance | number | Statement Balance | "0.00" |
| dueDay | number | Due Day | "1-31" |

**Validation**:
- Name: required, max 100 chars
- Statement Balance: required, ≥ 0
- Due Day: required, 1-31

---

## Shared Components

### InlineEditInput

**Path**: `src/components/manage/shared/inline-edit-input.tsx`

```typescript
interface InlineEditInputProps {
  value: number
  onSave: (value: number) => Promise<void>
  formatDisplay: (value: number) => string
  min?: number
  step?: number
  className?: string
}
```

**Behavior**:
1. **Display Mode**: Shows formatted value as clickable element
2. **Edit Mode**: Shows input field
3. **Transitions**:
   - Click → Enter edit mode
   - Blur → Save and exit edit mode
   - Enter → Save and exit edit mode
   - Escape → Cancel and exit edit mode (restore original value)

**Accessibility**:
- Display mode: `role="button"`, `tabIndex={0}`
- Edit mode: `autoFocus`, `aria-label`

---

### EntityEmptyState

**Path**: `src/components/manage/shared/entity-empty-state.tsx`

```typescript
interface EntityEmptyStateProps {
  entityType: 'account' | 'project' | 'expense' | 'credit-card'
  onAdd: () => void
}
```

**Content by Type**:
| Type | Title | Description |
|------|-------|-------------|
| account | No accounts yet | Add your bank accounts to track balances |
| project | No income sources yet | Add your income sources to project cashflow |
| expense | No expenses yet | Add your fixed expenses to track outflows |
| credit-card | No credit cards yet | Add your credit cards to track payments |

---

### DeleteConfirmation

**Path**: `src/components/manage/shared/delete-confirmation.tsx`

```typescript
interface DeleteConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName: string
  entityType: string
  onConfirm: () => Promise<void>
  isDeleting: boolean
}
```

**Content**:
- Title: "Delete {entityType}?"
- Description: "Are you sure you want to delete '{entityName}'? This action cannot be undone."
- Actions: Cancel (secondary), Delete (destructive)

**Behavior**:
- Cancel closes dialog
- Delete triggers `onConfirm`, shows loading state, closes on success

---

## Hook Contracts

### useFinanceData

**Path**: `src/hooks/use-finance-data.ts`

```typescript
interface UseFinanceDataReturn {
  accounts: BankAccount[]
  projects: Project[]
  expenses: FixedExpense[]
  creditCards: CreditCard[]
  isLoading: boolean
}

function useFinanceData(): UseFinanceDataReturn
```

**Implementation**:
- Uses `useLiveQuery` from `dexie-react-hooks`
- Returns empty arrays while loading
- `isLoading` true until all queries resolve

---

## Event Flow Examples

### Add New Account

```
User clicks "Add Account" button
  → AccountForm opens in Dialog (account=undefined)
  → User fills form
  → User clicks "Save"
  → onSubmit called with BankAccountInput
  → Store action addAccount() called
  → Success: Dialog closes, list updates reactively
  → Error: Form shows error message
```

### Inline Balance Update

```
User clicks balance value in AccountListItem
  → InlineEditInput enters edit mode
  → User types new value
  → User presses Enter or clicks away
  → onSave called with new number
  → Store action updateAccount() called
  → Success: Display updates, edit mode exits
  → Error: Toast notification (future), value reverts
```

### Toggle Project Active

```
User clicks toggle switch on ProjectListItem
  → onToggleActive called
  → Store action toggleProjectActive() called
  → Success: Visual state updates reactively
  → Error: Toggle reverts, error shown
```

### Delete Entity

```
User clicks delete button on any ListItem
  → DeleteConfirmation dialog opens
  → User clicks "Delete"
  → onConfirm called
  → Store action delete[Entity]() called
  → Success: Dialog closes, item removed from list
  → Error: Dialog shows error, stays open
```

