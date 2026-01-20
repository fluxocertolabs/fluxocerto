#!/usr/bin/env tsx
/**
 * Dev Token Generation Script
 * 
 * Generates Supabase session tokens for local development authentication bypass.
 * Creates a dev@local user, household, profile, and seed account if they don't exist.
 * 
 * Usage:
 *   pnpm run gen:token
 * 
 * Prerequisites:
 *   - Local Supabase must be running: pnpm db:start
 *   - Service Role Key is auto-detected from `supabase status`
 * 
 * Output:
 *   Prints VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN and writes them to .env
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Client as PgClient } from 'pg';

// ============================================================================
// Configuration
// ============================================================================

const DEV_USER_EMAIL = 'dev@local';
const DEV_USER_PASSWORD = 'dev-local-password-12345'; // Only used locally
const DEV_HOUSEHOLD_NAME = 'Dev Household';
const DEV_PROFILE_NAME = 'Dev User';
const DEV_ACCOUNT_NAME = 'Dev Checking';
const DEV_ACCOUNT_BALANCE = 1000000; // $10,000.00 in cents

const SUPABASE_URL = 'http://127.0.0.1:54321';
const PG_CONFIG = {
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

// ============================================================================
// Utilities
// ============================================================================

function log(message: string): void {
  console.log(message);
}

function logSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

function logError(message: string): void {
  console.error(`✗ ${message}`);
}

async function executeSQL(sql: string, params?: unknown[]): Promise<void> {
  const client = new PgClient(PG_CONFIG);
  try {
    await client.connect();
    await client.query(sql, params);
  } finally {
    await client.end();
  }
}

/**
 * Get Service Role Key from environment or running Supabase instance.
 *
 * Priority:
 * 1. SUPABASE_SERVICE_ROLE_KEY env var (explicit override)
 * 2. `supabase status -o json` via npx (global CLI)
 */
function getServiceRoleKey(): string {
  // 1) Prefer explicit env var if provided
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  // 2) Fallback to querying local Supabase CLI status
  try {
    const output = execSync('npx supabase status -o json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(output);
    
    if (!status.SERVICE_ROLE_KEY) {
      throw new Error('SERVICE_ROLE_KEY not found in supabase status output');
    }
    
    return status.SERVICE_ROLE_KEY;
  } catch (error) {
    if (error instanceof Error && error.message.includes('SERVICE_ROLE_KEY')) {
      throw error;
    }
    throw new Error(
      'Failed to get Service Role Key. Is Supabase running? Try: pnpm db:start'
    );
  }
}

/**
 * Validate connection to local Supabase
 */
async function validateConnection(client: SupabaseClient): Promise<void> {
  try {
    // Try to list users - this validates both connection and service role key
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error(
          `Cannot connect to Supabase at ${SUPABASE_URL}. Is it running? Try: pnpm db:start`
        );
      }
      throw error;
    }
    throw new Error('Unknown connection error');
  }
}

// ============================================================================
// User Management (US1 + US2)
// ============================================================================

/**
 * Find existing dev user or create a new one
 * Idempotent: returns existing user if found
 */
async function findOrCreateDevUser(
  client: SupabaseClient
): Promise<{ id: string; email: string; isNew: boolean }> {
  log('Ensuring dev user exists...');
  
  const findExistingUser = async () => {
    // Supabase admin listUsers is paginated; scan pages until found or exhausted.
    for (let page = 1; page <= 10; page += 1) {
      const { data: listData, error: listError } = await client.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      const existingUser = listData.users.find(u => u.email === DEV_USER_EMAIL);
      if (existingUser) return existingUser;

      if (listData.users.length < 1000) break;
    }
    return null;
  };

  const existingUser = await findExistingUser();

  if (existingUser) {
    logSuccess(`User found: ${DEV_USER_EMAIL}`);
    
    // Update password to ensure we can sign in
    const { error: updateError } = await client.auth.admin.updateUserById(
      existingUser.id,
      { password: DEV_USER_PASSWORD }
    );
    
    if (updateError) {
      throw new Error(`Failed to update user password: ${updateError.message}`);
    }
    
    return { id: existingUser.id, email: DEV_USER_EMAIL, isNew: false };
  }
  
  // Create new user
  const { data: createData, error: createError } = await client.auth.admin.createUser({
    email: DEV_USER_EMAIL,
    password: DEV_USER_PASSWORD,
    email_confirm: true, // Auto-confirm email
  });
  
  if (createError) {
    // If a race or pagination issue occurred, recover by re-checking.
    if (/already been registered/i.test(createError.message)) {
      const user = await findExistingUser();
      if (user) {
        return { id: user.id, email: DEV_USER_EMAIL, isNew: false };
      }
    }
    throw new Error(`Failed to create user: ${createError.message}`);
  }
  
  if (!createData.user) {
    throw new Error('User creation returned no user data');
  }
  
  logSuccess(`User created: ${DEV_USER_EMAIL}`);
  return { id: createData.user.id, email: DEV_USER_EMAIL, isNew: true };
}

