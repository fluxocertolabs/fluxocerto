# Implementation Plan: Vercel Deployment Infrastructure

**Branch**: `009-vercel-deploy` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-vercel-deploy/spec.md`

## Summary

Implement automated deployment infrastructure for the Family Finance application using Vercel as the hosting platform and GitHub Actions for CI quality gates. The architecture separates concerns: GitHub Actions enforces quality checks (TypeScript, ESLint, tests) as merge gates, while Vercel's native Git integration handles deployment. Preview deployments are created automatically for PRs, and production deploys trigger on pushes to main after CI passes.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, GitHub Actions, Vercel  
**Storage**: Supabase PostgreSQL (existing - no changes)  
**Testing**: Vitest 4.0.14  
**Target Platform**: Web (Vercel Edge Network)  
**Project Type**: Web (SPA with cloud deployment)  
**Performance Goals**: Production deployment within 10 minutes of merge (SC-001)  
**Constraints**: Node.js 20+ (FR-011), pnpm 10+ (existing)  
**Scale/Scope**: Single Vercel project, single GitHub Actions workflow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Uses existing TypeScript, Vite, pnpm stack |
| Testing requirements | ✅ PASS | Vitest integration in CI pipeline |
| Package manager | ✅ PASS | pnpm with exact version from package.json |
| Node version | ✅ PASS | Node.js 20.x (matches engines.node: ">=20") |
| Security | ✅ PASS | Secrets in Vercel dashboard, never in code |
| Deployment target | ✅ PASS | Vercel aligns with constitution (future → now) |

**Post-Phase 1 Re-check**: All gates still pass. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/009-vercel-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 output - decisions and rationale
├── data-model.md        # Phase 1 output - deployment entities
├── quickstart.md        # Phase 1 output - setup guide
├── contracts/           # Phase 1 output - configuration contracts
│   ├── ci-workflow.yml         # GitHub Actions workflow definition
│   ├── vercel-config.json      # Vercel project configuration
│   ├── branch-protection.md    # GitHub branch protection rules
│   └── environment-variables.md # Environment variable specification
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
family-finance/
├── .github/
│   └── workflows/
│       └── ci.yml              # NEW: CI workflow (from contracts/)
├── vercel.json                 # NEW: Vercel config (optional)
├── src/                        # EXISTING: No changes
├── package.json                # EXISTING: No changes (scripts already correct)
└── ... (existing files)
```

**Structure Decision**: Minimal additions to existing SPA structure. Only new files are CI workflow and optional Vercel config. No source code changes required - existing build scripts (`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`) are already compatible.

## Complexity Tracking

No constitution violations requiring justification. Implementation uses:
- Standard GitHub Actions patterns
- Vercel's default Git integration (zero-config for Vite)
- Existing project scripts without modification
