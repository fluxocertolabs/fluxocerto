# Tasks: Resend SMTP Integration for Production Email Delivery

**Input**: Design documents from `/specs/011-resend-smtp-integration/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅

**Tests**: Not requested - this is a documentation-only feature with manual verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Feature Overview

This is a **documentation-only feature** - no code changes required. The implementation consists of:
1. Creating setup documentation for administrators
2. Configuring external services (Resend + Supabase Dashboard)
3. Manual verification of email delivery

All configuration is done via external dashboards (Resend, Supabase), not in code.

---

## Phase 1: Setup (Documentation Infrastructure)

**Purpose**: Create documentation file structure

> **Note**: `quickstart.md` (in this spec folder) serves as the detailed administrator guide during development. `docs/smtp-setup.md` is a production-ready copy placed in the main docs folder for discoverability. Both should contain the same content.

- [ ] T001 Create production SMTP setup guide at `docs/smtp-setup.md` (copy content from quickstart.md; must include FR-011 rate limits, FR-012 troubleshooting dashboard reference)

---

## Phase 2: Foundational (External Service Setup)

**Purpose**: Configure external services that MUST be complete before ANY user story can be verified

**⚠️ CRITICAL**: No user story verification can proceed until this phase is complete

- [ ] T002 Create Resend account at resend.com (external)
- [ ] T003 Add domain `financas.fflo.me` in Resend Dashboard (external)
- [ ] T004 Configure SPF DNS record for domain verification (external - DNS provider)
- [ ] T005 Configure DKIM DNS record for domain verification (external - DNS provider)
- [ ] T006 [P] Configure DMARC DNS record (optional but recommended) (external - DNS provider)
- [ ] T007 Verify domain in Resend Dashboard (external - may require DNS propagation wait)
- [ ] T008 Create "Sending access" API key restricted to `financas.fflo.me` (external - Resend Dashboard)

**Checkpoint**: Resend account ready with verified domain and API key

---

## Phase 3: User Story 1 - Production Magic Link Email Delivery (Priority: P1) 🎯 MVP

**Goal**: Family members receive real Magic Link emails in production

**Independent Test**: Deploy to production, enter a valid email on the login page, verify the Magic Link email arrives in the real inbox within 30 seconds, click the link, and confirm successful authentication.

### Implementation for User Story 1

- [ ] T009 [US1] Navigate to Supabase Dashboard → Project Settings → Authentication → SMTP Settings (external)
- [ ] T010 [US1] Configure SMTP settings in Supabase Dashboard (external): Enable Custom SMTP, set host=smtp.resend.com, port=465, username=resend, password=API key, sender=noreply@financas.fflo.me, name=Family Finance (see spec.md FR-013 through FR-016)
- [ ] T011 [US1] Save SMTP configuration and verify settings are persisted (external)
- [ ] T012 [US1] Test Magic Link email delivery in production (manual verification)
- [ ] T013 [US1] Verify email arrives within 30 seconds (SC-001)
- [ ] T014 [US1] Verify sender shows `noreply@financas.fflo.me` (SC-002)
- [ ] T015 [US1] Verify Magic Link completes authentication successfully

**Checkpoint**: User Story 1 complete - production Magic Link emails work

---

## Phase 4: User Story 2 - Local Development Unchanged (Priority: P1)

**Goal**: Developers continue using Inbucket locally without changes

**Independent Test**: Run `supabase start` locally, request a Magic Link, and verify the email appears in Inbucket at localhost:54324 (not sent via Resend).

### Implementation for User Story 2

- [ ] T016 [US2] Verify `supabase/config.toml` has Inbucket enabled (no changes needed)
- [ ] T017 [US2] Run `supabase start` locally
- [ ] T018 [US2] Request Magic Link in local development
- [ ] T019 [US2] Verify email appears in Inbucket at `http://localhost:54324`
- [ ] T020 [US2] Verify email is NOT sent via Resend (check Resend Dashboard logs)
- [ ] T021 [US2] Verify local authentication flow works unchanged (SC-004)

