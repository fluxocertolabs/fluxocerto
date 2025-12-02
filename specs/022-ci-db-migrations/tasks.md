# Tasks: CI Database Migrations

**Input**: Design documents from `/specs/022-ci-db-migrations/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are NOT explicitly requested - this is a CI/CD infrastructure change with manual verification via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/sections, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: CI/CD workflow modification only
- **File modified**: `.github/workflows/ci.yml`

---

## Phase 1: Setup (Prerequisites & Configuration)

**Purpose**: Configure GitHub repository secrets and document requirements

- [ ] T001 Document GitHub Secrets configuration per quickstart.md (MANUAL: add SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD to repository secrets)
- [ ] T002 Update workflow header comment to document new required secrets in .github/workflows/ci.yml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pin Supabase CLI version across all jobs to satisfy FR-013

**⚠️ CRITICAL**: Version pinning must be complete before migrate job implementation

- [ ] T003 [P] Pin Supabase CLI to v2.62.10 in visual job (search: "supabase/setup-cli" in visual job section) in .github/workflows/ci.yml
- [ ] T004 [P] Pin Supabase CLI to v2.62.10 in e2e job (search: "supabase/setup-cli" in e2e job section) in .github/workflows/ci.yml

**Checkpoint**: All Supabase CLI usages now pinned to v2.62.10 - migrate job implementation can proceed

---

## Phase 3: User Story 1 - Automated Production Migration on Merge (Priority: P1) 🎯 MVP

**Goal**: When a PR is merged to main with database schema changes, migrations are automatically applied to production before deployment.

**Independent Test**: Merge a PR with a test migration file and observe that the production database schema is updated before Vercel deployment completes.

### Implementation for User Story 1

- [ ] T005 [US1] Add migrate job skeleton with timeout-minutes: 10 and concurrency group in .github/workflows/ci.yml
- [ ] T006 [US1] Add checkout step to migrate job in .github/workflows/ci.yml
- [ ] T007 [US1] Add Supabase CLI setup step with version: 2.62.10 to migrate job in .github/workflows/ci.yml
- [ ] T008 [US1] Add supabase link step with project-ref from secrets to migrate job in .github/workflows/ci.yml
- [ ] T009 [US1] Add migration execution step with retry mechanism (30s delay on failure) to migrate job in .github/workflows/ci.yml
- [ ] T010 [US1] Configure migrate job dependencies (needs: [quality, visual, e2e]) and condition (github.ref == 'refs/heads/main') in .github/workflows/ci.yml

**Checkpoint**: At this point, User Story 1 should be fully functional - migrations run automatically on merge to main

---

## Phase 4: User Story 2 - Pipeline Failure on Migration Error (Priority: P1)

**Goal**: When a migration fails, deployment is blocked to prevent deploying code that depends on missing schema changes.

**Independent Test**: Introduce an intentionally invalid migration and observe that the pipeline fails before deployment.

### Implementation for User Story 2

- [ ] T011 [US2] Update deploy-production job to depend on migrate job (needs: [quality, visual, e2e, migrate]) in .github/workflows/ci.yml
- [ ] T012 [US2] Add error reporting step to write migration output to GITHUB_STEP_SUMMARY on failure in .github/workflows/ci.yml

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - migrations run and failures block deployment

---

## Phase 5: User Story 3 - Secure Credential Management (Priority: P1)

**Goal**: Supabase credentials are stored securely and never exposed in logs or code.

**Independent Test**: Review workflow file to ensure secrets are used correctly, and review CI logs to confirm credentials are masked.

### Implementation for User Story 3

- [ ] T013 [US3] [VERIFY ONLY] Confirm SUPABASE_ACCESS_TOKEN is passed via env in migrate job (implemented in T008/T009) in .github/workflows/ci.yml
- [ ] T014 [US3] [VERIFY ONLY] Confirm SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD are passed via secrets.${{ }} syntax in .github/workflows/ci.yml

**Checkpoint**: All credentials use GitHub Secrets - no hardcoded values

---

## Phase 6: User Story 4 - PR Validation Unchanged (Priority: P2)

**Goal**: Pull request CI runs continue to validate migrations locally without triggering production migrations.

**Independent Test**: Open a PR with migration changes and observe that CI runs e2e tests against local Supabase without attempting production migration.

### Implementation for User Story 4

- [ ] T015 [US4] [VERIFY ONLY] Confirm migrate job condition excludes pull_request events (condition: github.ref == 'refs/heads/main') - satisfied by T010
- [ ] T016 [US4] [VERIFY ONLY] Confirm existing e2e job continues to use local Supabase (no changes required) in .github/workflows/ci.yml

**Checkpoint**: PR validation behavior is unchanged - production migrations only on main

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [ ] T017 [P] Run quickstart.md verification checklist:
  - [ ] Migrate job appears in workflow
  - [ ] Job runs only on main (not on PRs)
  - [ ] Supabase CLI version pinned to v2.62.10
  - [ ] No credentials visible in logs (SC-004)
  - [ ] Deployment waits for migrate to complete
  - [ ] Failures block deployment
  - [ ] Idempotent: re-run migrate job twice; second run succeeds without errors (FR-010)
  - [ ] Performance: typical migration completes within 5 minutes (SC-002)
  - [ ] Traceability: can identify failing migration file within 30 seconds from logs (SC-005)
- [ ] T018 Review complete workflow for consistency and proper job ordering

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - manual prerequisite
- **Foundational (Phase 2)**: Can start after Setup - BLOCKS migrate job implementation
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (migrate job must exist)
- **User Story 3 (Phase 5)**: Verification only - can run after US1/US2
- **User Story 4 (Phase 6)**: Verification only - can run after US1
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 (migrate job must exist to add dependency and error reporting)
- **User Story 3 (P1)**: Verification tasks - can run after T009 is complete
- **User Story 4 (P2)**: Verification tasks - no blocking dependencies

### Within Each User Story

- Job structure before job steps
- Dependencies before execution logic
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- T003 and T004 can run in parallel (different jobs in same file)
- T013 and T014 are verification tasks that can run in parallel
- T015 and T016 are verification tasks that can run in parallel
- T017 and T018 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Both version pinning tasks can run in parallel (different sections of ci.yml):
Task: "Pin Supabase CLI to v2.62.10 in visual job (line ~104) in .github/workflows/ci.yml"
Task: "Pin Supabase CLI to v2.62.10 in e2e job (line ~177) in .github/workflows/ci.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (configure GitHub Secrets manually)
2. Complete Phase 2: Foundational (pin Supabase CLI versions)
3. Complete Phase 3: User Story 1 (add migrate job)
4. **STOP and VALIDATE**: Test with a no-op migration per quickstart.md step 5
5. Proceed to Phase 4 for error handling

### Incremental Delivery

1. Complete Setup + Foundational → Version pinning complete
2. Add User Story 1 → Test independently → Migration works (MVP!)
3. Add User Story 2 → Test independently → Failures block deployment
4. Verify User Story 3 → Credentials are secure
5. Verify User Story 4 → PR workflow unchanged
6. Each story adds robustness without breaking previous stories

### Recommended Approach

Since this is a **single workflow file modification**, all tasks should be implemented as a single PR:

1. Pin CLI versions (T003, T004)
2. Add migrate job (T005-T010)
3. Update deploy-production dependency (T011)
4. Add error reporting (T012)
5. Update header comment (T002)
6. Verify all user stories (T013-T016)
7. Run final verification (T017-T018)

---

## Task Summary

| Phase | Task Count | Parallel Tasks |
|-------|------------|----------------|
| Phase 1: Setup | 2 | 0 |
| Phase 2: Foundational | 2 | 2 |
| Phase 3: US1 (MVP) | 6 | 0 |
| Phase 4: US2 | 2 | 0 |
| Phase 5: US3 | 2 | 2 |
| Phase 6: US4 | 2 | 2 |
| Phase 7: Polish | 2 | 2 |
| **Total** | **18** | **8** |

---

## Notes

- [P] tasks = different sections of file, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently verifiable per quickstart.md
- T001 is a MANUAL step - configure secrets in GitHub repository settings before implementation
- All changes are in a single file: `.github/workflows/ci.yml`
- Commit after logical groups (e.g., version pinning, migrate job, dependency update)
- Test with a harmless migration (SELECT 1;) per quickstart.md before production use

