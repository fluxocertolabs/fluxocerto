/**
 * Worker context utilities for parallel E2E test execution
 * Provides isolation information for each Playwright worker
 *
 * @see specs/020-parallel-e2e/contracts/fixtures.ts for interface contracts
 */

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Worker context providing isolation information for a single Playwright worker.
 */
export interface IWorkerContext {
  /** 0-based worker index from Playwright (0-7 max per FR-010) */
  readonly workerIndex: number;

  /** Worker-specific test user email (FR-001) */
  readonly email: string;

  /** Path to worker's auth state file (FR-002) */
  readonly authStatePath: string;

  /** Prefix pattern for data isolation (FR-003) */
  readonly dataPrefix: string;

  /** Worker-specific PostgreSQL schema name for complete isolation */
  readonly schemaName: string;
}

/** Maximum supported workers (FR-010) */
export const MAX_WORKERS = 8;

/** Auth retry attempts (FR-011) */
export const AUTH_MAX_RETRIES = 3;

/** Auth retry delays in ms (FR-011: 1s, 2s, 4s) */
export const AUTH_RETRY_DELAYS = [1000, 2000, 4000] as const;

/** SQL LIKE pattern for all worker data */
export const ALL_WORKERS_PATTERN = '[W%]%';

/**
 * Create worker context from worker index.
 *
 * Playwright's workerIndex can be any non-negative integer (it's a global counter
 * across test runs). We use modulo to map it to our supported range (0-7).
 *
 * @param workerIndex - 0-based index from Playwright (test.info().workerIndex)
 * @returns Worker context with isolation information
 */
export function getWorkerContext(workerIndex: number): IWorkerContext {
  // Map the global worker index to our supported range using modulo
  const normalizedIndex = workerIndex % MAX_WORKERS;

  return {
    workerIndex: normalizedIndex,
    email: `e2e-test-worker-${normalizedIndex}@example.com`,
    authStatePath: resolve(__dirname, `../.auth/worker-${normalizedIndex}.json`),
    dataPrefix: `[W${normalizedIndex}] `,
    schemaName: `test_worker_${normalizedIndex}`,
  };
}

/**
 * Get the schema name for a worker index.
 *
 * @param workerIndex - Worker index
 * @returns Schema name (e.g., "test_worker_0")
 */
export function getWorkerSchemaName(workerIndex: number): string {
  const normalizedIndex = workerIndex % MAX_WORKERS;
  return `test_worker_${normalizedIndex}`;
}

/**
 * Add worker prefix to entity name.
 *
 * @param name - Original entity name
 * @param workerIndex - Worker index for prefix
 * @returns Prefixed name (e.g., "[W0] Nubank")
 */
export function addWorkerPrefix(name: string, workerIndex: number): string {
  const normalizedIndex = workerIndex % MAX_WORKERS;
  return `[W${normalizedIndex}] ${name}`;
}

/**
 * Strip worker prefix from entity name.
 *
 * @param name - Prefixed entity name
 * @returns Original name without prefix
 */
export function stripWorkerPrefix(name: string): string {
  return name.replace(/^\[W\d+\] /, '');
}

/**
 * Get SQL LIKE pattern for a specific worker's data.
 *
 * @param workerIndex - Worker index
 * @returns Pattern like "[W0]%" for use in SQL LIKE queries
 */
export function getWorkerPrefixPattern(workerIndex: number): string {
  const normalizedIndex = workerIndex % MAX_WORKERS;
  return `[W${normalizedIndex}]%`;
}

