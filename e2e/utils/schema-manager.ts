/**
 * Dynamic schema management for parallel E2E test execution
 * Creates and manages per-worker PostgreSQL schemas for complete test isolation
 *
 * This runs ONLY during E2E tests against local Supabase - no migrations, no production impact.
 */

import { executeSQL, executeSQLWithResult } from './supabase-admin';
import { MAX_WORKERS } from '../fixtures/worker-context';

/** Tables to clone from public schema to worker schemas */
const TABLES_TO_CLONE = [
  'profiles',
  'accounts',
  'projects',
  'expenses',
  'credit_cards',
  'user_preferences',
] as const;

/**
 * Get the schema name for a worker index
 */
export function getWorkerSchemaName(workerIndex: number): string {
  return `test_worker_${workerIndex}`;
}

/**
 * Create a worker schema with all tables cloned from public schema
 * Tables are created empty (structure only, no data)
 */
export async function createWorkerSchema(workerIndex: number): Promise<void> {
  const schemaName = getWorkerSchemaName(workerIndex);

  // Create schema if it doesn't exist
  await executeSQL(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);

  // Clone each table structure from public schema
  for (const tableName of TABLES_TO_CLONE) {
    await cloneTableStructure(schemaName, tableName);
  }

  // Grant permissions to authenticated role
  await executeSQL(`GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;`);
  await executeSQL(`GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO authenticated;`);
  await executeSQL(`GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO authenticated;`);

  // Also grant to service_role for admin operations
  await executeSQL(`GRANT USAGE ON SCHEMA ${schemaName} TO service_role;`);
  await executeSQL(`GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO service_role;`);
  await executeSQL(`GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO service_role;`);

  // Grant to anon role as well for completeness
  await executeSQL(`GRANT USAGE ON SCHEMA ${schemaName} TO anon;`);
  await executeSQL(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schemaName} TO anon;`);
}

/**
 * Clone table structure from public schema to worker schema
 */
async function cloneTableStructure(schemaName: string, tableName: string): Promise<void> {
  // Drop existing table if it exists (for clean recreation)
  await executeSQL(`DROP TABLE IF EXISTS ${schemaName}.${tableName} CASCADE;`);

  // Create table like public table (structure only, no data)
  await executeSQL(`
    CREATE TABLE ${schemaName}.${tableName} 
    (LIKE public.${tableName} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
  `);

  // For user_preferences, add FK to auth.users (shared auth schema)
  if (tableName === 'user_preferences') {
    await executeSQL(`
      ALTER TABLE ${schemaName}.user_preferences 
      ADD CONSTRAINT ${schemaName}_user_preferences_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    `);
  }

  // For accounts and credit_cards, add FK to profiles in the same worker schema
  if (tableName === 'accounts') {
    await executeSQL(`
      ALTER TABLE ${schemaName}.accounts 
      ADD CONSTRAINT ${schemaName}_accounts_owner_id_fkey 
      FOREIGN KEY (owner_id) REFERENCES ${schemaName}.profiles(id) ON DELETE SET NULL;
    `);
  }

  if (tableName === 'credit_cards') {
    await executeSQL(`
      ALTER TABLE ${schemaName}.credit_cards 
      ADD CONSTRAINT ${schemaName}_credit_cards_owner_id_fkey 
      FOREIGN KEY (owner_id) REFERENCES ${schemaName}.profiles(id) ON DELETE SET NULL;
    `);
  }
}

/**
 * Drop a worker schema and all its contents
 */
export async function dropWorkerSchema(workerIndex: number): Promise<void> {
  const schemaName = getWorkerSchemaName(workerIndex);
  await executeSQL(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
}

/**
 * Drop all worker schemas (cleanup utility)
 */
export async function dropAllWorkerSchemas(maxWorkers: number = MAX_WORKERS): Promise<void> {
  for (let i = 0; i < maxWorkers; i++) {
    await dropWorkerSchema(i);
  }
}

/**
 * Clear all data from a worker schema (but keep structure)
 */
export async function clearWorkerSchemaData(workerIndex: number): Promise<void> {
  const schemaName = getWorkerSchemaName(workerIndex);

  // Delete in reverse order to respect foreign key constraints
  const tablesInDeleteOrder = [...TABLES_TO_CLONE].reverse();

  for (const tableName of tablesInDeleteOrder) {
    await executeSQL(`DELETE FROM ${schemaName}.${tableName};`);
  }
}

/**
 * Check if a worker schema exists
 */
export async function workerSchemaExists(workerIndex: number): Promise<boolean> {
  const schemaName = getWorkerSchemaName(workerIndex);

  const result = await executeSQLWithResult<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${schemaName}'`
  );

  return result.length > 0;
}

/**
 * Setup worker schema for a test run
 * Creates schema if it doesn't exist, clears data if it does
 */
export async function setupWorkerSchema(workerIndex: number): Promise<void> {
  const exists = await workerSchemaExists(workerIndex);

  if (exists) {
    await clearWorkerSchemaData(workerIndex);
  } else {
    await createWorkerSchema(workerIndex);
  }
}

/**
 * Initialize all worker schemas for parallel test execution
 * Should be called once at the start of test run (in global setup)
 */
export async function initializeAllWorkerSchemas(workerCount: number): Promise<void> {
  for (let i = 0; i < workerCount; i++) {
    await createWorkerSchema(i);
  }
}
