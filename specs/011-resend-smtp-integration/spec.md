# Feature Specification: Resend SMTP Integration for Production Email Delivery

**Feature Branch**: `011-resend-smtp-integration`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "Implement Resend SMTP integration for Magic Link email delivery in production."

## Clarifications

### Session 2025-11-27

- Q: When a Magic Link email fails to deliver (rate limit hit, Resend outage, etc.), how should the user be informed? → A: Silent failure - user sees standard "Check your email" message (current spec behavior)
- Q: Which domain will be used for the sender email address? → A: noreply@financas.fflo.me
- Q: Should the setup documentation include steps for monitoring email delivery health? → A: Minimal - just mention Resend dashboard exists for troubleshooting

## Context

Family Finance uses Supabase Magic Link authentication (implemented in spec 010-invite-auth) for passwordless email login. Currently:

- **Local development**: Emails are captured by Inbucket (configured in `supabase/config.toml`), allowing developers to test the full authentication flow without sending real emails
- **Production**: No SMTP provider is configured, meaning Magic Link emails cannot be delivered to real email addresses

This spec integrates Resend as the email delivery provider for production deployments, enabling real Magic Link email delivery while preserving the existing local development workflow.

**Why Resend?**
- Free tier provides 3,000 emails/month and 100/day - sufficient for family use (~5 users)
- Simple SMTP integration compatible with Supabase
- Custom domain support for professional sender addresses
- No code changes required - purely configuration-based

## User Scenarios & Testing

### User Story 1 - Production Magic Link Email Delivery (Priority: P1)

A family member attempts to log in to the production Family Finance app. They enter their email address, and within seconds receive a real Magic Link email in their inbox that allows them to authenticate.

**Why this priority**: This is the core functionality - without working email delivery in production, no one can authenticate.

**Independent Test**: Deploy to production, enter a valid email on the login page, verify the Magic Link email arrives in the real inbox within 30 seconds, click the link, and confirm successful authentication.

**Acceptance Scenarios**:

1. **Given** a user enters their approved email on the production login page, **When** they click "Send Magic Link", **Then** they receive a Magic Link email in their real inbox within 30 seconds
2. **Given** a user receives a Magic Link email in production, **When** they view the email, **Then** the sender shows the custom domain address (noreply@financas.fflo.me)
3. **Given** a user clicks the Magic Link in their real inbox, **When** the authentication completes, **Then** they are successfully logged into the production app

---

### User Story 2 - Local Development Unchanged (Priority: P1)

Developers continue to use Inbucket for local development testing. The Resend integration only affects production deployments and does not change the local development experience.

**Why this priority**: Maintaining developer productivity is essential. Local development must remain fast and free of external dependencies.

**Independent Test**: Run `supabase start` locally, request a Magic Link, and verify the email appears in Inbucket at localhost:54324 (not sent via Resend).

**Acceptance Scenarios**:

1. **Given** a developer runs the app locally with `supabase start`, **When** they request a Magic Link, **Then** the email is captured by Inbucket (not sent externally)
2. **Given** the production SMTP configuration exists in Supabase Dashboard, **When** running locally, **Then** the local `config.toml` settings override any production configuration
3. **Given** a developer has never configured Resend, **When** they run the app locally, **Then** the authentication flow works identically to before this feature

---

### User Story 3 - Secure Credential Management (Priority: P1)

SMTP credentials (Resend API key) are stored securely and never committed to the repository. Administrators configure credentials through the Supabase Dashboard.

**Why this priority**: Security is non-negotiable. Leaked API keys could allow unauthorized email sending.

**Independent Test**: Search the repository for any Resend API keys or SMTP passwords and confirm none exist. Verify credentials are only stored in Supabase Dashboard.

**Acceptance Scenarios**:

