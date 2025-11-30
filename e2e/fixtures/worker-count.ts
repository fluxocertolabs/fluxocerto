/**
 * Shared worker count calculation
 * Must be consistent across auth setup, playwright config, and worker context
 */

import os from 'os';

/** Maximum supported workers */
export const MAX_WORKERS = 8;

/**
 * Determine the number of workers based on CPU cores and environment
 * In CI: Uses all available CPU cores (dedicated runner)
 * Locally: Uses half of available CPU cores (don't overwhelm dev machine)
 * Always capped at MAX_WORKERS
 */
export function getWorkerCount(): number {
  const cpuCount = os.cpus().length;
  const isCI = !!process.env.CI;
  
  // In CI, use all cores since runner is dedicated to tests
  // Locally, use half to leave resources for other apps
  const workers = isCI ? cpuCount : Math.floor(cpuCount / 2);
  
  return Math.min(Math.max(1, workers), MAX_WORKERS);
}

