# Implementation Plan: Dark Mode

**Branch**: `015-dark-mode` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-dark-mode/spec.md`

## Summary

Implement a dark mode feature for Family Finance that provides a theme toggle in the header, persists user preferences in Supabase, detects system theme for new users, and animates theme transitions smoothly. The implementation uses Tailwind CSS v4's native dark mode support with CSS custom properties and a React context-based ThemeProvider.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Tailwind CSS 4.1.17, @supabase/supabase-js 2.86.0, Zustand 5.0.8, lucide-react (for icons)  
**Storage**: Supabase PostgreSQL (new `user_preferences` table), localStorage (fallback/cache)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web (SPA via Vite 7.2.4)  
**Project Type**: Single SPA with cloud backend  
**Performance Goals**: Theme toggle < 1 second, preference applied within 500ms of auth  
**Constraints**: WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text), smooth 200-300ms transitions  
**Scale/Scope**: ~15 UI components to support dark mode, 1 new database table

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependencies | ✅ PASS | All deps from constitution, lucide-react to be pinned |
| Follows existing patterns | ✅ PASS | Uses Zustand for state, Supabase for persistence |
| Matches tech stack | ✅ PASS | React 19 + Tailwind CSS 4 + Supabase |
| File structure alignment | ✅ PASS | New files follow existing conventions |
| TypeScript strict mode | ✅ PASS | Will use strict types |
| Component structure | ✅ PASS | Follows hooks → derived state → handlers → render |
| Naming conventions | ✅ PASS | kebab-case files, PascalCase components |

## Project Structure

### Documentation (this feature)

```text
specs/015-dark-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (API contracts)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── layout/
│   │   └── header.tsx          # Modified: add theme toggle
│   ├── theme/
│   │   ├── theme-provider.tsx  # New: React context provider
│   │   ├── theme-toggle.tsx    # New: Toggle button component
│   │   └── index.ts            # New: Barrel export
│   └── ui/                     # Existing: all use CSS variables (no changes needed)
├── hooks/
│   └── use-theme.ts            # New: Theme hook with Supabase sync
├── lib/
│   └── theme.ts                # New: Theme utilities
├── stores/
│   └── theme-store.ts          # New: Zustand store for theme state
├── types/
│   └── theme.ts                # New: Theme type definitions
├── index.css                   # Modified: Add dark mode CSS variables
└── main.tsx                    # Modified: Wrap with ThemeProvider

supabase/
└── migrations/
    └── 004_user_preferences.sql  # New: user_preferences table
```

**Structure Decision**: Single SPA structure maintained. New theme components follow existing patterns with dedicated `/components/theme/` directory for theme-specific components.

## Complexity Tracking

> No constitution violations requiring justification.

---

## Post-Design Constitution Check

*Re-evaluated after Phase 1 design completion.*

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependencies | ✅ PASS | lucide-react@0.468.0 pinned exactly |
| Follows existing patterns | ✅ PASS | Zustand persist pattern matches preferences-store.ts |
| Matches tech stack | ✅ PASS | All technologies from constitution |
| File structure alignment | ✅ PASS | New files in appropriate directories |
| TypeScript strict mode | ✅ PASS | Zod schemas for runtime validation |
| Component structure | ✅ PASS | ThemeToggle follows component pattern |
| Naming conventions | ✅ PASS | theme-store.ts, ThemeToggle, etc. |
| Database patterns | ✅ PASS | RLS policies match existing tables |
| Error handling | ✅ PASS | Graceful degradation with localStorage fallback |

---

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | `specs/015-dark-mode/research.md` | All technical decisions documented |
| Data Model | `specs/015-dark-mode/data-model.md` | Entity definitions, types, state transitions |
| Migration | `specs/015-dark-mode/contracts/004_user_preferences.sql` | Database migration for user_preferences |
| API Contracts | `specs/015-dark-mode/contracts/theme-api.md` | Supabase operations documentation |
| Quickstart | `specs/015-dark-mode/quickstart.md` | Step-by-step implementation guide |

---

## Next Steps

This plan is complete through Phase 1. To continue:

1. **Create Tasks**: Run `/speckit.tasks` to break this plan into implementable tasks
2. **Create Checklist**: Run `/speckit.checklist` to create a testing checklist

The implementation should follow the order in `quickstart.md`:
1. Database migration
2. Install dependencies  
3. CSS variables
4. FOUC prevention
5. Types
6. Theme store
7. Theme toggle component
8. Header integration
9. Supabase sync
10. Testing
