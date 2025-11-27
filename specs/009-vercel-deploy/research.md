# Research: Vercel Deployment Infrastructure

**Branch**: `009-vercel-deploy` | **Date**: 2025-11-27

## Executive Summary

This document captures research findings for implementing automated deployment infrastructure using Vercel and GitHub Actions. The architecture separates concerns: GitHub Actions handles quality gates (type checking, linting, tests), while Vercel handles deployment only after checks pass.

---

## Decision 1: Deployment Architecture

### Decision
Use **GitHub Actions for CI (quality gates)** + **Vercel for CD (deployment)** with Vercel's native Git integration.

### Rationale
- **Faster feedback**: GitHub Actions runs quality checks in parallel before deployment starts
- **Clearer separation**: CI concerns (testing, linting) separate from CD concerns (deployment)
- **Vercel native integration**: Vercel's GitHub App handles preview deployments automatically
- **No manual CLI deployment needed**: Vercel watches the repo and deploys on push
- **Spec requirement**: FR-001 through FR-005 require quality gates before deployment

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Vercel-only (build checks in Vercel) | Quality check failures would still trigger deployment attempts; slower feedback loop |
| GitHub Actions for both CI and CD | More complex setup; requires managing VERCEL_TOKEN, ORG_ID, PROJECT_ID secrets; loses Vercel's automatic preview URL comments |
| Manual deployments | Violates FR-001 (automatic deployment on push to main) |

---

## Decision 2: GitHub Actions Workflow Structure

### Decision
Create a single **CI workflow** (`ci.yml`) that runs on all pushes and PRs, blocking merges if checks fail.

### Rationale
- **Required checks as merge gates**: GitHub branch protection rules can require CI to pass before merge
- **Single source of truth**: One workflow file for all quality checks
- **Parallel execution**: TypeScript, ESLint, and tests can run in parallel jobs
- **pnpm caching**: `pnpm/action-setup` + `actions/setup-node` with `cache: 'pnpm'` for fast installs

### Workflow Structure
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup pnpm (version from package.json)
      - setup node (20.x with pnpm cache)
      - pnpm install
      - parallel: typecheck, lint, test
      - build (verify production build works)
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Separate workflows per check | Harder to manage; can't easily require "all checks pass" |
| Matrix strategy for checks | Overkill for 3 checks; adds complexity without benefit |
| Vercel build-time checks | Spec explicitly requires GitHub Actions for checks (clarification 2025-11-27) |

---

## Decision 3: Vercel Configuration

### Decision
Use **Vercel's default Git integration** with minimal `vercel.json` configuration.

### Rationale
- **Zero-config for Vite**: Vercel auto-detects Vite projects and configures build settings
- **Automatic preview deployments**: Vercel creates preview URLs for all PRs automatically
- **Instant rollback**: Vercel's default behavior on deployment failure
- **Concurrent deployment cancellation**: Vercel cancels pending deployments when new commits arrive

### Configuration Required
```json
// vercel.json (optional - only if customization needed)
{
  "framework": "vite",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": "dist"
}
```

### Environment Variables (Vercel Dashboard)
| Variable | Description | Scope |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Production, Preview, Development |

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| GitHub Actions deployment with Vercel CLI | More complex; loses automatic preview comments; requires secret management |
| Terraform/IaC for Vercel | Overkill for single project; adds maintenance burden |
| Custom build scripts | Unnecessary; Vite defaults work correctly |

---

## Decision 4: Branch Protection Rules

### Decision
Configure **branch protection on `main`** requiring CI workflow to pass.

### Rationale
- **Enforces quality gates**: Prevents merging code that fails checks
- **Matches spec requirements**: FR-005 requires blocking deployment on check failure
- **GitHub native**: No additional tooling required

### Configuration
```
Branch: main
- Require status checks to pass before merging: ✓
  - Required checks: "quality" (from CI workflow)
- Require branches to be up to date before merging: ✓
- Include administrators: ✓
```

---

## Decision 5: pnpm Version Management

### Decision
Read pnpm version from `packageManager` field in `package.json` using `pnpm/action-setup`.

### Rationale
- **Single source of truth**: Version defined in `package.json` (`pnpm@10.12.1`)
- **Automatic detection**: `pnpm/action-setup` reads `packageManager` field automatically
- **Consistency**: Same version in CI as local development

### Implementation
```yaml
- uses: pnpm/action-setup@v4
  # No version specified - reads from package.json packageManager field
```

---

## Decision 6: Node.js Version

### Decision
Use **Node.js 20.x** (LTS) in CI workflows.

### Rationale
- **Spec requirement**: FR-011 requires Node.js 20 or higher
- **Constitution alignment**: `engines.node: ">=20"` in package.json
- **LTS stability**: Node 20 is current LTS, well-supported

---

## Decision 7: Environment Variable Handling

### Decision
Use **Vercel's environment variable management** for production secrets.

### Rationale
- **Security**: Secrets never committed to repository (FR-008)
- **Scope control**: Can set different values for Production/Preview/Development
- **Vercel integration**: Automatically injected during build

### Local Development
- `.env` file for local development (gitignored)
- `.env.example` template with placeholder values (committed)
- Documentation in quickstart.md for setup

---

## Technical Dependencies

### GitHub Actions
| Action | Version | Purpose |
|--------|---------|---------|
| `actions/checkout` | v4 | Clone repository |
| `pnpm/action-setup` | v4 | Install pnpm (reads version from package.json) |
| `actions/setup-node` | v4 | Setup Node.js 20.x with pnpm cache |

### Vercel
| Feature | Configuration |
|---------|---------------|
| Framework | Vite (auto-detected) |
| Build Command | `pnpm build` |
| Output Directory | `dist` |
| Node Version | 20.x |

---

## Resolved Clarifications

| Original Unknown | Resolution |
|-----------------|------------|
| CI/CD separation | GitHub Actions for CI, Vercel for CD (spec clarification) |
| Preview database | Same Supabase project as production (spec clarification) |
| Notification method | GitHub commit status checks only (spec clarification) |
| Concurrent deployments | Cancel previous pending (Vercel default) |
| Rollback strategy | Automatic rollback (Vercel default) |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Vercel free tier limits | Monitor usage; upgrade if needed |
| Preview deployments accessing production data | Acceptable per spec; consider staging DB for sensitive data |
| CI workflow costs | GitHub free tier includes 2000 minutes/month; sufficient for small team |
| Secret exposure | All secrets in Vercel dashboard, never in code |

