# Implementation Plan: Core Data Management Layer

**Branch**: `001-data-management` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-data-management/spec.md`

## Summary

Implement the foundational data management layer for Family Finance, enabling CRUD operations for bank accounts, projects (income sources), fixed expenses, and credit cards. The solution uses Dexie.js for IndexedDB persistence, Zustand for reactive state management, and Zod for runtime validation - all following a local-first architecture with no backend dependencies.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode)  
**Primary Dependencies**: React 19.2.0, Dexie.js 4.2.1, Zustand 5.0.8, Zod 4.1.13  
**Storage**: IndexedDB (via Dexie.js) - local-first, client-only  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Modern browsers with IndexedDB support (Chrome, Firefox, Safari, Edge)  
**Project Type**: Single-page application (SPA)  
**Performance Goals**: Initial load < 1s, UI updates < 100ms (perceived instant)  
**Constraints**: Offline-capable after initial load, no server/backend, single-device usage  
**Scale/Scope**: Single user, ~100s of entities max, 30-day forward projections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependencies from CONSTITUTION.md | ✅ PASS | All deps pinned: React 19.2.0, Dexie 4.2.1, Zustand 5.0.8, Zod 4.1.13 |
| Follows project structure from CONSTITUTION.md | ✅ PASS | Using `src/db/`, `src/stores/`, `src/types/` as specified |
| Follows data flow pattern | ✅ PASS | Components → Zustand → Dexie → IndexedDB |
| Uses TypeScript strict mode | ✅ PASS | Already configured in tsconfig.json |
| Follows naming conventions | ✅ PASS | kebab-case files, PascalCase components/types, camelCase functions |
| No external API dependencies | ✅ PASS | Local-first, no network calls |
| Data models match CONSTITUTION.md | ✅ PASS | BankAccount, Project, FixedExpense, CreditCard as defined |

## Project Structure

### Documentation (this feature)

```text
specs/001-data-management/
├── plan.md              # This file
├── research.md          # Phase 0 output - integration patterns research
├── data-model.md        # Phase 1 output - entity definitions with Zod
├── quickstart.md        # Phase 1 output - development guide
├── contracts/           # Phase 1 output - internal API contracts
│   └── store-api.md     # Zustand store action signatures
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── index.ts         # Dexie database instance and schema
│   └── migrations.ts    # Schema versioning helpers (if needed)
├── types/
│   └── index.ts         # Zod schemas + inferred TypeScript types
├── stores/
│   ├── finance-store.ts # Unified Zustand store for all entities
│   └── index.ts         # Store exports
├── components/          # (existing structure)
├── pages/               # (existing structure)
├── lib/
│   └── utils.ts         # (existing)
└── test/
    ├── setup.ts         # (existing)
    └── fixtures/        # Test data factories
```

**Structure Decision**: Single unified finance store (not per-entity stores) to simplify cross-entity operations and maintain consistency. Dexie database in `src/db/index.ts` with all four tables. Zod schemas as single source of truth in `src/types/index.ts`.

## Architecture Decisions

### 1. Database Layer Pattern

**Decision**: Dexie.js with TypeScript class extending Dexie

**Rationale**:
- Type-safe table definitions with explicit interfaces
- Schema versioning built-in with upgrade functions
- `useLiveQuery` hook for reactive UI updates directly from IndexedDB
- Future migration path to Dexie Cloud if sync needed

### 2. State Management Pattern

**Decision**: Unified Zustand store + Dexie `useLiveQuery` for reads

**Rationale**:
- Zustand handles write operations (add, update, delete)
- Dexie's `useLiveQuery` handles reactive reads directly
- No need to duplicate state - Dexie IS the source of truth
- Zustand actions persist to Dexie, `useLiveQuery` auto-updates UI

**Data Flow**:
```
Write: Component → Zustand action → Dexie.table.add/put/delete → IndexedDB
Read:  Component → useLiveQuery(db.table.query) → Auto-updates on change
```

### 3. Type System Pattern

**Decision**: Zod schemas → TypeScript types via `z.infer`

**Rationale**:
- Single source of truth for validation AND types
- Runtime validation before Dexie writes
- Compile-time type safety throughout app
- Easy to add new validation rules

### 4. Store Organization

**Decision**: Single unified `finance-store.ts` (not per-entity stores)

**Rationale**:
- Simpler mental model for small app
- Cross-entity operations possible if needed
- Fewer files to maintain
- Can split later if complexity grows

## Complexity Tracking

> No Constitution violations requiring justification. Design follows all established patterns.

| Aspect | Complexity Level | Justification |
|--------|-----------------|---------------|
| Store count | 1 (unified) | Sufficient for 4 entity types |
| Database tables | 4 | One per entity as specified |
| Schema version | 1 | Initial implementation |
| Abstraction layers | 2 (Zod → Dexie) | Minimal viable layers |