/**
 * Add dev@local to allowed_emails table if not present
 * Required for the auth hook to allow sign-in
 */
async function ensureAllowedEmail(client: SupabaseClient): Promise<void> {
  log('Checking allowed_emails...');
  
  // Check if already exists
  const { data: existing, error: checkError } = await client
    .from('allowed_emails')
    .select('email')
    .eq('email', DEV_USER_EMAIL)
    .maybeSingle();
  
  if (checkError) {
    const msg = checkError.message.toLowerCase();

    // "no rows" just means the email isn't there yet
    if (msg.includes('no rows')) {
      // fall through to insert
    } else if (
    // Table might not exist - that's OK, it's optional
      msg.includes('relation') && msg.includes('does not exist')
    ) {
      log('  (allowed_emails table not found - skipping)');
      return;
    } else if (
      // Newer error wording: "Could not find the table 'public.allowed_emails' in the schema cache"
      msg.includes('could not find the table') && msg.includes('allowed_emails')
    ) {
      log('  (allowed_emails table not found in schema cache - skipping)');
      return;
    } else {
    throw new Error(`Failed to check allowed_emails: ${checkError.message}`);
    }
  }
  
  if (existing) {
    logSuccess('Email already in allowed_emails');
    return;
  }
  
  // Insert into allowed_emails
  const { error: insertError } = await client
    .from('allowed_emails')
    .insert({ email: DEV_USER_EMAIL });
  
  if (insertError) {
    // Ignore duplicate key errors
    if (!insertError.message.includes('duplicate')) {
      throw new Error(`Failed to add to allowed_emails: ${insertError.message}`);
    }
  }
  
  logSuccess('Email added to allowed_emails');
}

// ============================================================================
// Seed Data Creation (US3)
// ============================================================================

/**
 * Ensure the dev group exists and is the one the dev user is associated with.
 *
 * IMPORTANT:
 * The database provisioning migration (`ensure_current_user_group` / `handle_new_user`)
 * uses a deterministic invariant for self-serve users:
 *   group_id = user_id
 *
 * So for dev@local we must ensure the group with id = dev user id exists and has the
 * expected name, rather than creating an unrelated group by name (which the app
 * would not be associated with).
 */
async function ensureDevGroup(
  client: SupabaseClient,
  userId: string
): Promise<{ id: string; isNew: boolean }> {
  log('Ensuring dev group exists...');

  const { data: existing, error: checkError } = await client
    .from('groups')
    .select('id, name')
    .eq('id', userId)
    .maybeSingle();

  if (checkError && !checkError.message.includes('no rows')) {
    throw new Error(`Failed to check group: ${checkError.message}`);
  }

  // Create or update group (idempotent)
  const { error: upsertError } = await client.from('groups').upsert(
    {
      id: userId,
      name: DEV_HOUSEHOLD_NAME,
    },
    { onConflict: 'id' }
  );

  if (upsertError) {
    throw new Error(`Failed to upsert group: ${upsertError.message}`);
  }

  if (existing) {
    logSuccess(`Group ensured: ${DEV_HOUSEHOLD_NAME}`);
    return { id: userId, isNew: false };
  }

  logSuccess(`Group created: ${DEV_HOUSEHOLD_NAME}`);
  return { id: userId, isNew: true };
}