**Checkpoint**: User Story 2 complete - local development unchanged

---

## Phase 5: User Story 3 - Secure Credential Management (Priority: P1)

**Goal**: SMTP credentials stored securely, never in repository

**Independent Test**: Search the repository for any Resend API keys or SMTP passwords and confirm none exist. Verify credentials are only stored in Supabase Dashboard.

### Implementation for User Story 3

- [ ] T022 [US3] Search repository for Resend API keys with `grep -r "re_" --include="*"` (manual verification)
- [ ] T023 [US3] Search repository for SMTP passwords with `grep -ri "smtp.*password" --include="*"` (manual verification)
- [ ] T024 [US3] Verify no production credentials in any config files
- [ ] T025 [US3] Verify `docs/smtp-setup.md` guides users to Supabase Dashboard (not code)
- [ ] T026 [US3] Confirm SC-003: Repository contains zero production secrets

**Checkpoint**: User Story 3 complete - credentials secure

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation completion and final validation

- [ ] T027 [P] Update `docs/smtp-setup.md` with troubleshooting section (if not already copied from quickstart.md)
- [ ] T028 [P] Verify Resend free tier limits documented in `docs/smtp-setup.md` (FR-011)
- [ ] T029 [P] Verify Resend dashboard for troubleshooting documented in `docs/smtp-setup.md` (FR-012)
- [ ] T030 Validate `quickstart.md` steps match actual configuration process
- [ ] T031 Run full end-to-end verification using `quickstart.md` checklist
- [ ] T032 Verify SC-005: Setup documentation enables configuration in under 30 minutes of active work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (different environments)
  - US3 can proceed in parallel (verification only)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational phase (Resend account + domain verified)
- **User Story 2 (P1)**: Can technically start after Phase 1, but verify after US1 to confirm no regressions
- **User Story 3 (P1)**: Can proceed in parallel with US1/US2 (verification only)

### Within Each User Story

- Configuration steps must be sequential (Dashboard settings)
- Verification steps depend on configuration completion

### Parallel Opportunities

- T004, T005, T006 (DNS records) can be added in parallel
- US2 and US3 verification can run in parallel with US1 completion
- T027, T028, T029 (documentation updates) can run in parallel

---

## Parallel Example: Phase 2 DNS Configuration

```bash
# Launch all DNS record configurations together:
Task: "Configure SPF DNS record for domain verification"
Task: "Configure DKIM DNS record for domain verification"
Task: "Configure DMARC DNS record (optional but recommended)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (create docs/smtp-setup.md)
2. Complete Phase 2: Foundational (Resend account + domain)
3. Complete Phase 3: User Story 1 (Supabase SMTP config + verification)
4. **STOP and VALIDATE**: Test production Magic Link email delivery
5. Production is usable at this point!

### Incremental Delivery

1. Complete Setup + Foundational → External services ready
2. Add User Story 1 → Test production → **Production working** (MVP!)
3. Add User Story 2 → Verify local dev unchanged → Developer confidence
4. Add User Story 3 → Security verification → Compliance confirmed
5. Each story adds confidence without breaking previous stories

### Single Person Strategy

Since this is a documentation/configuration feature:

1. Complete all tasks sequentially
2. Most time will be spent waiting for DNS propagation (T007)
3. Total time: ~30 minutes active work + DNS propagation wait (up to 48 hours, usually faster)

---

## Notes

- All tasks marked `(external)` are performed in external dashboards (Resend, Supabase, DNS provider)
- No source code changes in this feature
- DNS propagation may take up to 48 hours (usually much faster)
- Manual verification required - no automated tests for external service configuration
- `quickstart.md` already contains detailed step-by-step instructions
- Commit after documentation tasks (T001, T027-T030)
- Stop at any checkpoint to validate story independently

