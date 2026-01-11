/**
 * Shared worker count calculation
 * Must be consistent across auth setup, playwright config, and worker context
 */

import os from 'os';

/** Maximum supported workers */
export const MAX_WORKERS = 8;

function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Determine the number of workers based on CPU cores and environment
 * In CI: Uses all available CPU cores (dedicated runner)
 * Locally: Uses half of available CPU cores (don't overwhelm dev machine)
 * Always capped at MAX_WORKERS
 */
export function getWorkerCount(): number {
  // Explicit override for debugging / stability tuning.
  // Keep this in one place so auth setup, worker context and Playwright config stay consistent.
  const overrideRaw = process.env.PW_WORKERS || process.env.PLAYWRIGHT_WORKERS;
  if (overrideRaw) {
    // Validate that the override is a clean integer string (e.g., "4" not "4oops")
    if (/^\d+$/.test(overrideRaw)) {
      const parsed = Number.parseInt(overrideRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return clampInt(parsed, 1, MAX_WORKERS);
      }
    }
  }

  const cpuCount = os.cpus().length;
  const isCI = !!process.env.CI;
  
  // In CI, use all cores since runner is dedicated to tests
  // Locally, use half to leave resources for other apps
  const workers = isCI ? cpuCount : Math.floor(cpuCount / 2);

  // The local Supabase + Vite dev server combo becomes noticeably flaky under high parallelism.
  // Cap local workers to keep E2E stable by default; override via PW_WORKERS when desired.
  const localDefaultCap = 4;

  return isCI
    ? clampInt(workers, 1, MAX_WORKERS)
    : clampInt(Math.min(workers, localDefaultCap), 1, MAX_WORKERS);
}

