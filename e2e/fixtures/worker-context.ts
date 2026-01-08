/**
 * Worker context utilities for parallel E2E test execution
 * Provides isolation information for each Playwright worker
 *
 * @see specs/020-parallel-e2e/contracts/fixtures.ts for interface contracts
 */

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getWorkerCount, MAX_WORKERS } from './worker-count';

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

  /** Worker-specific group name for data isolation via RLS */
  readonly groupName: string;
}

/** Maximum supported workers (FR-010) - re-export from shared module */
export { MAX_WORKERS };

/** Auth retry attempts (FR-011) */
export const AUTH_MAX_RETRIES = 3;

/** Auth retry delays in ms (FR-011: 1s, 2s, 4s) */
export const AUTH_RETRY_DELAYS = [1000, 2000, 4000] as const;

/** SQL LIKE pattern for all worker data */
export const ALL_WORKERS_PATTERN = '[W%]%';

function normalizeProjectName(projectName?: string): string {
  const raw = (projectName || 'chromium').toLowerCase();
  // Keep it filesystem-safe and stable.
  const slug = raw.replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  return slug || 'chromium';
}

/**
 * Create worker context from worker index.
 *
 * Playwright's workerIndex is a global counter that keeps incrementing,
 * especially during retries. We use modulo to map it to the ACTUAL number
 * of workers we authenticated during setup (not MAX_WORKERS).
 *
 * Example: With 2 workers in CI:
 * - Worker 0 → 0 % 2 = 0 (use worker-0.json)
 * - Worker 1 → 1 % 2 = 1 (use worker-1.json)  
 * - Worker 2 (retry) → 2 % 2 = 0 (use worker-0.json) ✓
 * - Worker 3 (retry) → 3 % 2 = 1 (use worker-1.json) ✓
 *
 * @param workerIndex - 0-based index from Playwright (test.info().workerIndex)
 * @param projectName - Playwright project name (e.g. "chromium", "chromium-mobile")
 * @returns Worker context with isolation information
 */
export function getWorkerContext(workerIndex: number, projectName?: string): IWorkerContext {
  // CRITICAL: Map the global worker index to the ACTUAL number of workers
  // we authenticated during setup, not MAX_WORKERS
  const actualWorkerCount = getWorkerCount();
  const normalizedIndex = workerIndex % actualWorkerCount;
  const project = normalizeProjectName(projectName);

  return {
    workerIndex: normalizedIndex,
    // IMPORTANT: workerIndex is per-project. We MUST incorporate project name into
    // email + auth state path so different Playwright projects (chromium vs chromium-mobile)
    // don't share the same user/group concurrently.
    email: `e2e-test-${project}-worker-${normalizedIndex}@example.com`,
    authStatePath: resolve(__dirname, `../.auth/${project}-worker-${normalizedIndex}.json`),
    dataPrefix: `[W${normalizedIndex}] `,
    schemaName: `test_${project}_worker_${normalizedIndex}`,
    groupName: `Test ${project} Worker ${normalizedIndex}`,
  };
}

/**
 * Get the group name for a worker index.
 *
 * @param workerIndex - Worker index
 * @returns Group name (e.g., "Test Worker 0")
 */
export function getWorkerGroupName(workerIndex: number): string {
  const actualWorkerCount = getWorkerCount();
  const normalizedIndex = workerIndex % actualWorkerCount;
  return `Test Worker ${normalizedIndex}`;
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

