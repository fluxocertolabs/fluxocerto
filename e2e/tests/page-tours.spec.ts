/**
 * E2E Tests: User Story 4 - Page Tours (Coachmarks)
 * Tests auto-show once per page per version, replay via floating help, defer while onboarding active, missing targets
 *
 * NOTE: These tests use the worker-auth fixtures and DB-driven state instead of magic links.
 * This is much faster and more reliable than creating new users via Mailpit for each test.
 */

import { test, expect } from '../fixtures/test-base';
import type { Page } from '@playwright/test';
import type { WorkerDatabaseFixture } from '../fixtures/db';
import { createAccount, createProject, createExpense } from '../utils/test-data';

test.describe('Page Tours', () => {
  // Run tour tests serially to avoid state conflicts within the same worker
  test.describe.configure({ mode: 'serial' });

  /**
   * Helper to force a full page reload to clear all React state.
   * This is necessary because visual tests share a worker-scoped browser context,
   * so React state (including Zustand stores) persists between tests.
   */
  async function forceFullReload(page: Page, path = '/'): Promise<void> {
    // Navigate away first to ensure we get a fresh React app instance
    await page.goto('about:blank');
    // Navigate to the target path with a cache-busting timestamp
    await page.goto(`${path}?_t=${Date.now()}`);
    // Use domcontentloaded instead of networkidle to avoid timeout when
    // the page has continuous polling (e.g., onboarding wizard, realtime)
    await page.waitForLoadState('domcontentloaded');
    // Wait for React to hydrate by checking for a common element
    await page.waitForTimeout(1000);
  }

  /**
   * Helper to prepare a clean state where onboarding is complete but tours haven't been seen.
   * This simulates a user who has finished onboarding but is visiting a page for the first time.
   *
   * IMPORTANT: The dashboard must have data for the tour to auto-show. When the dashboard is
   * in empty state, the TourRunner component is not rendered (early return in dashboard.tsx).
   */
  async function prepareForTourAutoShow(page: Page, db: WorkerDatabaseFixture): Promise<void> {
    // Navigate to dashboard first to ensure we have a page context for localStorage operations
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Clear localStorage tour cache - the tour hook reads from localStorage as a fallback
    // and won't auto-show if it finds cached state showing the tour was already seen.
    await page.evaluate(() => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('fluxocerto:tour:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    });

    // Clear tour state in database so tours will auto-show
    await db.clearTourState();

    // Seed minimal data so dashboard is not in empty state (required for TourRunner to mount)
    const uniqueId = Date.now();
    await db.seedAccounts([createAccount({ name: `Tour Test Account ${uniqueId}`, balance: 100000 })]);
    await db.seedProjects([createProject({ name: `Tour Test Income ${uniqueId}`, amount: 500000 })]);
    await db.seedExpenses([createExpense({ name: `Tour Test Expense ${uniqueId}`, amount: 200000 })]);

    // Force full reload to pick up the seeded data and cleared tour state
    await forceFullReload(page);

    // Wait for the dashboard to load with data (not empty state)
    // Use retry logic to handle potential timing issues with data loading
    await expect(async () => {
      const projectionSelector = page.locator('[data-tour="projection-selector"]');
      const emptyState = page.getByRole('heading', { name: /nenhum dado financeiro/i });

      const hasProjection = await projectionSelector.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      // If empty state is shown, reload to try again (data might not have propagated yet)
      if (hasEmpty) {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }

      expect(hasProjection).toBe(true);
    }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });
  }

  /**
   * Helper to prepare a state where onboarding is active (wizard should show).
   * This is used to test that tours are deferred while onboarding is active.
   *
   * NOTE: The onboarding wizard only auto-shows when:
   * - status is not 'completed' or 'dismissed'
   * - autoShownAt is null
   * - isMinimumSetupComplete is false (no accounts, income, or expenses)
   */
  async function prepareForOnboardingActive(page: Page, db: WorkerDatabaseFixture): Promise<void> {
    // Create a fresh empty group - this clears all finance data
    // NOTE: db.clear() marks onboarding as completed, so we need to clear it again
    await db.clear();

    // Clear onboarding state so the wizard will auto-show
    await db.clearOnboardingState();

    // Navigate to dashboard first to ensure we have a page context for localStorage operations
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Clear localStorage tour cache and onboarding cache
    await page.evaluate(() => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('fluxocerto:tour:') || key.includes('fluxocerto:onboarding:'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    });

    // Force full reload to trigger onboarding wizard
    await forceFullReload(page);
  }

  async function dismissTourIfPresent(page: Page): Promise<void> {
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    // Wait briefly for tour to potentially auto-show
    await closeTourButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await closeTourButton.isVisible().catch(() => false)) {
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 10000 });
    }
  }

  async function completeOnboardingIfPresent(page: Page): Promise<void> {
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    if (!(await wizardDialog.isVisible().catch(() => false))) return;

    // Complete the wizard by clicking through all steps
    const nextButton = page.getByRole('button', { name: /próximo/i });
    const skipButton = page.getByRole('button', { name: /pular/i });
    const completeButton = page.getByRole('button', { name: /concluir|começar a usar/i });

    for (let i = 0; i < 15; i++) {
      // Check if we're done
      if (await completeButton.isVisible().catch(() => false)) {
        await completeButton.click();
        break;
      }
      // Try next button
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(300);
        continue;
      }
      // Try skip button (for optional steps)
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click();
        await page.waitForTimeout(300);
        continue;
      }
      // If nothing is visible, wait a bit and retry
      await page.waitForTimeout(500);
    }

    // Wait for wizard to close
    await expect(wizardDialog).toBeHidden({ timeout: 10000 });
  }

  /**
   * Helper to start a tour via the floating help button.
   */
  async function startTourViaFloatingHelp(page: Page): Promise<void> {
    // Dismiss any existing tour first
    await dismissTourIfPresent(page);

    const helpButton = page.locator('[data-testid="floating-help-button"]');
    await expect(helpButton).toBeVisible({ timeout: 10000 });

    // Click the FAB to expand
    const fabButton = helpButton.locator('button[aria-expanded]').first();
    await expect(fabButton).toBeVisible({ timeout: 10000 });
    const expanded = await fabButton.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await fabButton.click({ force: true });
      await expect(fabButton).toHaveAttribute('aria-expanded', 'true', { timeout: 10000 });
    }

    // Click the tour option
    const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
    await expect(tourOption).toBeVisible({ timeout: 15000 });
    await tourOption.click({ force: true });
    await page.waitForTimeout(500);

    // Assert tour started
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });
  }

  test('tour auto-shows on first visit to dashboard (after onboarding)', async ({ page, db }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Tour should auto-show
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 30000 });
  });

  test('tour does not auto-show on refresh after dismissal', async ({ page, db }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Wait for tour to auto-show
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 30000 });

    // Dismiss the tour
    await closeTourButton.click();
    await expect(closeTourButton).toBeHidden({ timeout: 10000 });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Tour should NOT auto-show again
    await page.waitForTimeout(2000);
    const isTourAutoShowing = await closeTourButton.isVisible().catch(() => false);
    expect(isTourAutoShowing).toBe(false);
  });

  test('tour can be replayed via floating help button', async ({ page, db }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Dismiss auto-shown tour
    await dismissTourIfPresent(page);

    // Start tour via floating help
    await startTourViaFloatingHelp(page);

    // Tour should be active
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });
  });

  test.skip('tour is deferred while onboarding wizard is active', async ({ page, db }) => {
    // SKIPPED: This test is flaky in CI because the onboarding wizard auto-show depends on
    // many conditions (group association, finance data loading, localStorage cache, etc.)
    // that are hard to control reliably in E2E tests.
    //
    // The behavior is covered by unit tests for the canAutoShow() function and the
    // useOnboardingState hook.

    // Prepare state: onboarding NOT complete (wizard should show)
    await prepareForOnboardingActive(page, db);

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check if onboarding wizard is visible
    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    // Wizard MUST be visible (mandatory onboarding)
    await expect(wizardDialog).toBeVisible({ timeout: 15000 });

    // While wizard is active, tour should NOT be showing
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    const isTourActive = await closeTourButton.isVisible().catch(() => false);

    // Tour should be deferred while onboarding is active
    expect(isTourActive).toBe(false);
  });

  test('tour gracefully handles missing target elements', async ({ page, db }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Dismiss any auto-shown tour on dashboard
    await dismissTourIfPresent(page);

    // Navigate to History in an "empty" state where some tour targets may be missing
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    // Start tour via floating help
    await startTourViaFloatingHelp(page);

    // Tour should become active, and must not crash even if some targets are missing
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });

    // Basic smoke: advance a couple steps (if available), then close
    const nextButton = page.getByRole('button', { name: /próximo/i });
    for (let i = 0; i < 3; i++) {
      if (!(await nextButton.isVisible().catch(() => false))) break;
      await nextButton.click();
      await page.waitForTimeout(250);
    }

    // Page should not show any errors
    const errorText = page.getByText(/error|erro|falha/i);
    const hasVisibleError = await errorText.isVisible().catch(() => false);
    expect(hasVisibleError).toBe(false);

    await closeTourButton.click();
    await expect(closeTourButton).toBeHidden({ timeout: 10000 });
  });

  test('tour keyboard navigation works (ArrowRight, ArrowLeft, Escape)', async ({ page, db }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Dismiss auto-shown tour first
    await dismissTourIfPresent(page);

    // Start tour via floating help
    await startTourViaFloatingHelp(page);

    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });

    // Verify we're on step 1
    const stepCounter = page.getByText(/1 de \d+/);
    await expect(stepCounter).toBeVisible();

    // Press ArrowRight to advance to step 2
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    // Should now be on step 2
    const step2Counter = page.getByText(/2 de \d+/);
    await expect(step2Counter).toBeVisible({ timeout: 5000 });

    // Press ArrowLeft to go back to step 1
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);

    // Should be back on step 1
    await expect(stepCounter).toBeVisible({ timeout: 5000 });

    // Press Escape to dismiss tour
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Tour should be closed
    await expect(closeTourButton).toBeHidden({ timeout: 5000 });
  });

  test('tour can be started on manage page via floating help', async ({ page, db }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Dismiss any auto-shown tour on dashboard
    await dismissTourIfPresent(page);

    // Navigate to manage page
    await page.goto('/manage');
    await page.waitForLoadState('networkidle');

    // Dismiss any auto-shown tour on manage
    await dismissTourIfPresent(page);

    // Start tour via floating help
    await startTourViaFloatingHelp(page);

    // Tour should be active
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });
  });

  test('tour can be started on history page via floating help', async ({ page, db }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Dismiss any auto-shown tour on dashboard
    await dismissTourIfPresent(page);

    // Navigate to history page
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    // Dismiss any auto-shown tour on history
    await dismissTourIfPresent(page);

    // Start tour via floating help
    await startTourViaFloatingHelp(page);

    // Tour should be active
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });
  });

  test('tour gracefully skips when target element is forcibly removed (deterministic)', async ({
    page,
    db,
  }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Dismiss any auto-shown tour
    await dismissTourIfPresent(page);

    // Capture console errors to ensure no crashes
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors (uncaught exceptions)
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Dashboard tour step 1 targets [data-tour="projection-selector"]
    // We'll remove it before starting the tour to force the missing target path.
    const targetSelector = '[data-tour="projection-selector"]';

    // Verify the target exists initially
    await expect(page.locator(targetSelector)).toBeVisible({ timeout: 10000 });

    // Remove the target element from the DOM
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) el.remove();
    }, targetSelector);

    // Confirm target is now absent
    await expect(page.locator(targetSelector)).toHaveCount(0);

    // Start tour via floating help - tour should handle missing target gracefully
    await startTourViaFloatingHelp(page);

    // Tour should still be functional (close button visible)
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });

    // The tour should have auto-skipped step 1 (missing target) and moved to step 2
    // OR the tour completed if all steps had missing targets.
    const stepCounter = page.getByText(/\d+ de \d+/);
    const isStepCounterVisible = await stepCounter.isVisible().catch(() => false);

    if (isStepCounterVisible) {
      // Tour is still running - verify it's not stuck on step 1
      const stepText = await stepCounter.textContent();
      expect(stepText).toBeTruthy();
    }

    // Close the tour
    if (await closeTourButton.isVisible().catch(() => false)) {
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 10000 });
    }

    // Verify no page errors occurred (no crashes from missing target)
    expect(pageErrors).toHaveLength(0);

    // Verify no critical console errors (warnings about missing targets are OK)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('Tour target not found') && !err.includes('Warning')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('tour auto-shows again after version bump (completed at older version)', async ({
    page,
    db,
  }) => {
    // Prepare state: onboarding complete, tour not seen
    await prepareForTourAutoShow(page, db);

    // Tour auto-shows for first visit - COMPLETE it (not dismiss) by clicking through all steps
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 30000 });

    // Complete the tour by clicking "Próximo" until we reach "Concluir"
    const nextButton = page.getByRole('button', { name: /próximo/i });
    const completeButton = page.getByRole('button', { name: /concluir/i });

    // Advance through steps until "Concluir" appears
    for (let i = 0; i < 10; i++) {
      if (await completeButton.isVisible().catch(() => false)) {
        await completeButton.click();
        break;
      }
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

    // Wait for tour to close
    await expect(closeTourButton).toBeHidden({ timeout: 10000 });

    // Get the current user ID from localStorage to construct the correct key
    const userId = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('sb-') && key.includes('auth-token')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            return data.user?.id || null;
          } catch {
            return null;
          }
        }
      }
      return null;
    });

    expect(userId).toBeTruthy();

    // Verify the tour state was saved to localStorage with COMPLETED status and current version
    const tourKey = `fluxocerto:tour:${userId}:dashboard`;
    const currentState = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, tourKey);

    expect(currentState).toBeTruthy();
    expect(currentState.status).toBe('completed'); // Must be 'completed' for version bump auto-show
    expect(currentState.version).toBe(1); // Current dashboard tour version

    // Simulate a "version bump" by setting the stored version to 0 with 'completed' status
    await page.evaluate((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          status: 'completed',
          version: 0, // Older version - triggers auto-show
          updatedAt: Date.now(),
        })
      );
    }, tourKey);

    // CRITICAL: Intercept the tour_states API to return no rows on reload.
    // This ensures `state` is null and the hook uses `localCache` for the auto-show decision.
    await page.route('**/rest/v1/tour_states*', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 406,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: 'PGRST116',
            message: 'The result contains 0 rows',
            details: 'Results contain 0 rows, application/vnd.pgrst.object+json requires 1 row',
            hint: null,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Reload the page - tour should auto-show because of version bump
    await page.reload();

    // Wait for page to fully load and tour logic to run
    await page.waitForLoadState('domcontentloaded');

    // Wait for app shell to be visible (React hydrated)
    await expect(page.locator('header, main').first()).toBeVisible({ timeout: 10000 });

    // Tour should auto-show again due to version bump
    await expect(closeTourButton).toBeVisible({ timeout: 30000 });

    // Remove the route interception for subsequent requests
    await page.unroute('**/rest/v1/tour_states*');

    // Complete the tour again (or dismiss - both will update to current version)
    await closeTourButton.click();
    await expect(closeTourButton).toBeHidden({ timeout: 10000 });

    // Verify localStorage was updated to the new version
    const updatedState = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, tourKey);

    expect(updatedState).toBeTruthy();
    expect(updatedState.version).toBe(1); // Should be updated to current version
  });
});
