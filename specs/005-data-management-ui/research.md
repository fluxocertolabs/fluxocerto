# Research: Data Management UI

**Feature**: 005-data-management-ui  
**Date**: 2025-11-26  
**Status**: Complete

## Research Tasks

### 1. Routing Library Selection

**Question**: Which routing library should be used for the `/manage` route?

**Decision**: react-router-dom@7.9.6

**Rationale**:
- Industry standard for React SPAs
- Lightweight and well-maintained
- Excellent TypeScript support
- Simple declarative API with `BrowserRouter`, `Routes`, `Route`
- React 19 compatible (verified via Context7 docs)
- No server-side requirements for SPA mode

**Alternatives Considered**:
- **TanStack Router**: More features but overkill for 2 routes, adds complexity
- **wouter**: Smaller but less ecosystem support
- **No router (conditional rendering)**: Would break browser back/forward, no shareable URLs

**Implementation Pattern** (from React Router v7 docs):
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/manage" element={<ManagePage />} />
    </Routes>
  </BrowserRouter>
);
```

---

### 2. shadcn/ui Components Required

**Question**: Which shadcn/ui components need to be installed?

**Decision**: Install the following components via CLI:
- `button` - Form submissions, actions
- `card` - Entity list items, form containers
- `dialog` - Add/edit entity modals
- `input` - Text and number inputs
- `label` - Form field labels
- `select` - Dropdowns (account type, frequency, certainty)
- `switch` - Active/inactive toggles
- `tabs` - Main navigation between entity types
- `alert-dialog` - Delete confirmation

**Rationale**:
- All components are accessible by default (ARIA compliant)
- Consistent styling with Tailwind CSS
- Composable and customizable
- Already configured in `components.json` (new-york style, neutral base color)

**Installation Command**:
```bash
pnpm dlx shadcn@latest add button card dialog input label select switch tabs alert-dialog
```

---

### 3. Form Validation Strategy

**Question**: How should form validation be implemented?

**Decision**: Use Zod schemas (already exist in `src/types/index.ts`) with controlled React forms

**Rationale**:
- Zod schemas already defined for all entities (`BankAccountInputSchema`, `ProjectInputSchema`, etc.)
- Runtime validation already integrated in store actions
- No need for additional form library (react-hook-form would be overkill for simple forms)
- Inline validation errors displayed on blur/submit

**Implementation Pattern**:
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async () => {
  const result = BankAccountInputSchema.safeParse(formData);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    setErrors(Object.fromEntries(
      Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])
    ));
    return;
  }
  // Proceed with store action
};
```

---

### 4. Inline Editing Pattern

**Question**: How should inline balance editing work for quick updates?

**Decision**: Custom `InlineEditInput` component with click-to-edit behavior

**Rationale**:
- Spec requirement (FR-011, FR-012) for fast monthly updates
- Display mode shows formatted value, edit mode shows input
- Save on blur or Enter, cancel on Escape
- Immediate persistence via store actions

**Implementation Pattern**:
```tsx
function InlineEditInput({ value, onSave, formatDisplay }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  if (!isEditing) {
    return (
      <button onClick={() => setIsEditing(true)} className="...">
        {formatDisplay(value)}
      </button>
    );
  }
  
  return (
    <input
      autoFocus
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => { onSave(editValue); setIsEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onSave(editValue); setIsEditing(false); }
        if (e.key === 'Escape') { setEditValue(value); setIsEditing(false); }
      }}
    />
  );
}
```

---

### 5. Data Access Pattern

**Question**: How should components access financial data from IndexedDB?

**Decision**: Use `dexie-react-hooks` (already installed) with `useLiveQuery`

**Rationale**:
- Already a project dependency (`dexie-react-hooks@4.2.0`)
- Provides reactive queries that auto-update when data changes
- Integrates seamlessly with existing Dexie.js database
- No additional state management needed for read operations

**Implementation Pattern**:
```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

function useFinanceData() {
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const creditCards = useLiveQuery(() => db.creditCards.toArray()) ?? [];
  
  const isLoading = accounts === undefined || projects === undefined || 
                    expenses === undefined || creditCards === undefined;
  
  return { accounts, projects, expenses, creditCards, isLoading };
}
```

---

### 6. Navigation Architecture

**Question**: How should navigation between Dashboard and Manage page work?

**Decision**: 
- Persistent header with navigation links (visible on both pages)
- CTA button in empty state linking to `/manage`
- React Router `Link` components for navigation

**Rationale**:
- Spec requirement (FR-001, FR-002) for accessible navigation
- Single-action navigation (SC-007)
- Consistent UX across pages

**Implementation**:
- `Header` component with logo/title and nav links
- `EmptyState` component updated with `Link to="/manage"` CTA
- Both pages wrapped in shared layout

---

### 7. Mobile Responsiveness Strategy

**Question**: How to ensure forms are usable on 320px screens?

**Decision**: Mobile-first Tailwind classes with stacked layouts

**Rationale**:
- Spec requirement (SC-006) for minimum 320px width
- Tailwind's responsive prefixes (`sm:`, `md:`) for breakpoints
- Forms stack vertically on mobile, side-by-side on desktop
- Touch-friendly tap targets (min 44px)

**Implementation Patterns**:
```tsx
// Form layout
<div className="grid gap-4 sm:grid-cols-2">
  <div className="grid gap-2">
    <Label>Name</Label>
    <Input />
  </div>
  <div className="grid gap-2">
    <Label>Amount</Label>
    <Input type="number" />
  </div>
</div>

// List items
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
  <span className="font-medium truncate">{name}</span>
  <span className="text-muted-foreground">{formatCurrency(amount)}</span>
</div>
```

---

### 8. Active/Inactive Visual Distinction

**Question**: How to visually distinguish active from inactive entities?

**Decision**: Opacity reduction + badge indicator

**Rationale**:
- Clear visual hierarchy
- Accessible (not color-only)
- Consistent with common UI patterns

**Implementation**:
```tsx
<div className={cn(
  "p-4 rounded-lg border",
  !isActive && "opacity-60"
)}>
  <div className="flex items-center gap-2">
    <span>{name}</span>
    {!isActive && (
      <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
    )}
  </div>
</div>
```

---

## Dependencies to Add

| Package | Version | Purpose |
|---------|---------|---------|
| react-router-dom | 7.9.6 | Client-side routing |

**Installation Command**:
```bash
pnpm add react-router-dom@7.9.6
```

## shadcn/ui Components to Install

```bash
pnpm dlx shadcn@latest add button card dialog input label select switch tabs alert-dialog
```

## Summary

All research questions have been resolved. The implementation will:
1. Add react-router-dom for routing between Dashboard and Manage pages
2. Install required shadcn/ui components for forms and UI
3. Use existing Zod schemas for validation
4. Leverage dexie-react-hooks for reactive data access
5. Create custom InlineEditInput for quick balance updates
6. Follow mobile-first responsive design patterns