1. **Given** an administrator configures Resend SMTP in Supabase Dashboard, **When** they save the configuration, **Then** the API key is stored securely by Supabase (not in repository)
2. **Given** the repository is cloned fresh, **When** searching all files, **Then** no Resend API keys, SMTP passwords, or production credentials are found
3. **Given** a developer reads the setup documentation, **When** they follow the instructions, **Then** they are guided to configure credentials in Supabase Dashboard (not in code)

---

### Edge Cases

- What happens when Resend's free tier limit is reached? → Users attempting to log in will not receive Magic Link emails until the limit resets (daily for 100/day, monthly for 3,000/month). The app shows the standard "Check your email" message but no email arrives. Administrator should monitor usage.
- What happens when Resend service is temporarily unavailable? → Magic Link emails are not delivered. Users see "Check your email" but nothing arrives. They can retry after a few minutes.
- What happens when the custom domain DNS is misconfigured? → Emails may be rejected by recipient mail servers or marked as spam. Administrator must verify domain setup in Resend dashboard.
- What happens when switching from one SMTP provider to another? → Update credentials in Supabase Dashboard. No code changes required.

## Requirements

### Functional Requirements

**Production Email Configuration:**

- **FR-001**: Production environment MUST use Resend SMTP for Magic Link email delivery
- **FR-002**: SMTP configuration MUST be done via Supabase Dashboard (Project Settings → Authentication → SMTP)
- **FR-003**: SMTP credentials MUST NOT be committed to the repository
- **FR-004**: Sender email MUST be `noreply@financas.fflo.me`

**Local Development Preservation:**

- **FR-005**: Local development MUST continue using Inbucket for email capture
- **FR-006**: No changes MUST be made to `supabase/config.toml` email settings
- **FR-007**: Local development MUST work without any Resend configuration

**Documentation:**

- **FR-008**: Setup guide MUST document Resend account creation and domain verification steps
- **FR-009**: Setup guide MUST document Supabase Dashboard SMTP configuration steps
- **FR-010**: Setup guide MUST include a testing checklist to verify email delivery works
- **FR-011**: Documentation MUST specify Resend free tier limits (3,000/month, 100/day)
- **FR-012**: Documentation MUST mention Resend dashboard for troubleshooting delivery issues

**SMTP Configuration Values:**

- **FR-013**: SMTP host MUST be `smtp.resend.com`
- **FR-014**: SMTP port MUST be `465`
- **FR-015**: SMTP username MUST be `resend`
- **FR-016**: SMTP password MUST be the Resend API key (configured in Supabase Dashboard, not stored in code)

### Key Entities

- **Resend Account**: External service account for email delivery. Contains: API key, verified domain, usage statistics.

- **Supabase SMTP Configuration**: Dashboard settings for production email delivery. Contains: host, port, username, password (API key), sender email address.

- **Custom Domain**: DNS-verified domain (`financas.fflo.me`) used as email sender. Requires: SPF, DKIM, and optionally DMARC records configured with domain registrar.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Magic Link emails are delivered to real email addresses in production within 30 seconds of request
- **SC-002**: Email sender displays `noreply@financas.fflo.me` (not generic Supabase domain)
- **SC-003**: Repository contains zero production secrets or API keys (verified by grep/search)
- **SC-004**: Local development with Inbucket works identically to before this feature (no regressions)
- **SC-005**: Setup documentation enables a new administrator to configure Resend in under 30 minutes

## Assumptions

- Administrator has access to `financas.fflo.me` domain and can configure DNS records for it (SPF, DKIM)
- Administrator has access to Supabase Dashboard for the production project
- Resend free tier limits (3,000/month, 100/day) are sufficient for family use (~5 users)
- Resend service maintains reasonable uptime and delivery rates
- Supabase's SMTP configuration feature is available on the project's plan

## Out of Scope

- Custom email templates (using Supabase defaults)
- Email analytics or tracking
- Multiple email providers or failover mechanisms
- Changes to local development SMTP configuration
- In-app email configuration UI (configuration is done via Supabase Dashboard)
- Automated monitoring or alerting for email delivery failures

