/**
 * Supabase admin client for direct database access in E2E tests
 * Uses service role key for bypassing RLS
 * Supports per-worker schema isolation for parallel test execution
 */

import { Client as PgClient } from 'pg';

/** Cached PG client connection settings */
const PG_CONFIG = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

/**
 * Get user ID from email (for seeding test data with correct user_id)
 * Uses direct Postgres query with parameterized input to avoid SQL injection
 */
export async function getUserIdFromEmail(email: string): Promise<string> {
  const rows = await executeSQLWithResult<{ id: string }>(
    `SELECT id FROM auth.users WHERE email = $1 LIMIT 1`,
    [email]
  );

  if (rows.length === 0) {
    throw new Error(`User with email ${email} not found in auth.users`);
  }

  return rows[0].id;
}

async function getDefaultGroupId(): Promise<string> {
  const rows = await executeSQLWithResult<{ id: string }>(
    `SELECT id FROM public.groups WHERE name = $1 LIMIT 1`,
    ['Fonseca Floriano']
  );

  if (rows.length > 0) {
    return rows[0].id;
  }

  const inserted = await executeSQLWithResult<{ id: string }>(
    `INSERT INTO public.groups (name) VALUES ($1) RETURNING id`,
    ['Fonseca Floriano']
  );

  if (inserted.length === 0) {
    throw new Error('Failed to create default group');
  }

  return inserted[0].id;
}

/**
 * Ensure test user email exists in profiles table with group assignment.
 */
export async function ensureTestUser(email: string): Promise<void> {
  const name = email.split('@')[0];
  const groupId = await getDefaultGroupId();

  await executeSQL(
    `INSERT INTO public.profiles (email, name, group_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, group_id = EXCLUDED.group_id`,
    [email, name, groupId]
  );
}

/**
 * Execute raw SQL using direct postgres connection
 * This is needed for DDL operations and schema-specific queries
 * @param sql - SQL query string (use $1, $2, etc. for parameterized queries)
 * @param params - Optional array of parameter values for parameterized queries
 */
export async function executeSQL(sql: string, params?: unknown[]): Promise<void> {
  const pgClient = new PgClient(PG_CONFIG);

  try {
    await pgClient.connect();
    await pgClient.query(sql, params);
  } finally {
    await pgClient.end();
  }
}

/**
 * Execute raw SQL and return results
 * @param sql - SQL query string (use $1, $2, etc. for parameterized queries)
 * @param params - Optional array of parameter values for parameterized queries
 */
export async function executeSQLWithResult<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const pgClient = new PgClient(PG_CONFIG);

  try {
    await pgClient.connect();
    const result = await pgClient.query(sql, params);
    return result.rows as T[];
  } finally {
    await pgClient.end();
  }
}

