# Research: Local Development Auth Bypass

**Feature**: 024-local-dev-auth-bypass  
**Date**: 2025-12-03  
**Status**: Complete

## Executive Summary

This document consolidates research findings for implementing a local development authentication bypass. The recommended approach is **Persistent Dev Session Injection** - generating valid Supabase session tokens for a `dev@local` user and auto-injecting them in DEV mode.

---

## Problem Statement

The application uses Supabase Authentication with Row Level Security (RLS) policies based on `household_id`. Simply mocking frontend auth state is insufficient because:

1. RLS policies require a valid JWT with `authenticated` role
2. The `get_user_household_id()` function extracts email from `auth.jwt()` to determine data access
3. All database operations without valid auth will fail with RLS errors

**Challenge**: Enable automated testing by AI agents without manual Magic Link authentication flow.

---

## Research Tasks

### 1. Supabase Admin API for User Creation

**Question**: How to programmatically create and manage users for local development?

**Finding**: Supabase Admin API (via service role key) provides:
- `auth.admin.createUser()` - Create user with email_confirm flag
- `auth.admin.listUsers()` - Find existing users by email
- `auth.admin.updateUserById()` - Set password for sign-in
- `auth.signInWithPassword()` - Generate session tokens after setting password

**Decision**: Use admin API to create `dev@local` user, set a known password, then sign in to generate tokens.

**Rationale**: This produces a valid session identical to manual login, preserving full RLS functionality.

**Alternatives Considered**:
- Magic Link parsing: Complex, requires email interception
- Direct JWT generation: Requires secret key management, harder to maintain
- MSW mocking: Doesn't test actual RLS policies

### 2. Session Token Injection

**Question**: How to inject session into Supabase client before app renders?

**Finding**: `supabase.auth.setSession({ access_token, refresh_token })` accepts tokens and establishes the session. Must be called before any authenticated operations.

**Decision**: Call `setSession()` in `main.tsx` bootstrap, gated by `import.meta.env.DEV` and presence of `VITE_DEV_ACCESS_TOKEN`.

**Rationale**: Centralizes auth bypass at the entry point, before any components mount.

**Alternatives Considered**:
- Wrap in React context: Adds unnecessary complexity
- Modify supabase.ts: Mixes concerns with auth utilities

### 3. Household and Profile Setup

**Question**: How should the dev user be associated with a household for RLS?

**Finding**: Current schema requires:
1. User in `auth.users` (Supabase managed)
2. Profile in `profiles` table with `email` and `household_id`
3. RLS function `get_user_household_id()` looks up by email

**Decision**: Script creates a dedicated "Dev Household" and links the dev user's profile to it. Also creates minimal seed data (one account) for immediate RLS verification.

**Rationale**: Isolated dev household prevents pollution of existing data and ensures clean test environment.

**Alternatives Considered**:
- Reuse existing household: Risks data conflicts in multi-user setups
- No household creation: Would break RLS policies

### 4. Script Runner Selection

**Question**: How to run TypeScript scripts in the project?

**Finding**: Project uses pnpm and Vite. Options:
- `tsx` - Zero-config TypeScript execution, modern, fast
- `ts-node` - Requires configuration, slower startup
- `vite-node` - Possible but meant for Vite-specific code

**Decision**: Use `tsx` as script runner via `pnpm dlx tsx` or as dev dependency.

**Rationale**: Fastest startup, no configuration needed, handles ESM properly.

**Alternatives Considered**:
- ts-node: Slower, needs tsconfig.json setup for ESM
- Compile to JS first: Extra step, poor DX

### 5. Token Expiration Handling

**Question**: What happens when injected tokens expire?

**Finding**: Supabase client with `autoRefreshToken: true` (already configured) handles refresh automatically. The refresh token is used to obtain new access tokens.

**Decision**: Include refresh token in environment variables. Supabase client handles renewal.

**Rationale**: No additional code needed - existing client configuration already supports this.

**Alternatives Considered**:
- Long-lived tokens: Security risk, not supported by Supabase
- Manual refresh logic: Unnecessary duplication

### 6. Failure Handling

**Question**: What should happen if `setSession()` fails in dev mode?

**Finding**: Possible failures:
- Invalid/expired tokens
- Supabase not running
- Network issues

**Decision**: Fall back to normal login form and display error toast explaining bypass failure.

**Rationale**: Graceful degradation allows developers to either regenerate tokens or use manual login.

**Alternatives Considered**:
- Hard crash: Poor UX, blocks development
- Silent fail: Confusing - developer expects bypass

---

## Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Bypass Approach | Session Injection | Full RLS functionality, realistic testing |
| User Creation | Supabase Admin API | Standard approach, well-documented |
| Script Runner | tsx | Zero-config, fast, ESM support |
| Household Strategy | Dedicated Dev Household | Clean isolation, no data conflicts |
| Token Storage | VITE_* env vars | Standard Vite pattern, .env.local security |
| Failure Mode | Fallback to login + toast | Graceful degradation |

---

## Security Considerations

1. **DEV mode only**: `import.meta.env.DEV` check prevents bypass in production builds
2. **Local Supabase only**: Script connects to localhost, not production
3. **Service Role Key**: Never committed, obtained from `supabase status`
4. **No password in code**: Password set programmatically, dev user cannot be used remotely

---

## References

- [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase setSession](https://supabase.com/docs/reference/javascript/auth-setsession)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- Prior research: `docs/research/local-auth-bypass.md`