/**
 * Create dev profile linked to group
 * Idempotent: returns existing profile if found
 */
async function createDevProfile(
  client: SupabaseClient,
  userId: string,
  groupId: string
): Promise<{ id: string; isNew: boolean }> {
  log('Creating profile...');
  
  // Check if profile exists (by email)
  const { data: existing, error: checkError } = await client
    .from('profiles')
    .select('id, group_id')
    .eq('email', DEV_USER_EMAIL)
    .maybeSingle();
  
  if (checkError && !checkError.message.includes('no rows')) {
    throw new Error(`Failed to check profile: ${checkError.message}`);
  }
  
  if (existing) {
    // Ensure the profile is linked to the deterministic group id (user_id).
    // This keeps dev@local consistent with the signup provisioning invariant.
    if (existing.group_id !== groupId) {
      const { error: updateError } = await client
        .from('profiles')
        .update({ group_id: groupId })
        .eq('id', existing.id);

      if (updateError) {
        throw new Error(`Failed to relink profile to group: ${updateError.message}`);
      }
    }

    logSuccess('Profile found, linked to group');
    return { id: existing.id, isNew: false };
  }
  
  // Create new profile
  const { data: created, error: createError } = await client
    .from('profiles')
    .insert({
      id: userId,
      email: DEV_USER_EMAIL,
      group_id: groupId,
      name: DEV_PROFILE_NAME,
    })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create profile: ${createError.message}`);
  }
  
  logSuccess('Profile created, linked to group');
  return { id: created.id, isNew: true };
}

/**
 * Create seed account for immediate RLS verification
 * Idempotent: returns existing account if found
 */
async function createSeedAccount(
  client: SupabaseClient,
  groupId: string,
  ownerId: string
): Promise<{ id: string; isNew: boolean }> {
  log('Creating seed account...');
  
  // Check if account exists (by name and group)
  const { data: existing, error: checkError } = await client
    .from('accounts')
    .select('id')
    .eq('name', DEV_ACCOUNT_NAME)
    .eq('group_id', groupId)
    .maybeSingle();
  
  if (checkError && !checkError.message.includes('no rows')) {
    throw new Error(`Failed to check account: ${checkError.message}`);
  }
  
  if (existing) {
    logSuccess(`Account found: ${DEV_ACCOUNT_NAME}`);
    return { id: existing.id, isNew: false };
  }
  
  // Create new account
  const { data: created, error: createError } = await client
    .from('accounts')
    .insert({
      name: DEV_ACCOUNT_NAME,
      type: 'checking',
      balance: DEV_ACCOUNT_BALANCE,
      balance_updated_at: new Date().toISOString(),
      owner_id: ownerId,
      group_id: groupId,
    })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Failed to create account: ${createError.message}`);
  }
  
  logSuccess(`Account created: ${DEV_ACCOUNT_NAME}`);
  return { id: created.id, isNew: true };
}

// ============================================================================
// Onboarding / Tours (keep dev workflow unblocked)
// ============================================================================

async function ensureOnboardingCompleted(
  userId: string,
  groupId: string
): Promise<void> {
  log('Ensuring onboarding is marked completed...');

  // Use direct SQL instead of PostgREST to avoid schema-cache races in CI.
  const now = new Date().toISOString();
  await executeSQL(
    `INSERT INTO public.onboarding_states
      (user_id, group_id, status, current_step, auto_shown_at, dismissed_at, completed_at, metadata)
     VALUES
      ($1, $2, 'completed', 'done', $3, NULL, $4, $5::jsonb)
     ON CONFLICT (user_id, group_id) DO UPDATE SET
      status = EXCLUDED.status,
      current_step = EXCLUDED.current_step,
      auto_shown_at = EXCLUDED.auto_shown_at,
      dismissed_at = NULL,
      completed_at = EXCLUDED.completed_at,
      metadata = EXCLUDED.metadata`,
    [userId, groupId, now, now, JSON.stringify({ seeded_by: 'scripts/generate-dev-token.ts' })]
  );

  logSuccess('Onboarding marked completed');
}

