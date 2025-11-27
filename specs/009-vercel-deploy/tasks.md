# Tasks: Vercel Deployment Infrastructure

**Input**: Design documents from `/specs/009-vercel-deploy/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Verification tasks are included inline (T006, T012, T015, T019, T020, T023, T025, T026) to validate success criteria SC-001 through SC-007.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **CI Workflow**: `.github/workflows/ci.yml`
- **Vercel Config**: `vercel.json` (optional)
- **Spec Contracts**: `specs/009-vercel-deploy/contracts/`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create necessary directory structure and configuration files

- [x] T001 Create `.github/workflows/` directory structure
- [x] T002 [P] Verify existing `.env.example` includes required Supabase variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational tasks required - this feature adds CI/CD infrastructure to an existing project with no code dependencies

**⚠️ NOTE**: This feature is configuration-only. No source code changes required. Existing build scripts (`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`) are already compatible.

**Checkpoint**: Ready for user story implementation

---

## Phase 3: User Story 1 - Automatic Production Deployment (Priority: P1) 🎯 MVP

**Goal**: Enable code merged to main branch to be automatically deployed to production

**Independent Test**: Push a commit to main branch and verify the application is accessible at the production URL with the new changes within 10 minutes (SC-001)

### Implementation for User Story 1

- [x] T003 [US1] Create CI workflow file at `.github/workflows/ci.yml` from `specs/009-vercel-deploy/contracts/ci-workflow.yml`. Note: CI workflow uses Node.js 20 (FR-011) and includes `cancel-in-progress: true` for handling simultaneous deployments.
- [ ] T004 [US1] Connect Vercel to GitHub repository via Vercel Dashboard (manual step - see quickstart.md Step 1). Verify Vercel's default behavior cancels pending deployments when new commits arrive.
- [ ] T005 [US1] Configure Vercel project settings: Framework=Vite, Build Command=`pnpm build`, Output Directory=`dist`
- [ ] T006 [US1] Verify automatic deployment triggers on push to main branch. Confirm GitHub commit status checks are reported by Vercel (FR-012).

**Checkpoint**: At this point, pushing to main should trigger both CI workflow and Vercel deployment

---

## Phase 4: User Story 2 - Quality Gate Enforcement (Priority: P1)

**Goal**: Enforce quality checks (TypeScript, ESLint, tests) before any code reaches production

**Independent Test**: Push code with intentional type errors, lint violations, or failing tests and verify the deployment is blocked

### Implementation for User Story 2

- [x] T007 [US2] Verify CI workflow includes TypeScript type checking step (`pnpm typecheck`)
- [x] T008 [US2] Verify CI workflow includes ESLint checking step (`pnpm lint`)
- [x] T009 [US2] Verify CI workflow includes test execution step (`pnpm test run`)
- [x] T010 [US2] Verify CI workflow includes build verification step (`pnpm build`)
- [ ] T011 [US2] Configure GitHub branch protection on `main` branch requiring `quality` check to pass (manual step - see quickstart.md Step 4)
- [ ] T012 [US2] Test quality gate by creating PR with intentional lint error and verifying merge is blocked

**Checkpoint**: Quality checks now block merges when failing (FR-005, SC-002, SC-006)

---

## Phase 5: User Story 3 - Pull Request Preview Deployments (Priority: P2)

**Goal**: Create preview deployments for pull requests so developers can test and share changes before merging

**Independent Test**: Open a pull request and verify a unique preview URL is generated and accessible within 5 minutes (SC-003)

### Implementation for User Story 3

- [ ] T013 [US3] Verify Vercel GitHub App has correct permissions for PR comments
- [ ] T014 [US3] Enable "Comment on Pull Requests" in Vercel project settings → Git
- [ ] T015 [US3] Test preview deployment by creating a PR and verifying unique preview URL appears in PR comments

**Checkpoint**: Preview deployments now created automatically for all PRs (FR-006, FR-007)

---

## Phase 6: User Story 4 - Secure Environment Configuration (Priority: P2)

**Goal**: Securely manage environment variables so sensitive credentials are never exposed in the codebase

**Independent Test**: Verify the deployed application connects to Supabase successfully while no credentials appear in the repository (SC-004)

### Implementation for User Story 4

- [ ] T016 [US4] Add `VITE_SUPABASE_URL` environment variable in Vercel Dashboard for Production, Preview, Development scopes. Verify build fails with clear error if variable is missing.
- [ ] T017 [US4] Add `VITE_SUPABASE_ANON_KEY` environment variable in Vercel Dashboard for Production, Preview, Development scopes. Verify build fails with clear error if variable is missing.
- [ ] T018 [US4] Trigger redeployment after adding environment variables
- [ ] T019 [US4] Verify deployed application successfully connects to Supabase backend (SC-007)
- [x] T020 [US4] Verify no credentials are committed to repository (grep for Supabase URL patterns)

**Checkpoint**: Environment variables securely managed, application connects to Supabase (FR-008)

---

## Phase 7: User Story 5 - Local Development Parity (Priority: P3)

**Goal**: Ensure local development mirrors the production environment configuration

**Independent Test**: Run the application locally with a `.env` file and verify it behaves consistently with the deployed version

### Implementation for User Story 5

- [x] T021 [US5] Verify `.env.example` exists with placeholder values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] T022 [US5] Verify `.env` is listed in `.gitignore`
- [ ] T023 [US5] Test local development setup: copy `.env.example` to `.env`, add real values, run `pnpm dev`

**Checkpoint**: Local development environment matches production configuration pattern (FR-009, SC-005)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Optional enhancements and final verification

- [x] T024 [P] Optionally create `vercel.json` at repository root from `specs/009-vercel-deploy/contracts/vercel-config.json` (only if Vercel doesn't auto-detect settings)
- [ ] T025 Run full quickstart.md verification checklist
- [ ] T026 Verify all success criteria are met (SC-001 through SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - no blocking prerequisites for this feature
- **User Stories (Phase 3-7)**: Can proceed after Setup
  - US1 and US2 are both P1 priority but US2 depends on CI workflow from US1
  - US3 and US4 are both P2 priority and can run in parallel after US1
  - US5 is P3 and can run independently after Setup
- **Polish (Phase 8)**: After all user stories complete

### User Story Dependencies

```
Setup (Phase 1)
    │
    ├──► US1: Automatic Production Deployment (Phase 3)
    │        │
    │        └──► US2: Quality Gate Enforcement (Phase 4)
    │                  │
    │                  ├──► US3: Preview Deployments (Phase 5) [parallel]
    │                  │
    │                  └──► US4: Environment Configuration (Phase 6) [parallel]
    │
    └──► US5: Local Development Parity (Phase 7) [independent]
                │
                └──► Polish (Phase 8)
