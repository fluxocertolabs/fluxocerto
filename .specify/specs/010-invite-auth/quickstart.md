# Quickstart: Invite-Only Magic Link Authentication

**Feature Branch**: `010-invite-auth`  
**Date**: 2025-11-27

## Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase CLI installed (`npx supabase --version`)
- Access to Supabase dashboard for your project

## Quick Setup

### 1. Run Database Migration

> ⚠️ **DESTRUCTIVE MIGRATION WARNING**
> 
> This migration removes the `user_id` column from all data tables. Only run on **fresh deployments** or after backing up existing data. See `data-model.md` for details.

```bash
# Start local Supabase (if using local dev)
pnpm db:start

# IMPORTANT: Backup existing data first if needed
# Via Supabase dashboard: Table Editor → Export

# Apply the new migration
npx supabase db push
```

### 2. Deploy Edge Function

```bash
# Create the webhook secret in Supabase dashboard:
# Authentication → Hooks → Add Hook → before-user-created
# Copy the webhook secret

# Set the secret locally
echo 'BEFORE_USER_CREATED_HOOK_SECRET="v1,whsec_YOUR_SECRET_HERE"' > supabase/functions/.env

# Deploy the function
npx supabase functions deploy before-user-created --no-verify-jwt
```

### 3. Configure Supabase Auth Settings

In Supabase Dashboard:

1. **Disable Anonymous Auth**:
   - Go to Authentication → Providers
   - Turn OFF "Enable anonymous sign-ins"

2. **Configure Email Settings**:
   - Go to Authentication → Email Templates
   - Ensure Magic Link template is enabled

3. **Configure URL Settings** (⚠️ Critical for Magic Link emails):
   - Go to **Project Settings** → **Authentication** (or Authentication → URL Configuration)
   - **Site URL**: Set to your production URL (e.g., `https://fluxocerto.app`)
     - This URL is used to construct Magic Link URLs in emails
     - If set to localhost, email links will point to localhost!
   - **Redirect URLs**: Add all allowed callback URLs:
     - `http://localhost:5173/auth/confirm` (local development)
     - `https://fluxocerto.app/auth/confirm` (production)
     - `https://your-app.vercel.app/auth/confirm` (Vercel preview deployments)

### 4. Add Allowed Emails

```sql
-- In Supabase SQL Editor or via dashboard Table Editor
INSERT INTO allowed_emails (email) VALUES
  ('family.member1@example.com'),
  ('family.member2@example.com');
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit `http://localhost:5173` - you should see the login page.

---

## Testing the Flow

### Test 1: Approved Email Login

1. Navigate to `http://localhost:5173/login`
2. Enter an email from `allowed_emails` table
3. Click "Send Magic Link"
4. See success message: "Check your email for the login link"
5. Check email, click the Magic Link
6. Verify redirect to dashboard

### Test 2: Non-Approved Email (Blocked)

1. Navigate to `http://localhost:5173/login`
2. Enter an email NOT in `allowed_emails` table
3. Click "Send Magic Link"
4. See same success message (no email enumeration)
5. No email is received
6. User cannot authenticate

### Test 3: Shared Data Access

1. Log in as User A
2. Create a bank account
3. Log out
4. Log in as User B (different approved email)
5. Verify User B sees the account created by User A

### Test 4: Sign Out

1. While logged in, click "Sign Out" in header
2. Verify redirect to login page
3. Try navigating to `/` directly
4. Verify redirect back to login

### Test 5: Rate Limiting

1. Navigate to `http://localhost:5173/login`
2. Enter any email address
3. Click "Send Magic Link" rapidly 5+ times in succession
4. Verify rate limiting message appears: "Too many requests. Please wait a few minutes and try again."
5. Wait 2-3 minutes, then retry
6. Verify Magic Link request succeeds

### Test 6: Empty allowed_emails Table

1. Clear all rows from `allowed_emails` table via Supabase dashboard
2. Navigate to `http://localhost:5173/login`
3. Enter any email address and click "Send Magic Link"
4. Verify success message appears (no email enumeration)
5. Verify no Magic Link email is received
6. **Note**: This is expected behavior - admin must add at least one email before anyone can sign up

---

## Key Files Modified/Created

### New Files

| File | Purpose |
|------|---------|
| `src/pages/login.tsx` | Login page with email form |
| `src/pages/auth-callback.tsx` | Magic Link callback handler |
| `src/components/auth/login-form.tsx` | Email input form component |
| `src/hooks/use-auth.ts` | Auth state management hook |
| `supabase/migrations/002_invite_auth.sql` | Schema changes |
| `supabase/functions/before-user-created/index.ts` | Invite validation |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes, auth guard |
| `src/main.tsx` | Update auth initialization |
| `src/lib/supabase.ts` | Add Magic Link methods, update config |
| `src/hooks/use-finance-data.ts` | Remove user_id filtering |
| `src/components/layout/header.tsx` | Add sign-out button |

---

## Environment Variables

No new environment variables required. Existing Supabase config is sufficient:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The Edge Function uses a secret configured in Supabase dashboard (not in `.env`).

---

## Troubleshooting

### Magic Link Not Received

1. Check spam folder
2. Verify email is in `allowed_emails` table
3. Check Supabase dashboard → Authentication → Logs

### "Invalid Login Link" Error

1. Link may have expired (1 hour limit)
2. Link may have already been used
3. Request a new Magic Link

### Rate Limiting

Supabase limits Magic Link requests. Wait a few minutes and try again.

### Edge Function Errors

```bash
# Check function logs
npx supabase functions logs before-user-created
```

---

## Production Deployment

### ⚠️ Critical: Configure Supabase URL Settings for Production

The Magic Link URLs in emails are constructed by Supabase using the **Site URL** setting. You MUST configure this correctly or email links will point to localhost.

**In Supabase Dashboard → Project Settings → Authentication:**

1. **Site URL** (most important!):
   - Set to: `https://fluxocerto.app` (or your production domain)
   - This determines the base URL in Magic Link emails
   - If this is set to `localhost`, users will receive emails with localhost links!

2. **Redirect URLs** (allow-list for auth callbacks):
   - Add: `https://fluxocerto.app/auth/confirm`
   - Add: `http://localhost:5173/auth/confirm` (for local dev)
   - Add any Vercel preview URLs if needed

### Vercel Configuration

Environment Variables in Vercel (same as development):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Edge Function Deployment

Edge Function is deployed to Supabase, not Vercel. Ensure it's deployed:
```bash
npx supabase functions deploy before-user-created --no-verify-jwt
```

