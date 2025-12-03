# Contracts: Local Development Auth Bypass

**Feature**: 024-local-dev-auth-bypass

## Status: Not Applicable

This feature does not expose new API contracts. It is a local development utility that:

1. **Script** (`scripts/generate-dev-token.ts`) - Internal tool, no external API
2. **Frontend Modification** - Injects existing Supabase session, no new endpoints

## Existing Contracts Used

The feature interacts with existing Supabase APIs:

- **Supabase Admin API** (service role)
  - `auth.admin.listUsers()` - Find existing users
  - `auth.admin.createUser()` - Create dev user
  - `auth.admin.updateUserById()` - Set password
  
- **Supabase Auth API** (client)
  - `auth.signInWithPassword()` - Generate tokens
  - `auth.setSession()` - Inject session

These are standard Supabase SDK methods documented at:
https://supabase.com/docs/reference/javascript/auth-admin-createuser

## Future Consideration

If this feature evolves to support:
- Remote token generation
- Token refresh endpoints
- Multi-user dev environments

Then API contracts would be added here.