```

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel
- **Phase 5 & 6**: US3 and US4 can run in parallel after US2 completes
- **Phase 7**: US5 can run independently from other user stories
- **Phase 8**: T024, T025, T026 can run in parallel

---

## Parallel Example: After Phase 4 Completion

```bash
# These can run simultaneously after US2 (Quality Gates) is complete:

# Team Member A - User Story 3 (Preview Deployments):
Task T013: "Verify Vercel GitHub App permissions"
Task T014: "Enable Comment on Pull Requests in Vercel settings"
Task T015: "Test preview deployment"

# Team Member B - User Story 4 (Environment Configuration):
Task T016: "Add VITE_SUPABASE_URL to Vercel"
Task T017: "Add VITE_SUPABASE_ANON_KEY to Vercel"
Task T018: "Trigger redeployment"
Task T019: "Verify Supabase connection"
Task T020: "Verify no credentials in repo"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (Automatic Deployment)
3. Complete Phase 4: User Story 2 (Quality Gates)
4. **STOP and VALIDATE**: Test that:
   - Pushing to main triggers deployment
   - CI workflow runs typecheck, lint, test, build
   - Failed checks block merge
5. Deploy/demo if ready - **this is a functional MVP!**

### Incremental Delivery

1. Complete Setup → Ready for configuration
2. Add US1 + US2 → Test independently → **MVP: Auto-deploy with quality gates**
3. Add US3 → Test independently → **Enhancement: Preview deployments**
4. Add US4 → Test independently → **Enhancement: Secure env vars**
5. Add US5 → Test independently → **Enhancement: Local dev parity**
6. Each story adds value without breaking previous stories

### Manual vs Automated Tasks

This feature is primarily **configuration-based** with manual steps:

| Task Type | Count | Examples |
|-----------|-------|----------|
| File Creation | 2 | CI workflow, optional vercel.json |
| Vercel Dashboard | 6 | Project setup, env vars, settings |
| GitHub Settings | 1 | Branch protection rules |
| Verification | 8 | Testing deployments, quality gates |

---

## Notes

- [P] tasks = different files/systems, no dependencies
- [Story] label maps task to specific user story for traceability
- Most tasks are configuration/verification rather than code changes
- Vercel Dashboard and GitHub Settings tasks are manual (documented in quickstart.md)
- Commit CI workflow file after T003 to enable GitHub Actions
- Branch protection (T011) requires at least one CI run to complete first (check name must exist)
- Environment variables (T016-T017) must be set before application can connect to Supabase

---

## Success Criteria Mapping

| Criterion | Tasks | Verification |
|-----------|-------|--------------|
| SC-001: Deploy within 10 min | T003-T006 | Time deployment after merge |
| SC-002: 100% checks before deploy | T007-T012 | Verify CI runs on all pushes |
| SC-003: Preview URL within 5 min | T013-T015 | Create PR, measure time to URL |
| SC-004: Zero credentials in repo | T020 | Grep for Supabase patterns |
| SC-005: Local setup < 15 min | T021-T023 | Time new developer setup |
| SC-006: Failed checks block 100% | T011-T012 | Test with intentional failures |
| SC-007: Supabase connection works | T019 | Verify app functionality |

