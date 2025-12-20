# Quickstart: Historical Projection Snapshots

**Feature Branch**: `025-projection-snapshots`  
**Estimated Time**: 2-3 days

## Prerequisites

- [ ] Local Supabase running (`pnpm db:start`)
- [ ] Dev auth tokens configured (`pnpm run gen:token`)
- [ ] Branch created: `git checkout -b 025-projection-snapshots`

## Implementation Order

### Day 1: Database + Store (Backend Foundation)

#### 1.1 Create Migration File
```bash
# Create new migration
touch supabase/migrations/20251203XXXXXX_projection_snapshots.sql
```

Copy SQL from `data-model.md` migration section.

#### 1.2 Apply Migration
```bash
pnpm db:reset  # or pnpm db:push if preserving data
```

#### 1.3 Create TypeScript Types
```bash
# Create types file
touch src/types/snapshot.ts
```

Define types as specified in `data-model.md`.

#### 1.4 Create Snapshots Store
```bash
touch src/stores/snapshots-store.ts
```

Implement store following `contracts/snapshots-store.md`.

#### 1.5 Write Unit Tests
```bash
mkdir -p tests/unit/stores
touch tests/unit/stores/snapshots-store.test.ts
```

```bash
pnpm test tests/unit/stores/snapshots-store.test.ts
```

---

### Day 2: UI Components + Pages

#### 2.1 Create Snapshot Components
```bash
mkdir -p src/components/snapshots
touch src/components/snapshots/index.ts
touch src/components/snapshots/save-snapshot-dialog.tsx
touch src/components/snapshots/snapshot-list.tsx
touch src/components/snapshots/snapshot-card.tsx
touch src/components/snapshots/snapshot-empty-state.tsx
```

#### 2.2 Create Pages
```bash
touch src/pages/history.tsx
touch src/pages/snapshot-detail.tsx
```

#### 2.3 Add Routes to App.tsx

Add routes for `/history` and `/history/:snapshotId`.

#### 2.4 Update Header Navigation

Add "Histórico" link to `src/components/layout/header.tsx`.

#### 2.5 Add Save Button to Dashboard

Modify `src/pages/dashboard.tsx` to include "Salvar Snapshot" button.

---

### Day 3: Integration + Polish

#### 3.1 Create Snapshot Projection Hook
```bash
touch src/hooks/use-snapshot-projection.ts
```

Export helper functions from `use-cashflow-projection.ts`:
- `transformToChartData`
- `getDangerRanges`  
- `transformToSummaryStats`

#### 3.2 Write E2E Tests
```bash
touch tests/e2e/snapshots.spec.ts
```

Test critical flows:
- Save snapshot from dashboard
- View history list
- Open snapshot detail
- Delete snapshot

#### 3.3 Manual Testing
```bash
pnpm dev:app
```

1. Navigate to dashboard
2. Click "Salvar Snapshot"
3. Enter name, confirm
4. Navigate to History
5. Click snapshot to view detail
6. Delete snapshot

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20251203*_projection_snapshots.sql` | Database schema |
| `src/types/snapshot.ts` | TypeScript types |
| `src/stores/snapshots-store.ts` | Zustand store with Supabase ops |
| `src/hooks/use-snapshot-projection.ts` | Transform frozen data for charts |
| `src/components/snapshots/save-snapshot-dialog.tsx` | Save dialog modal |
| `src/components/snapshots/snapshot-list.tsx` | History list component |
| `src/components/snapshots/snapshot-card.tsx` | List item card |
| `src/pages/history.tsx` | History page |
| `src/pages/snapshot-detail.tsx` | Detail page |

---

## Verification Checklist

- [ ] Migration applies without errors
- [ ] RLS policies work (can only see own household's snapshots)
- [ ] Save snapshot completes in <3s
- [ ] History page loads 50 snapshots in <2s
- [ ] Detail view renders chart correctly
- [ ] Delete confirmation works
- [ ] Empty state shows when no snapshots
- [ ] Navigation (Dashboard ↔ History ↔ Detail) works
- [ ] All tests pass: `pnpm test && pnpm test:e2e`

---

## Common Issues

### "Permission denied" on save
- Check RLS policies are created
- Verify `get_user_household_id()` function exists (from households migration)

### Chart not rendering in detail view
- Ensure `transformToChartData` handles Date serialization (JSON stores as strings)
- Parse dates when loading snapshot: `new Date(snapshot.data.projection.days[i].date)`

### Snapshot data too large
- Check projection days - 365 days creates large JSONB
- Consider compressing daily snapshots if needed (future optimization)

