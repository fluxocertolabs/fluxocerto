# Research: Invite-Only Magic Link Authentication

**Feature Branch**: `010-invite-auth`  
**Date**: 2025-11-27  
**Status**: Complete

## Research Tasks

### 1. Supabase Magic Link Authentication Pattern

**Task**: Research best practices for Magic Link (OTP via email) authentication with Supabase JS client.

**Decision**: Use `signInWithOtp()` method with email and `emailRedirectTo` option.

**Rationale**:
- Supabase provides built-in Magic Link support via `signInWithOtp({ email, options: { emailRedirectTo } })`
- The method automatically handles user creation if the user doesn't exist (can be disabled with `shouldCreateUser: false`)
- Magic Links expire after 1 hour (Supabase default, matches FR-003)
- Session is automatically managed with 7-day duration and auto-refresh (matches FR-004)

**Alternatives Considered**:
- **Password-based auth**: Rejected per FR-002 (no passwords)
- **Phone OTP**: Rejected (email is simpler for family use, no SMS costs)
- **OAuth providers**: Rejected (adds complexity, requires third-party accounts)

**Implementation Pattern**:
```typescript
// Request Magic Link
const { error } = await supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm`,
    shouldCreateUser: true, // Let the hook handle validation
  },
})

// Verify Magic Link (on callback page)
// Supabase handles this automatically when detectSessionInUrl: true
// Or manually with verifyOtp if using token_hash from URL
```

---

### 2. Before-User-Created Database Hook Implementation

**Task**: Research how to implement invite-only access control using Supabase Auth hooks.

**Decision**: Use Supabase Edge Function with `before-user-created` hook type.

**Rationale**:
- The `before-user-created` hook executes before a user is created in `auth.users`
- Hook receives full user payload including email, allowing validation against `allowed_emails` table
- Hook can return error to block signup (400 status with error message)
- Hook can return success (200/204) to allow signup
- Fail-closed behavior: if hook errors, signup is blocked (matches FR-007a)

**Alternatives Considered**:
- **Client-side validation**: Rejected (insecure, can be bypassed)
- **Post-signup deletion**: Rejected (poor UX, user sees success then gets blocked)
- **Database trigger**: Rejected (auth.users is in auth schema, limited access)
- **Custom auth server**: Rejected (unnecessary complexity)

**Implementation Pattern**:
```typescript
// Edge Function: supabase/functions/before-user-created/index.ts
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

