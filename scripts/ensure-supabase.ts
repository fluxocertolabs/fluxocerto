#!/usr/bin/env tsx
/**
 * Ensure local Supabase is running (and keys are available).
 *
 * Why:
 * - `npx supabase status` can print a "not running" warning while still exiting 0
 *   on some environments, which makes naive `status || start` checks unreliable.
 * - E2E/visual tests require ANON_KEY + SERVICE_ROLE_KEY to be present.
 */

import { execSync } from 'child_process';

type SupabaseStatus = {
  API_URL?: string;
  ANON_KEY?: string;
  PUBLISHABLE_KEY?: string;
  SERVICE_ROLE_KEY?: string;
  SECRET_KEY?: string;
};

function tryParseJsonObject(output: string): SupabaseStatus | null {
  const trimmed = output.trim();
  if (!trimmed) return null;

  // Some CLI versions may print non-JSON warnings to stdout. Try extracting the
  // first JSON object from the output (first "{" to last "}").
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  try {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as SupabaseStatus;
  } catch {
    return null;
  }
}

function getStatus(): SupabaseStatus | null {
  try {
    const output = execSync('npx supabase status -o json', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return tryParseJsonObject(output);
  } catch {
    return null;
  }
}

function hasRequiredKeys(status: SupabaseStatus | null): boolean {
  if (!status) return false;
  const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY;
  return Boolean(status.API_URL && anonKey && serviceRoleKey);
}

function startSupabase(): void {
  execSync('npx supabase start', { stdio: 'inherit' });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(attempts: number, delayMs: number): Promise<SupabaseStatus | null> {
  for (let i = 0; i < attempts; i += 1) {
    const status = getStatus();
    if (hasRequiredKeys(status)) return status;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return null;
}

async function main(): Promise<void> {
  const before = await waitForReady(2, 500);
  if (hasRequiredKeys(before)) return;

  startSupabase();

  const after = await waitForReady(10, 1000);
  if (!hasRequiredKeys(after)) {
    throw new Error(
      'Supabase started but required keys were not found in `supabase status -o json`. ' +
        'Try: pnpm db:stop && pnpm db:start'
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


