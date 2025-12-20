# Data Model: Vercel Deployment Infrastructure

**Branch**: `009-vercel-deploy` | **Date**: 2025-11-27

## Overview

This feature introduces deployment infrastructure through configuration files rather than database entities. The "data model" consists of:

1. **GitHub Actions Workflow** - CI configuration defining quality gates
2. **Vercel Configuration** - Deployment settings and environment variables
3. **Branch Protection Rules** - GitHub repository settings

---

## Entity 1: CI Workflow Configuration

**File**: `.github/workflows/ci.yml`

### Schema

```yaml
name: string                    # Workflow name displayed in GitHub UI
on:                            # Trigger events
  push:
    branches: string[]         # Branches that trigger on push
  pull_request:
    branches: string[]         # Branches that trigger on PR

jobs:
  quality:                     # Job identifier
    runs-on: string           # Runner environment (ubuntu-latest)
    steps:                    # Ordered list of steps
      - uses: string          # Action reference (org/repo@version)
        with: object          # Action inputs
      - name: string          # Step display name
        run: string           # Shell command to execute
```

### Validation Rules

| Field | Rule | Rationale |
|-------|------|-----------|
| `on.push.branches` | Must include `main` | FR-001: Auto-deploy on main push |
| `on.pull_request.branches` | Must include `main` | FR-006: Preview deployments for PRs |
| `jobs.quality.steps` | Must include typecheck, lint, test, build | FR-002, FR-003, FR-004, FR-010 |
| `runs-on` | Must use `ubuntu-latest` | Consistency and cost efficiency |

### State Transitions

```
Workflow States:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Queued    │────▶│   Running   │────▶│  Completed  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           │              ┌─────┴─────┐
                           │              ▼           ▼
                           │        ┌─────────┐ ┌─────────┐
                           └───────▶│ Success │ │ Failure │
                                    └─────────┘ └─────────┘
```

---

## Entity 2: Vercel Project Configuration

**File**: `vercel.json` (optional - Vercel auto-detects Vite)

### Schema

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": "dist"
}
```

### Validation Rules

| Field | Rule | Rationale |
|-------|------|-----------|
| `framework` | Must be `vite` | Constitution: Vite 7.2.4 |
| `buildCommand` | Must be `pnpm build` | Constitution: pnpm package manager |
| `outputDirectory` | Must be `dist` | Vite default output directory |

### Environment Variables (Vercel Dashboard)

| Variable | Type | Required | Scope |
|----------|------|----------|-------|
| `VITE_SUPABASE_URL` | string (URL) | Yes | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | string | Yes | Production, Preview |

**Validation**:
- `VITE_SUPABASE_URL` must be valid HTTPS URL matching `https://*.supabase.co`
- `VITE_SUPABASE_ANON_KEY` must be non-empty string (JWT format)

---

## Entity 3: Deployment Instance

**Managed by**: Vercel (not stored in repository)

### Conceptual Schema

```typescript
interface Deployment {
  id: string                           // Unique deployment ID
  url: string                          // Deployment URL
  state: DeploymentState               // Current state
  target: 'production' | 'preview'     // Deployment target
  branch: string                        // Source branch
  commit: string                        // Git commit SHA
  createdAt: Date                       // Creation timestamp
  readyAt?: Date                        // Ready timestamp (if successful)
  errorMessage?: string                 // Error message (if failed)
}

type DeploymentState = 
  | 'QUEUED'
  | 'BUILDING'
  | 'READY'
  | 'ERROR'
  | 'CANCELED'
```

### State Transitions

```
Deployment States:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   QUEUED    │────▶│  BUILDING   │────▶│    READY    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       └───────────▶│   ERROR     │
                    └─────────────┘
       │
       ▼
┌─────────────┐
│  CANCELED   │  (when newer commit pushed)
└─────────────┘
```

### Relationships

```
┌─────────────────┐         ┌─────────────────┐
│   Git Commit    │────────▶│   Deployment    │
└─────────────────┘   1:1   └─────────────────┘
        │                           │
        │                           │
        ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  CI Workflow    │         │  Vercel Project │
│    Run          │         │                 │
└─────────────────┘         └─────────────────┘
```

---

## Entity 4: Branch Protection Configuration

**Managed by**: GitHub Repository Settings (not stored in repository)

### Conceptual Schema

```typescript
interface BranchProtection {
  branch: string                       // Protected branch name
  requiredStatusChecks: {
    strict: boolean                    // Require branch up-to-date
    contexts: string[]                 // Required check names
  }
  enforceAdmins: boolean               // Apply to admins too
  requiredPullRequestReviews?: {
    requiredApprovingReviewCount: number
  }
}
```

### Configuration for `main` Branch

```json
{
  "branch": "main",
  "requiredStatusChecks": {
    "strict": true,
    "contexts": ["quality"]
  },
  "enforceAdmins": true
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Git Push / Pull Request                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│     GitHub Actions        │   │          Vercel               │
│     (CI Workflow)         │   │    (Deployment Trigger)       │
├───────────────────────────┤   ├───────────────────────────────┤
│ 1. Checkout code          │   │ 1. Detect push event          │
│ 2. Setup pnpm + Node.js   │   │ 2. Queue deployment           │
│ 3. Install dependencies   │   │ 3. Install dependencies       │
│ 4. Run typecheck          │   │ 4. Build project              │
│ 5. Run lint               │   │ 5. Deploy to CDN              │
│ 6. Run tests              │   │ 6. Update DNS                 │
│ 7. Build project          │   │ 7. Report status              │
│ 8. Report status          │   └───────────────────────────────┘
└───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│                  GitHub Commit Status                          │
│                  (success / failure)                           │
└───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│              Branch Protection Enforcement                     │
│         (blocks merge if CI fails for PRs to main)            │
└───────────────────────────────────────────────────────────────┘
```

---

## File Structure Impact

```
fluxo-certo/
├── .github/
│   └── workflows/
│       └── ci.yml              # NEW: CI workflow definition
├── vercel.json                 # NEW: Vercel configuration (optional)
├── .env.example                # EXISTING: Environment template
└── ... (existing files)
```

---

## Validation Summary

### Pre-Deployment Checks (CI)

| Check | Command | Exit Code on Failure |
|-------|---------|---------------------|
| TypeScript | `pnpm typecheck` | 1 |
| ESLint | `pnpm lint` | 1 |
| Tests | `pnpm test` | 1 |
| Build | `pnpm build` | 1 |

### Environment Validation (Build Time)

| Variable | Validation | Error Behavior |
|----------|------------|----------------|
| `VITE_SUPABASE_URL` | Non-empty, valid URL | Build succeeds; app shows setup screen |
| `VITE_SUPABASE_ANON_KEY` | Non-empty | Build succeeds; app shows setup screen |

*Note: The application already handles missing environment variables gracefully by showing a setup screen (see `src/components/setup-required.tsx`).*

