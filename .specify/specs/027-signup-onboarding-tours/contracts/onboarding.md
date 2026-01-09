# Onboarding Wizard Contract

**Feature**: 027-signup-onboarding-tours  
**Type**: Persisted UX state + minimum-setup gating  
**Scope**: Onboarding wizard (spec FR-009–FR-013)

## Minimum Setup Definition (Source of Truth)

Minimum setup complete (FR-009) is true iff, for the current group:

- `accounts.count >= 1`
- `projects.count >= 1`
- `expenses.count >= 1`

Credit cards are optional and must not block completion.

## Persistence Contract (Server-side)

### Table: `onboarding_states`

Key:
- `(user_id, group_id)` unique

Fields (minimum required):
- `user_id` (auth user id)
- `group_id` (current group)
- `status`: `'in_progress' | 'dismissed' | 'completed'`
- `current_step`: `'profile' | 'group' | 'bank_account' | 'income' | 'expense' | 'credit_card' | 'done'`
- `auto_shown_at`: timestamptz | null
- timestamps (`dismissed_at`, `completed_at`, `updated_at`, `created_at`)
- optional `metadata` jsonb

RLS:
- Users may read/write only their own onboarding row for their current group:
  - `user_id = auth.uid()`
  - `group_id = get_user_group_id()`

### Auto-show rule (must match spec)

If minimum setup is incomplete:

- If `status` is not `dismissed`/`completed` AND `auto_shown_at is null` → wizard auto-opens and sets `auto_shown_at`.
- If user dismisses/skips → `status = dismissed` and wizard must NOT auto-show again.
- If wizard is in progress and the user refreshes → wizard may reopen to resume progress.

Wizard must always remain accessible via explicit entry points (“Continuar configuração” / empty-state CTAs).

## UX Contract (Client)

### Steps (user-facing)

1. **Perfil (opcional)**: set display name (pt-BR labels/copy)
2. **Grupo (opcional)**: set group name (pt-BR)
3. **Conta bancária**: create first account
4. **Renda**: create first income source
5. **Despesa**: create first expense
6. **Cartão de crédito (opcional)**: add a card OR explicitly skip

Implementation guidance:
- Reuse existing entity forms/components from Manage where possible.
- Persist `current_step` after each successful completion.

### Entry points (required)

- Auto-show when eligible (once per user+group).
- “Continuar configuração” action (e.g. header/menu).
- Empty-state CTAs on relevant pages when required entities are missing.

### Coordination with Tours

While the onboarding wizard is open/active:

- Page tours must not auto-start.
- After onboarding is completed or dismissed, tours may auto-start on the next eligible page visit.