async function ensureToursDismissed(userId: string): Promise<void> {
  log('Ensuring page tours are dismissed...');

  // Use direct SQL instead of PostgREST to avoid schema-cache races in CI.
  const now = new Date().toISOString();
  const version = 1;
  await executeSQL(
    `INSERT INTO public.tour_states
      (user_id, tour_key, status, version, dismissed_at, completed_at)
     VALUES
      ($1, 'dashboard', 'dismissed', $2, $3, NULL),
      ($1, 'manage',    'dismissed', $2, $3, NULL),
      ($1, 'history',   'dismissed', $2, $3, NULL)
     ON CONFLICT (user_id, tour_key) DO UPDATE SET
      status = EXCLUDED.status,
      version = EXCLUDED.version,
      dismissed_at = EXCLUDED.dismissed_at,
      completed_at = EXCLUDED.completed_at`,
    [userId, version, now]
  );

  logSuccess('Tours dismissed');
}

// ============================================================================
// Token Generation (US1)
// ============================================================================

/**
 * Generate session tokens by signing in as dev user
 */
async function generateTokens(
  client: SupabaseClient
): Promise<{ accessToken: string; refreshToken: string }> {
  log('Generating tokens...');
  
  const { data, error } = await client.auth.signInWithPassword({
    email: DEV_USER_EMAIL,
    password: DEV_USER_PASSWORD,
  });
  
  if (error) {
    throw new Error(`Failed to sign in: ${error.message}`);
  }
  
  if (!data.session) {
    throw new Error('Sign in succeeded but no session returned');
  }
  
  logSuccess('Tokens generated');
  
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('\n🔐 Dev Token Generator\n');
  console.log('─'.repeat(50));
  
  try {
    // Get service role key from running Supabase
    const serviceRoleKey = getServiceRoleKey();
    
    // Create admin client
    const client = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Validate connection
    await validateConnection(client);
    logSuccess(`Connected to Supabase at ${SUPABASE_URL}`);
    
    console.log('');
    
    // Create dev user (US1 + US2)
    const devUser = await findOrCreateDevUser(client);
    
    // Add to allowed_emails (US2)
    await ensureAllowedEmail(client);
    
    // Ensure the dev user's group exists (deterministic: group_id = user_id)
    const group = await ensureDevGroup(client, devUser.id);

    // Ensure profile exists and is linked to that group
    const profile = await createDevProfile(client, devUser.id, group.id);
    
    // Create seed account (US3)
    await createSeedAccount(client, group.id, profile.id);

    // Ensure onboarding/tours don't block the dashboard in local dev and CI E2E.
    await ensureOnboardingCompleted(devUser.id, group.id);
    await ensureToursDismissed(devUser.id);
    
    console.log('');
    
    // Generate tokens (US1)
    const tokens = await generateTokens(client);
    
    console.log('');
    console.log('─'.repeat(50));
    console.log('\n📋 Add these to your .env:\n');
    console.log(`VITE_DEV_ACCESS_TOKEN=${tokens.accessToken}`);
    console.log(`VITE_DEV_REFRESH_TOKEN=${tokens.refreshToken}`);
    console.log('\n' + '─'.repeat(50));
  
    // Also write/update .env on disk for convenience
    const envPath = path.join(process.cwd(), '.env');
    let existingEnv = '';

    if (fs.existsSync(envPath)) {
      existingEnv = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = existingEnv
      .split('\n')
      .filter(
        (line) =>
          !line.startsWith('VITE_DEV_ACCESS_TOKEN=') &&
          !line.startsWith('VITE_DEV_REFRESH_TOKEN=')
      )
      .filter((line, idx, arr) => !(line === '' && idx === arr.length - 1)); // trim trailing blank

    lines.push(`VITE_DEV_ACCESS_TOKEN=${tokens.accessToken}`);
    lines.push(`VITE_DEV_REFRESH_TOKEN=${tokens.refreshToken}`);

    fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');

    console.log(`\n✅ .env updated at ${envPath}`);
    console.log('\n✨ Done! Restart your dev server to use the bypass.\n');
    
  } catch (error) {
    console.log('');
    logError(error instanceof Error ? error.message : 'Unknown error');
    console.log('');
    process.exit(1);
  }
}

main();

