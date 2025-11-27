# Quickstart: Supabase Migration

**Feature**: 008-supabase-migration  
**Date**: 2025-11-27

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project (note the project URL and anon key)
3. **Node.js 20+** and **pnpm 10+** installed

## Setup Steps

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from template
cp .env.example .env

# Edit with your Supabase credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find credentials**:
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy "Project URL" → `VITE_SUPABASE_URL`
4. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

### 2. Run Database Migration

Execute the SQL migration in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy contents of `supabase/migrations/001_initial_schema.sql`
5. Run the query

Alternatively, using Supabase CLI:

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

### 3. Enable Anonymous Authentication

In your Supabase project:

1. Go to Authentication → Providers
2. Scroll to "Anonymous Sign-Ins"
3. Toggle **Enable Anonymous Sign-Ins** to ON
4. Save

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Start Development Server

```bash
pnpm dev
```

The app will:
1. Connect to Supabase
2. Create an anonymous session (first visit)
3. Load any existing data for that session
4. Subscribe to real-time updates

## Verification Checklist

After setup, verify the migration works:

- [ ] App loads without errors
- [ ] Can add a new bank account
- [ ] Refresh browser → account persists
- [ ] Can add projects, expenses, credit cards
- [ ] Dashboard shows cashflow projection
- [ ] Quick Balance Update works
- [ ] Open two tabs → changes sync between them

## Troubleshooting

### "Supabase URL/Key not configured"

Ensure `.env` file exists with correct values. Restart dev server after creating/modifying `.env`.

### "Anonymous sign-in failed"

1. Check Supabase dashboard → Authentication → Providers
2. Ensure "Anonymous Sign-Ins" is enabled
3. Check browser console for specific error

### "Permission denied" errors

1. Verify RLS policies were created (check SQL Editor → run `SELECT * FROM pg_policies`)
2. Ensure user is authenticated (check browser DevTools → Application → Local Storage for `sb-*-auth-token`)

### "Realtime not working"

1. Check Supabase dashboard → Database → Replication
2. Ensure tables are added to `supabase_realtime` publication
3. Check browser console for WebSocket connection errors

### Data not persisting

1. Check Network tab for failed requests
2. Verify Supabase URL is correct (no trailing slash)
3. Check Supabase dashboard → Logs for errors

## Development Notes

### Testing with Supabase

For unit tests, mock the Supabase client:

```typescript
// In test setup
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      // ... other methods
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
      // ...
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
  },
}))
```

### Local Supabase Development (Optional)

For offline development, use Supabase local:

```bash
# Start local Supabase
supabase start

# Use local URLs in .env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   React App                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ Components  │  │   Stores    │  │    Hooks    │  │    │
│  │  │  (UI)       │  │  (Zustand)  │  │ (useFinance │  │    │
│  │  │             │  │             │  │   Data)     │  │    │
│  │  └─────────────┘  └──────┬──────┘  └──────┬──────┘  │    │
│  │                          │                │         │    │
│  │                          ▼                ▼         │    │
│  │                   ┌─────────────────────────┐       │    │
│  │                   │   Supabase Client       │       │    │
│  │                   │   (src/lib/supabase.ts) │       │    │
│  │                   └───────────┬─────────────┘       │    │
│  └───────────────────────────────┼─────────────────────┘    │
│                                  │                          │
└──────────────────────────────────┼──────────────────────────┘
                                   │ HTTPS / WebSocket
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Auth      │  │  PostgREST  │  │   Realtime          │  │
│  │ (Anonymous) │  │   (CRUD)    │  │ (Subscriptions)     │  │
│  └─────────────┘  └──────┬──────┘  └──────────┬──────────┘  │
│                          │                    │             │
│                          ▼                    ▼             │
│                   ┌─────────────────────────────────────┐   │
│                   │           PostgreSQL                │   │
│                   │  (accounts, projects, expenses,     │   │
│                   │   credit_cards + RLS policies)      │   │
│                   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

