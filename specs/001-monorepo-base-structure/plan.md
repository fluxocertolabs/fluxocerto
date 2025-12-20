# Implementation Plan: Monorepo Base Structure

**Branch**: `001-monorepo-base-structure` | **Date**: 2025-11-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-monorepo-base-structure/spec.md`

## Summary

Create the foundational monorepo structure for the Fluxo Certo application—a local-first SPA for cashflow projection. This feature establishes the development environment with TypeScript 5.9.3, React 19.2.0, Vite 7.2.4, and all tooling configurations without implementing any business features. The goal is a zero-to-running-dev-server experience under 2 minutes.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, Tailwind CSS 4.1.17, shadcn/ui, Dexie.js 4.2.1, Zustand 5.0.8  
**Storage**: IndexedDB via Dexie.js (local-first, no server)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) - SPA only  
**Project Type**: Single frontend SPA (no backend for MVP)  
**Performance Goals**: Initial load < 1s, cashflow recalculation < 100ms  
**Constraints**: Offline-capable, browser-only storage, no authentication for MVP  
**Scale/Scope**: Single user, local device storage, ~5-10 pages/views

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Requirement | Constitution Reference | Status |
|-------------|----------------------|--------|
| Use pnpm 10+ as package manager | Tech Stack section | ✅ Pass |
| Pin exact dependency versions (no ^, ~, *) | Pinned Dependencies section | ✅ Pass |
| TypeScript strict mode enabled | Coding Standards section | ✅ Pass |
| Follow kebab-case file naming | Naming Conventions | ✅ Pass |
| Use shadcn/ui for UI components | Tech Stack section | ✅ Pass |
| Project structure matches constitution | Project Structure section | ✅ Pass |
| Vite 7.2.4 with React plugin | Tech Stack section | ✅ Pass |
| Tailwind CSS v4 configuration | Tech Stack section | ✅ Pass |

**Gate Result**: ✅ All checks pass. No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-monorepo-base-structure/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions & rationale
├── data-model.md        # Phase 1: Configuration file schemas
├── quickstart.md        # Phase 1: Developer setup guide
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
fluxo-certo/
├── src/
│   ├── components/           # Reusable UI components
│   │   └── ui/               # shadcn/ui primitives (initialized)
│   ├── pages/                # Page-level components (placeholder)
│   ├── stores/               # Zustand state stores (placeholder)
│   ├── db/                   # Dexie.js database layer (placeholder)
│   ├── lib/                  # Business logic & utilities (placeholder)
│   │   └── utils.ts          # shadcn/ui cn() utility
│   ├── types/                # TypeScript type definitions (placeholder)
│   ├── App.tsx               # Root component (minimal)
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles (Tailwind v4)
├── public/                   # Static assets
│   └── vite.svg              # Default Vite favicon
├── docs/                     # Documentation
│   ├── PMF.md                # Product-market fit
│   └── USER_STORIES.md       # User stories
├── package.json              # Dependencies & scripts
├── pnpm-lock.yaml            # Lock file for reproducible builds
├── tsconfig.json             # TypeScript configuration
├── tsconfig.node.json        # TypeScript config for Vite
├── vite.config.ts            # Vite bundler configuration
├── tailwind.config.ts        # Tailwind CSS v4 configuration
├── postcss.config.js         # PostCSS configuration
├── eslint.config.js          # ESLint flat config (v9+)
├── vitest.config.ts          # Vitest test configuration
├── components.json           # shadcn/ui configuration
├── .gitignore                # Git exclusions
└── AGENTS.md                 # AI collaboration protocols
```

**Structure Decision**: Single SPA structure as defined in constitution. No backend separation needed—this is a local-first application with IndexedDB storage. The structure follows the exact layout from the constitution's PROJECT STRUCTURE section.

## Complexity Tracking

> No violations to justify. The design follows constitution guidelines exactly.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | — | — |

## Implementation Phases

### Phase 0: Research (Complete)

See [research.md](./research.md) for technology decisions including:
- Vite 7.2.4 configuration patterns for React 19
- Tailwind CSS v4 setup (new CSS-first configuration)
- shadcn/ui initialization for Vite projects
- ESLint 9+ flat config format
- Path alias configuration (@/ → src/)

### Phase 1: Design (Complete)

See [data-model.md](./data-model.md) for configuration schemas and [quickstart.md](./quickstart.md) for setup instructions.

**Key design decisions:**
1. **Minimal placeholders**: Only create files required for a working dev server
2. **Directory stubs**: Create empty directories with `.gitkeep` only where the constitution mandates structure
3. **No business logic**: This is purely boilerplate—no cashflow, accounts, or domain code

### Phase 2: Tasks

Tasks will be generated by the `/speckit.tasks` command based on this plan.

## Dependencies & Ordering

```
[Package Manager Check] → [Initialize package.json] → [Install Dependencies]
         ↓
[TypeScript Config] → [Vite Config] → [Tailwind Config]
         ↓
[ESLint Config] → [Vitest Config] → [shadcn/ui Init]
         ↓
[Create Directory Structure] → [Create Placeholder Files]
         ↓
[Verify: pnpm dev works] → [Verify: pnpm build works]
         ↓
[Verify: pnpm test works] → [Verify: pnpm lint works]
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vite 7 breaking changes from v6 | Low | Medium | Use Context7 for latest docs |
| Tailwind v4 new config syntax | Medium | Low | Research CSS-first approach |
| React 19 concurrent features | Low | Low | Stick to stable patterns |
| shadcn/ui Vite compatibility | Low | Medium | Follow official CLI init |

## Acceptance Verification

All acceptance criteria from the spec mapped to verification commands:

| Story | Criteria | Verification Command |
|-------|----------|---------------------|
| US1 | Install without errors | `pnpm install` exits 0 |
| US1 | Dev server starts | `pnpm dev` starts on :5173 |
| US1 | Browser renders | Navigate to localhost:5173 |
| US2 | TypeScript strict | `pnpm typecheck` exits 0 |
| US2 | Path alias works | Import `@/lib/utils` resolves |
| US3 | ESLint runs | `pnpm lint` exits 0 |
| US3 | Lint fix works | `pnpm lint:fix` exits 0 |
| US4 | Build succeeds | `pnpm build` creates dist/ |
| US4 | Preview works | `pnpm preview` serves dist/ |
| US5 | Test runs | `pnpm test` executes Vitest |
