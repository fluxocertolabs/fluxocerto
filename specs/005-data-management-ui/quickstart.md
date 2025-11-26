# Quickstart: Data Management UI

**Feature**: 005-data-management-ui  
**Date**: 2025-11-26

## Prerequisites

- Node.js 20+
- pnpm 10+
- Project cloned and dependencies installed (`pnpm install`)

## Setup Steps

### 1. Install New Dependencies

```bash
# Add routing library (exact version)
pnpm add react-router-dom@7.9.6

# Install shadcn/ui components
pnpm dlx shadcn@latest add button card dialog input label select switch tabs alert-dialog
```

### 2. Verify Installation

```bash
# Check new dependency
cat package.json | grep react-router-dom
# Expected: "react-router-dom": "7.9.6"

# Check shadcn components installed
ls src/components/ui/
# Expected: button.tsx, card.tsx, dialog.tsx, input.tsx, label.tsx, select.tsx, switch.tsx, tabs.tsx, alert-dialog.tsx
```

### 3. Start Development Server

```bash
pnpm dev
# Opens at http://localhost:5173
```

## Implementation Order

### Phase 1: Routing Setup
1. Update `src/App.tsx` with BrowserRouter and Routes
2. Create `src/pages/manage.tsx` (basic shell)
3. Create `src/components/layout/header.tsx`
4. Verify navigation works: `/` → Dashboard, `/manage` → Manage page

### Phase 2: Data Access Hook
1. Create `src/hooks/use-finance-data.ts`
2. Test hook returns data from IndexedDB

### Phase 3: Manage Page Structure
1. Implement tabbed layout in `src/pages/manage.tsx`
2. Create empty list components for each entity type
3. Wire up tab navigation

### Phase 4: Entity Lists
1. Implement `AccountList` and `AccountListItem`
2. Implement `ProjectList` and `ProjectListItem`
3. Implement `ExpenseList` and `ExpenseListItem`
4. Implement `CreditCardList` and `CreditCardListItem`

### Phase 5: Forms
1. Create shared form dialog wrapper
2. Implement `AccountForm`
3. Implement `ProjectForm`
4. Implement `ExpenseForm`
5. Implement `CreditCardForm`

### Phase 6: Inline Editing
1. Create `InlineEditInput` component
2. Integrate with AccountListItem (balance)
3. Integrate with CreditCardListItem (balance)

### Phase 7: Delete & Toggle
1. Create `DeleteConfirmation` dialog
2. Wire up delete actions for all entities
3. Wire up toggle active for projects and expenses

### Phase 8: Empty State & Navigation
1. Update `src/components/cashflow/empty-state.tsx` with CTA button
2. Verify full navigation flow

## Key Files to Create

```
src/
├── components/
│   ├── layout/
│   │   └── header.tsx              # NEW
│   └── manage/
│       ├── accounts/
│       │   ├── account-form.tsx    # NEW
│       │   ├── account-list.tsx    # NEW
│       │   └── account-list-item.tsx # NEW
│       ├── projects/
│       │   ├── project-form.tsx    # NEW
│       │   ├── project-list.tsx    # NEW
│       │   └── project-list-item.tsx # NEW
│       ├── expenses/
│       │   ├── expense-form.tsx    # NEW
│       │   ├── expense-list.tsx    # NEW
│       │   └── expense-list-item.tsx # NEW
│       ├── credit-cards/
│       │   ├── credit-card-form.tsx # NEW
│       │   ├── credit-card-list.tsx # NEW
│       │   └── credit-card-list-item.tsx # NEW
│       └── shared/
│           ├── entity-empty-state.tsx # NEW
│           ├── delete-confirmation.tsx # NEW
│           └── inline-edit-input.tsx # NEW
├── hooks/
│   └── use-finance-data.ts         # NEW
├── pages/
│   └── manage.tsx                  # NEW
└── App.tsx                         # MODIFY
```

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add BrowserRouter, Routes, Header |
| `src/components/cashflow/empty-state.tsx` | Add CTA Link to /manage |

## Testing Checklist

### Manual Testing

- [ ] Navigate to `/` - Dashboard loads
- [ ] Navigate to `/manage` - Manage page loads with tabs
- [ ] Empty state shows when no data exists
- [ ] Can add a bank account
- [ ] Can add a project
- [ ] Can add an expense
- [ ] Can add a credit card
- [ ] Can edit any entity
- [ ] Can delete any entity (with confirmation)
- [ ] Can toggle project active/inactive
- [ ] Can toggle expense active/inactive
- [ ] Can inline edit bank account balance
- [ ] Can inline edit credit card balance
- [ ] Changes reflect in dashboard immediately
- [ ] Forms validate correctly (try empty name, negative amount)
- [ ] Works on mobile viewport (320px width)
- [ ] Browser back/forward works

### Automated Testing (Future)

```bash
pnpm test
```

## Common Issues

### shadcn components not found
```bash
# Re-run installation
pnpm dlx shadcn@latest add button card dialog input label select switch tabs alert-dialog
```

### Routing not working
- Ensure `BrowserRouter` wraps entire app in `main.tsx` or `App.tsx`
- Check browser console for errors

### Data not persisting
- Check IndexedDB in DevTools (Application → IndexedDB → FamilyFinanceDB)
- Clear browser data and retry

### Styles not applying
- Ensure Tailwind CSS is processing files
- Check `src/index.css` imports

## Development Commands

```bash
# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build
```

