/**
 * Supabase admin client for direct database access in E2E tests
 * Uses service role key for bypassing RLS
 * Supports per-worker schema isolation for parallel test execution
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getWorkerSchemaName } from '../fixtures/worker-context';
import { Client as PgClient } from 'pg';

/** Default admin client (uses public schema) */
let adminClient: SupabaseClient | null = null;

/** Cached PG client connection settings */
const PG_CONFIG = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

/**
 * Get or create Supabase admin client with service role
 * This client uses the default public schema
 */
export function getAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required for E2E tests'
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

/**
 * Reset the default admin client (useful for test isolation)
 */
export function resetAdminClient(): void {
  adminClient = null;
}

/**
 * Get user ID from email (for seeding test data with correct user_id)
 * Uses the default admin client since auth.users is in the auth schema (shared)
 */
export async function getUserIdFromEmail(email: string): Promise<string> {
  const client = getAdminClient();

  // First, check auth.users
  const { data: authData, error: authError } = await client.auth.admin.listUsers();

  if (authError) {
    throw new Error(`Failed to list users: ${authError.message}`);
  }

  const user = authData.users.find((u) => u.email === email);
  if (!user) {
    throw new Error(`User with email ${email} not found in auth.users`);
  }

  return user.id;
}

/**
 * Execute raw SQL using direct postgres connection
 * This is needed for DDL operations and schema-specific queries
 */
export async function executeSQL(sql: string): Promise<void> {
  const pgClient = new PgClient(PG_CONFIG);

  try {
    await pgClient.connect();
    await pgClient.query(sql);
  } finally {
    await pgClient.end();
  }
}

/**
 * Execute raw SQL and return results
 */
export async function executeSQLWithResult<T = any>(sql: string): Promise<T[]> {
  const pgClient = new PgClient(PG_CONFIG);

  try {
    await pgClient.connect();
    const result = await pgClient.query(sql);
    return result.rows as T[];
  } finally {
    await pgClient.end();
  }
}

/**
 * Insert records into a worker schema table
 */
export async function insertIntoWorkerSchema<T extends Record<string, any>>(
  workerIndex: number,
  table: string,
  records: T[]
): Promise<T[]> {
  if (records.length === 0) {
    return [];
  }

  const schemaName = getWorkerSchemaName(workerIndex);
  const columns = Object.keys(records[0]);

  const values = records.map((record) =>
    columns.map((col) => {
      const val = record[col];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return val;
    })
  );

  const valueStrings = values.map((v) => `(${v.join(', ')})`).join(', ');
  const sql = `INSERT INTO ${schemaName}.${table} (${columns.join(', ')}) VALUES ${valueStrings} RETURNING *`;

  return executeSQLWithResult<T>(sql);
}

/**
 * Upsert a record into a worker schema table
 */
export async function upsertIntoWorkerSchema<T extends Record<string, any>>(
  workerIndex: number,
  table: string,
  record: T,
  conflictColumn: string = 'email'
): Promise<void> {
  const schemaName = getWorkerSchemaName(workerIndex);
  const columns = Object.keys(record);

  const values = columns.map((col) => {
    const val = record[col];
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return val;
  });

  const updateCols = columns
    .filter((c) => c !== conflictColumn)
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');

  const sql = `
    INSERT INTO ${schemaName}.${table} (${columns.join(', ')}) 
    VALUES (${values.join(', ')})
    ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateCols}
  `;

  await executeSQL(sql);
}

/**
 * Delete records from a worker schema table
 */
export async function deleteFromWorkerSchema(
  workerIndex: number,
  table: string,
  where?: { column: string; op: string; value: any }
): Promise<void> {
  const schemaName = getWorkerSchemaName(workerIndex);

  let sql = `DELETE FROM ${schemaName}.${table}`;

  if (where) {
    const escapedValue =
      typeof where.value === 'string' ? `'${where.value.replace(/'/g, "''")}'` : where.value;
    sql += ` WHERE ${where.column} ${where.op} ${escapedValue}`;
  }

  await executeSQL(sql);
}
