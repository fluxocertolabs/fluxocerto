# Environment Variables Contract

This document specifies all environment variables required for the deployment infrastructure.

## Vercel Environment Variables

Configure these in the Vercel Dashboard: **Project Settings** → **Environment Variables**

### Required Variables

| Variable | Description | Example | Scopes |
|----------|-------------|---------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

### Variable Details

#### VITE_SUPABASE_URL

- **Type**: String (URL)
- **Format**: `https://<project-ref>.supabase.co`
- **Sensitive**: No (safe to expose in client bundle)
- **Source**: Supabase Dashboard → Project Settings → API → Project URL

#### VITE_SUPABASE_ANON_KEY

- **Type**: String (JWT)
- **Format**: Base64-encoded JWT token
- **Sensitive**: No (safe to expose in client bundle - protected by RLS)
- **Source**: Supabase Dashboard → Project Settings → API → anon/public key

## Scope Definitions

| Scope | Description | Use Case |
|-------|-------------|----------|
| Production | Variables available in production deployment | Live site at production URL |
| Preview | Variables available in preview deployments | PR preview URLs |
| Development | Variables available in `vercel dev` | Local development via Vercel CLI |

## Local Development

For local development without Vercel CLI, create a `.env` file:

```bash
# .env (gitignored - never commit!)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Validation

The application validates environment variables at runtime:

1. **Missing variables**: App shows setup screen (`src/components/setup-required.tsx`)
2. **Invalid URL**: Supabase client will fail to connect
3. **Invalid key**: Supabase requests will return 401 Unauthorized

## Security Notes

1. **Never commit secrets**: `.env` is gitignored
2. **Anon key is safe to expose**: Row Level Security (RLS) protects data
3. **Service role key**: Never expose service role key in frontend
4. **Preview deployments**: Use same Supabase project (shared database per spec)