Deno.serve(async (req) => {
  const payload = await req.text()
  const secret = Deno.env.get('BEFORE_USER_CREATED_HOOK_SECRET')?.replace('v1,whsec_', '')
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(secret)

  try {
    const { user } = wh.verify(payload, headers)
    const email = user.email?.toLowerCase() || ''

    // Check if email is in allowed list
    const { data, error } = await supabaseAdmin
      .from('allowed_emails')
      .select('id')
      .eq('email', email)
      .single()

    if (error || !data) {
      // Return success to prevent email enumeration (FR-008)
      // But don't actually create the user
      return new Response(
        JSON.stringify({
          error: {
            http_code: 400,
            message: 'Signup not allowed',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    // Fail closed on system errors (FR-007a)
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: 'System error during signup validation',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Security Note**: The hook blocks unauthorized signups, but the client always shows "Check your email" to prevent email enumeration (FR-008).

---

### 3. PostgreSQL citext Extension for Case-Insensitive Email

**Task**: Research how to implement case-insensitive email comparison in PostgreSQL.

**Decision**: Use PostgreSQL `citext` extension for the `email` column in `allowed_emails` table.

**Rationale**:
- `citext` provides automatic case-insensitive comparison without manual `LOWER()` calls
- Built into PostgreSQL, available in Supabase
- Indexes work correctly with citext
- Matches clarification: "Use PostgreSQL citext type for email column"

**Alternatives Considered**:
- **LOWER() in queries**: Rejected (error-prone, requires remembering to use it everywhere)
- **Application-level normalization**: Rejected (doesn't protect against direct DB access)
- **Generated column**: More complex, citext is simpler

**Implementation Pattern**:
```sql
-- Enable extension (once per database)
CREATE EXTENSION IF NOT EXISTS citext;

-- Use citext for email column
CREATE TABLE allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT -- Optional audit field
);
```

---

### 4. RLS Policy Changes for Shared Family Data

**Task**: Research how to modify RLS policies to allow all authenticated users to access all data.

**Decision**: Replace user_id-based policies with simple `authenticated` role check.

**Rationale**:
- Current RLS: `USING (user_id = auth.uid())` - isolates per user
- New RLS: `USING (auth.role() = 'authenticated')` - all authenticated users see all data
- This matches FR-011 and FR-012 (all authenticated users can read/write all data)
- Simpler policies, no user_id column needed

**Alternatives Considered**:
- **Family/household ID**: Rejected (over-engineering for single-family use)
- **No RLS**: Rejected (security risk, anon key could access data)
- **Service role only**: Rejected (requires backend, adds complexity)

**Implementation Pattern**:
```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can manage own accounts" ON accounts;

-- Create new shared access policies
CREATE POLICY "Authenticated users can read all accounts"
ON accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert accounts"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update accounts"
ON accounts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete accounts"
ON accounts FOR DELETE
TO authenticated
USING (true);
```

---

### 5. React Router Auth Guard Pattern

**Task**: Research best practices for protecting routes in React Router v7 with Supabase auth.

**Decision**: Use a combination of auth context/hook and route-level protection in App.tsx.

**Rationale**:
- React Router 7 supports loader-based auth checks, but simpler component-based guards work well for SPAs
- Auth state from `supabase.auth.onAuthStateChange()` provides reactive updates
- Redirect to `/login` when unauthenticated, redirect to `/` when authenticated on login page

**Alternatives Considered**:
- **Route loaders**: More complex, better for SSR apps
- **HOC wrapper**: Outdated pattern
- **Middleware**: Not applicable to client-side SPA

**Implementation Pattern**:
```typescript
// hooks/use-auth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return { user, isLoading, isAuthenticated: !!user }
}

// App.tsx - Protected routes
function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/auth/confirm" element={<AuthCallback />} />
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/manage" element={isAuthenticated ? <ManagePage /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

### 6. Magic Link Callback Handling

**Task**: Research how to handle Magic Link callback URL and session extraction.

**Decision**: Create `/auth/confirm` route that handles the callback automatically via Supabase client.

**Rationale**:
- When user clicks Magic Link, Supabase redirects to `emailRedirectTo` URL with tokens in URL hash
- Supabase client with `detectSessionInUrl: true` automatically extracts and validates tokens
- For PKCE flow (default in newer Supabase), tokens are in URL params, handled by `verifyOtp`

**Alternatives Considered**:
- **Manual token extraction**: More complex, error-prone
- **Server-side callback**: Not needed for SPA

**Implementation Pattern**:
```typescript
// pages/auth-callback.tsx
export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession()
      
      if (error) {
        setError(error.message)
        return
      }

      // Session established, redirect to dashboard
      navigate('/', { replace: true })
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return <ErrorDisplay message={error} />
  }

  return <LoadingSpinner message="Completing sign in..." />
}
```

---

### 7. Realtime Subscription Changes

**Task**: Research how to modify realtime subscriptions for shared data (no user_id filter).

**Decision**: Remove `filter: user_id=eq.${userId}` from realtime subscriptions.

**Rationale**:
- Current subscriptions filter by user_id to only receive own changes
- For shared family data, all authenticated users should receive all changes
- Simply remove the filter parameter; RLS will handle access control

**Alternatives Considered**:
- **Broadcast channel**: Not needed, postgres_changes works fine
- **Polling**: Inefficient compared to realtime

**Implementation Pattern**:
```typescript
// Before (user-scoped)
channel.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'accounts',
  filter: `user_id=eq.${userId}`,  // REMOVE THIS
}, handler)

// After (shared)
channel.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'accounts',
  // No filter - all authenticated users receive all changes
}, handler)
```

---

### 8. Error Handling for Auth Flows

**Task**: Research user-friendly error messages for authentication scenarios.

**Decision**: Map Supabase auth errors to user-friendly messages per FR-018.

**Rationale**:
- Supabase returns technical error codes/messages
- Users need clear, actionable feedback
- Must handle: expired links, rate limiting, network errors, invalid tokens

**Error Message Mapping**:
| Scenario | Supabase Error | User Message |
|----------|----------------|--------------|
| Expired Magic Link | `otp_expired` | "This link has expired. Please request a new one." |
| Rate limited | `over_request_rate_limit` | "Too many requests. Please wait a few minutes and try again." |
| Network error | fetch/timeout | "Unable to connect. Please check your internet connection." |
| Invalid token | `invalid_token` | "Invalid login link. Please request a new one." |
| Generic error | any other | "Something went wrong. Please try again." |

---

## Summary of Key Decisions

1. **Magic Link Auth**: Use `signInWithOtp()` with email, auto-create users, 1-hour expiry
2. **Invite Validation**: Edge Function `before-user-created` hook checks `allowed_emails` table
3. **Email Case**: PostgreSQL `citext` extension for automatic case-insensitive comparison
4. **Shared Data**: RLS policies check `authenticated` role only, no user_id filtering
5. **Route Protection**: React hook with `onAuthStateChange`, component-based guards
6. **Callback Handling**: `/auth/confirm` route with automatic session extraction
7. **Realtime**: Remove user_id filter from subscriptions
8. **Error Handling**: Map Supabase errors to user-friendly messages

## Dependencies to Verify

- [x] `@supabase/supabase-js` 2.86.0 supports `signInWithOtp` ✅
- [x] PostgreSQL `citext` extension available in Supabase ✅
- [x] Supabase free tier supports Edge Functions ✅
- [x] Supabase free tier supports `before-user-created` hook ✅

