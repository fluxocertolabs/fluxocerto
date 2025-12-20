# Implementation Plan: Local Development Auth Bypass

**Branch**: `024-local-dev-auth-bypass` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-local-dev-auth-bypass/spec.md`

## Summary

Implement a local development authentication bypass mechanism that generates valid Supabase session tokens for a dedicated `dev@local` user, allowing the application to render authenticated views immediately without manual login steps. The frontend detects DEV mode and injects tokens via `setSession()` before rendering.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: @supabase/supabase-js 2.86.0, tsx (script runner)  
**Storage**: Supabase PostgreSQL (local instance at <http://127.0.0.1:54321>)  
**Testing**: Vitest 4.0.14 (unit), Playwright 1.57.0 (E2E)  
**Target Platform**: Web (Vite dev server on localhost:5173)  
**Project Type**: Web application (SPA with Supabase backend)  
**Performance Goals**: Token generation < 10s, app load to dashboard < 5s after setup  
**Constraints**: DEV mode only, must preserve RLS functionality, no production impact  
**Scale/Scope**: Single dev user per local instance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript 5.9.3 | ✅ PASS | Script will use TypeScript via tsx runner |
| React 19 + Vite 7 | ✅ PASS | Frontend integration in main.tsx |
| Supabase 2.86.0 | ✅ PASS | Using admin API for user creation |
| pnpm 10+ | ✅ PASS | Script added to package.json |
| Environment variables | ✅ PASS | Using VITE_* prefix for frontend vars |
| Existing patterns | ✅ PASS | Extends existing `initializeAuth()` pattern |
| RLS preservation | ✅ PASS | Session is valid JWT, RLS functions unchanged |
| No production impact | ✅ PASS | `import.meta.env.DEV` guard prevents bypass in prod |

**Gate Result**: ✅ ALL GATES PASS - Proceed with implementation

## Project Structure

### Documentation (this feature)

```text
specs/024-local-dev-auth-bypass/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
scripts/
└── generate-dev-token.ts    # Token generation script

src/
├── lib/
│   └── supabase.ts          # Modified: add dev auth bypass logic
├── main.tsx                 # Modified: inject session before render
└── ...

.env.example                 # Modified: document dev token vars
.env                         # Stores generated dev tokens for local bypass
```

**Structure Decision**: Minimal additions to existing structure. Script in `/scripts` (new directory), frontend changes in existing files.

## Complexity Tracking

> No violations - feature follows existing patterns with minimal additions.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
