# Research: Local Development Auth Bypass

**Date**: 2025-12-03
**Status**: Research Complete

## Goal
Implement a mechanism to run the application locally without requiring manual login, facilitating automated testing by AI models and agents.

## Problem Analysis
The application uses **Supabase Authentication** paired with **Row Level Security (RLS)**.
- **Auth**: Magic Link (OTP) is the only enabled method.
- **Data Access**: Database tables (`accounts`, `transactions`, etc.) are protected by RLS policies that restrict access to `authenticated` users.
- **Challenge**: Simply "mocking" the frontend authentication state (e.g., modifying `useAuth` to return `true`) is insufficient. If the Supabase client does not have a valid JWT (JSON Web Token) with the `authenticated` role, all database requests will be rejected by RLS.

## Proposed Solutions

### Option 1: Persistent Dev Session Injection (Recommended)
This approach involves generating a valid, long-lived session token for a specific "Dev User" and injecting it into the application on startup. This allows the app to function normally with the real (local) database.

**Mechanism:**
1.  **Setup Script**: A Node.js script (`scripts/generate-dev-token.ts`) that:
    -   Connects to the local Supabase instance using the `SERVICE_ROLE_KEY`.
    -   Ensures a `dev@local` user exists and is in the `allowed_emails` list.
    -   Programmatically generates a session (Access Token + Refresh Token) for this user.
    -   Writes these tokens to `.env.local` or prints them for the user.
2.  **Frontend Integration**:
    -   Modify `src/main.tsx` or `src/App.tsx`.
    -   Check for a `VITE_DEV_AUTH_TOKEN` environment variable.
    -   If present (and strictly in `import.meta.env.DEV` mode), call `supabase.auth.setSession()` before rendering the app.

**Pros:**
-   **Full Functionality**: The app interacts with the real local database.
-   **Realistic Testing**: AI agents interact with the actual backend logic, RLS, and constraints.
-   **Zero Friction**: Opening `localhost:5173` immediately logs the user in.

**Cons:**
-   Requires a one-time setup script execution.
-   Token expiration (though refresh tokens handle this, the initial injection might need refreshing occasionally).

### Option 2: Mock Service Worker (MSW)
This approach bypasses the network layer entirely. Instead of talking to Supabase, the browser intercepts requests and returns mock JSON data.

**Mechanism:**
1.  Install `msw`.
2.  Define request handlers for all Supabase endpoints (`/rest/v1/accounts`, etc.).
3.  Start the worker in `src/main.tsx` if `VITE_MOCK_MODE=true`.

**Pros:**
-   **Fast & Deterministic**: No database required.
-   **Isolated**: Great for UI testing.

**Cons:**
-   **High Maintenance**: Every new DB feature requires updating mocks.
-   **Logic Duplication**: You end up rewriting DB logic (sorting, filtering) in the mocks.
-   **False Positives**: Doesn't test if the backend query actually works.

## Implementation Strategy (Option 1)

### 1. Create Token Generation Script
Create `scripts/generate-dev-token.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = '...get from `supabase status`...'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const email = 'dev@local'

  // 1. Ensure user exists
  let { data: { user } } = await supabase.auth.admin.getUserById('...') // logic to find or create
  if (!user) {
    const { data: newUser } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true
    })
    user = newUser.user
  }

  // 2. Generate Link/Session
  // Note: admin.createSession is not directly exposed in all JS client versions, 
  // but we can sign in with password if we set one, OR use magic link and parse it.
  // EASIER: Update the user to have a known password (local only) and sign in.
  
  await supabase.auth.admin.updateUserById(user.id, { password: 'dev-password' })
  
  const { data } = await supabase.auth.signInWithPassword({
    email,
    password: 'dev-password'
  })

  console.log(`VITE_DEV_ACCESS_TOKEN=${data.session.access_token}`)
  console.log(`VITE_DEV_REFRESH_TOKEN=${data.session.refresh_token}`)
}

main()
```

### 2. Frontend Integration
In `src/main.tsx`:

```typescript
import { getSupabase } from '@/lib/supabase'

// ...

if (import.meta.env.DEV && import.meta.env.VITE_DEV_ACCESS_TOKEN && import.meta.env.VITE_DEV_REFRESH_TOKEN) {
  const supabase = getSupabase()
  await supabase.auth.setSession({
    access_token: import.meta.env.VITE_DEV_ACCESS_TOKEN!,
    refresh_token: import.meta.env.VITE_DEV_REFRESH_TOKEN!,
  })
}

createRoot(document.getElementById('root')!).render(...)
```

## Recommendation
Proceed with **Option 1**. It aligns best with the goal of allowing AI models to "test" the application, implying they should verify that the application actually works (persists data, calculations are correct), which requires a real database connection.

