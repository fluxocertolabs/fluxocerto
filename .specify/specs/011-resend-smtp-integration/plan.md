# Implementation Plan: Resend SMTP Integration for Production Email Delivery

**Branch**: `011-resend-smtp-integration` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/011-resend-smtp-integration/spec.md`

## Summary

Integrate Resend as the SMTP provider for Magic Link email delivery in production. This is a **documentation-only feature** - no code changes required. The implementation consists of creating a setup guide that documents:
1. Resend account creation and domain verification
2. Supabase Dashboard SMTP configuration
3. Testing checklist to verify email delivery

## Technical Context

**Language/Version**: N/A (documentation only)  
**Primary Dependencies**: Resend (external service), Supabase Dashboard  
**Storage**: N/A  
**Testing**: Manual verification via production deployment  
**Target Platform**: Production Supabase instance  
**Project Type**: Web application (existing)  
**Performance Goals**: Email delivery within 30 seconds  
**Constraints**: Resend free tier limits (3,000/month, 100/day)  
**Scale/Scope**: ~5 family users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Uses existing Supabase infrastructure |
| No code changes | ✅ PASS | Documentation only, no source modifications |
| Security requirements | ✅ PASS | Credentials stored in Supabase Dashboard, not in repo |
| Local dev unchanged | ✅ PASS | Inbucket continues to work locally (FR-005, FR-006) |
| Existing patterns | ✅ PASS | Follows existing documentation structure |

**No violations - proceeding with implementation.**

## Project Structure

### Documentation (this feature)

```text
specs/011-resend-smtp-integration/
├── spec.md              # Feature specification (input)
├── plan.md              # This file
├── research.md          # Phase 0 output - Resend/Supabase SMTP research
├── quickstart.md        # Phase 1 output - Setup guide for administrators
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# No source code changes required for this feature
# All configuration is done via Supabase Dashboard

docs/
└── smtp-setup.md        # Production SMTP setup guide (new file)
```

**Structure Decision**: Documentation-only feature. The primary deliverable is `docs/smtp-setup.md` which will guide administrators through Resend setup and Supabase SMTP configuration.

## Complexity Tracking

> No violations to justify - this is a minimal documentation-only feature.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Phase 0 Output

- [x] `research.md` - Resend SMTP configuration, domain verification, Supabase integration

## Phase 1 Output

- [x] `quickstart.md` - Administrator setup guide (detailed, spec folder)
- [ ] `docs/smtp-setup.md` - Production documentation (copy of quickstart.md for main docs folder discoverability)

## Implementation Notes

### What This Feature Does NOT Include

Per spec "Out of Scope":
- Custom email templates (using Supabase defaults)
- Email analytics or tracking
- Multiple email providers or failover
- Changes to local development SMTP configuration
- In-app email configuration UI
- Automated monitoring or alerting

### Key Configuration Values

> **Source of Truth**: See spec.md FR-013 through FR-016 for authoritative SMTP configuration values.

| Setting | Value | Spec Reference |
|---------|-------|----------------|
| SMTP Host | `smtp.resend.com` | FR-013 |
| SMTP Port | `465` | FR-014 |
| SMTP Username | `resend` | FR-015 |
| SMTP Password | Resend API key (stored in Supabase Dashboard) | FR-016 |
| Sender Email | `noreply@fluxocerto.app` | FR-004 |
| Sender Name | `Fluxo Certo` | - |

### Success Criteria Checklist

- [ ] SC-001: Magic Link emails delivered within 30 seconds
- [ ] SC-002: Sender shows `noreply@fluxocerto.app`
- [ ] SC-003: No secrets in repository (verified by grep)
- [ ] SC-004: Local development with Inbucket works unchanged
- [ ] SC-005: Setup documentation enables configuration in under 30 minutes
