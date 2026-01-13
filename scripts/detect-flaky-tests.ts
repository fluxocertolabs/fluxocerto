#!/usr/bin/env npx tsx
/**
 * Flaky Test Detection Script
 *
 * Scans Playwright test-results directory for retry artifacts and reports
 * which tests are flaky (passed after retry). This helps surface instability
 * that would otherwise go unnoticed when the suite "passes".
 *
 * Usage:
 *   pnpm exec tsx scripts/detect-flaky-tests.ts
 *   pnpm exec tsx scripts/detect-flaky-tests.ts --fail-on-flakes
 *
 * Exit codes:
 *   0 - No flakes detected (or --fail-on-flakes not set)
 *   1 - Flakes detected and --fail-on-flakes is set
 */

import { readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const TEST_RESULTS_DIR = join(process.cwd(), 'test-results');
const FAIL_ON_FLAKES = process.argv.includes('--fail-on-flakes');

interface FlakeInfo {
  testName: string;
  retryCount: number;
  artifactDirs: string[];
}

function detectFlakes(): FlakeInfo[] {
  if (!existsSync(TEST_RESULTS_DIR)) {
    console.log('📁 No test-results directory found. Run tests first.');
    return [];
  }

  const entries = readdirSync(TEST_RESULTS_DIR);
  const retryPattern = /-retry(\d+)$/;

  // Group by base test name (without retry suffix)
  const testArtifacts = new Map<string, string[]>();

  for (const entry of entries) {
    const fullPath = join(TEST_RESULTS_DIR, entry);

    // Skip hidden files and non-directories
    if (entry.startsWith('.') || !statSync(fullPath).isDirectory()) {
      continue;
    }

    // Extract base name (without -retryN suffix)
    const retryMatch = entry.match(retryPattern);
    const baseName = retryMatch ? entry.replace(retryPattern, '') : entry;

    if (!testArtifacts.has(baseName)) {
      testArtifacts.set(baseName, []);
    }
    testArtifacts.get(baseName)!.push(entry);
  }

  // Find tests with retry artifacts
  const flakes: FlakeInfo[] = [];

  for (const [baseName, dirs] of testArtifacts) {
    const retryDirs = dirs.filter((d) => retryPattern.test(d));

    if (retryDirs.length > 0) {
      // Extract max retry number
      const maxRetry = Math.max(
        ...retryDirs.map((d) => {
          const match = d.match(retryPattern);
          return match ? parseInt(match[1], 10) : 0;
        })
      );

      flakes.push({
        testName: baseName,
        retryCount: maxRetry,
        artifactDirs: dirs.sort(),
      });
    }
  }

  return flakes.sort((a, b) => b.retryCount - a.retryCount);
}

function formatTestName(artifactDirName: string): string {
  // Convert artifact dir name to readable test name
  // Example: "visual-onboarding.visual-O-c2953-zard---profile-step---light-visual"
  // -> "onboarding.visual - profile step - light"

  // Remove project prefix and hash
  const name = artifactDirName
    .replace(/^(visual|chromium|chromium-mobile|visual-mobile)-/, '')
    .replace(/-[a-f0-9]{5,}-/, ' - ')
    .replace(/---/g, ' - ')
    .replace(/-visual$/, '')
    .replace(/-chromium$/, '')
    .replace(/-/g, ' ');

  return name;
}

function main(): void {
  console.log('🔍 Scanning for flaky tests...\n');

  const flakes = detectFlakes();

  if (flakes.length === 0) {
    console.log('✅ No flaky tests detected!\n');
    console.log('All tests passed on first attempt (no retry artifacts found).');
    process.exit(0);
  }

  console.log(`⚠️  Found ${flakes.length} flaky test(s):\n`);
  console.log('━'.repeat(80));

  for (const flake of flakes) {
    const readableName = formatTestName(flake.testName);
    console.log(`\n🔄 ${readableName}`);
    console.log(`   Retries: ${flake.retryCount}`);
    console.log(`   Artifacts:`);
    for (const dir of flake.artifactDirs) {
      const isRetry = dir.includes('-retry');
      const prefix = isRetry ? '     ↻' : '     ✓';
      console.log(`${prefix} ${dir}`);
    }
  }

  console.log('\n' + '━'.repeat(80));
  console.log(`\n📊 Summary: ${flakes.length} flaky test(s), ${flakes.reduce((sum, f) => sum + f.retryCount, 0)} total retries`);

  // Group by retry count for quick triage
  const byRetryCount = new Map<number, FlakeInfo[]>();
  for (const flake of flakes) {
    if (!byRetryCount.has(flake.retryCount)) {
      byRetryCount.set(flake.retryCount, []);
    }
    byRetryCount.get(flake.retryCount)!.push(flake);
  }

  console.log('\n📈 Retry distribution:');
  for (const [count, tests] of [...byRetryCount.entries()].sort((a, b) => b[0] - a[0])) {
    console.log(`   ${count} retry(s): ${tests.length} test(s)`);
  }

  console.log('\n💡 Tip: Investigate tests with highest retry counts first.');
  console.log('   Check test-results/<artifact-dir>/ for screenshots and traces.\n');

  if (FAIL_ON_FLAKES) {
    console.log('❌ Failing due to --fail-on-flakes flag.\n');
    process.exit(1);
  }
}

main();

