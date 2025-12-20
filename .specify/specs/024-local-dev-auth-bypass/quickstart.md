# Quickstart: Local Development Auth Bypass

**Feature**: 024-local-dev-auth-bypass  
**Time to Complete**: ~5 minutes (one-time setup)

## Prerequisites

- Node.js 20+
- pnpm 10+
- Local Supabase instance running (`pnpm db:start`)

## Setup Steps

### 1. Start Local Supabase

```bash
# Run from repository root
pnpm db:start
```

Wait for Supabase to be ready. You should see status output with service URLs.

### 2. Generate Dev Tokens

```bash
pnpm run gen:token
```

This script:
- Connects to local Supabase (http://127.0.0.1:54321)
- Creates `dev@local` user if not exists
- Creates a dev household and profile
- Creates a sample checking account
- Generates and outputs session tokens

**Expected Output (excerpt):**
```text
Creating user...
✓ User created/found: dev@local
Creating household...
✓ Household created/found: Dev Household
Creating profile...
✓ Profile linked to household
Creating seed account...
✓ Account created: Dev Checking
Generating tokens...
✓ Tokens generated

📋 Add these to your .env:
VITE_DEV_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_DEV_REFRESH_TOKEN=abc123...

✅ .env updated at /path/to/project/.env
```

The script automatically updates `.env` with the latest `VITE_DEV_ACCESS_TOKEN` and
`VITE_DEV_REFRESH_TOKEN` values. You normally **don’t need to edit `.env` manually**.

### 3. Start Development Server

```bash
pnpm dev:app
```

Open http://localhost:5173 - you should see the dashboard immediately, without login.

## Verification

1. **Dashboard loads**: No login screen, directly shows cashflow view
2. **Data visible**: Dev Checking account with $10,000 balance appears
3. **CRUD works**: Try creating a new expense - it should persist
4. **RLS active**: Data is isolated to dev household

## Troubleshooting

### "Auth bypass failed" toast

**Cause**: Tokens are invalid or expired.

**Fix**: Regenerate tokens:
```bash
pnpm run gen:token
# Script will update .env with new tokens
# Restart dev server after it finishes
```

### "Supabase not running" error

**Cause**: Local Supabase is not started.

**Fix**:
```bash
pnpm db:start
pnpm run gen:token
```

### Login screen still shows

**Causes**:
1. Running in production mode (not `pnpm dev`)
2. Missing `VITE_DEV_ACCESS_TOKEN` in `.env`
3. Typo in environment variable name

**Fix**: Verify dev mode and env vars:
```bash
# Check env vars
cat .env | grep VITE_DEV

# Must have both:
# VITE_DEV_ACCESS_TOKEN=...
# VITE_DEV_REFRESH_TOKEN=...
```

### RLS errors in console

**Cause**: Profile not linked to household correctly.

**Fix**: Reset and regenerate:
```bash
pnpm db:reset
pnpm run gen:token
```

## Daily Usage

After initial setup, daily workflow is:

```bash
pnpm dev  # Starts Supabase + Vite
# Open http://localhost:5173 - auto-logged in
```

If tokens expire (rare, ~1 week default):
```bash
pnpm run gen:token
# Script will update .env with new tokens
# Restart dev server
```

## For AI Agents

When automating tests:

1. Ensure Supabase is running: `pnpm db:start`
2. Tokens should be pre-configured in `.env` (via `pnpm run gen:token`)
3. Start app: `pnpm dev:app`
4. App will auto-authenticate - proceed with test scenarios
5. All CRUD operations will persist to local Supabase
6. RLS policies are active - tests reflect real behavior

