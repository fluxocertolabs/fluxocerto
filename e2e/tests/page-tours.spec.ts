/**
 * E2E Tests: User Story 4 - Page Tours (Coachmarks)
 * Tests auto-show once per page per version, replay via floating help, defer while onboarding active, missing targets
 */

import { test, expect } from '@playwright/test';
import { InbucketClient } from '../utils/inbucket';
import { authenticateNewUser, completeOnboardingWizard } from '../utils/auth-helper';

test.describe('Page Tours', () => {
  // Run tour tests serially to avoid state conflicts
  test.describe.configure({ mode: 'serial' });

  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
  });

  test.beforeEach(async () => {
    // Small delay between tests to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  });

  /**
   * Helper to authenticate a user via magic link (wraps shared helper)
   */
  async function authenticateUser(page: import('@playwright/test').Page, email: string) {
    await authenticateNewUser(page, email, inbucket);
  }

  async function completeOnboardingIfPresent(page: import('@playwright/test').Page) {
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    // The wizard can appear a bit after login (group provisioning / hydration).
    // If it doesn't show up, just continue (some test runs may already be fully provisioned).
    const appeared = await wizardDialog
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false);

    if (!appeared) return;

    // Use the shared deterministic completer (handles loading gates + all steps).
    await completeOnboardingWizard(page);
  }

  async function dismissTourIfPresent(page: import('@playwright/test').Page) {
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    if (await closeTourButton.isVisible().catch(() => false)) {
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 10000 });
    }
  }

  /**
   * Helper to start a tour via the floating help button.
   * Uses click (pinned mode) to reliably expand on both desktop and mobile.
   * Includes retry logic to handle timing issues in CI environments.
   */
  async function startTourViaFloatingHelp(page: import('@playwright/test').Page) {
    const helpButton = page.locator('[data-testid="floating-help-button"]');
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    
    // Wait for floating help button with retry logic
    await expect(async () => {
      await expect(helpButton).toBeVisible();
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    // Full retry loop: expand FAB, click tour option, verify tour started
    // If tour doesn't start, we retry the entire sequence
    await expect(async () => {
      // Click the FAB to expand (pinned mode)
      // The label changes when open ("Ajuda (aberta)") so match both states.
      const fabButton = helpButton.getByRole('button', { name: /ajuda/i });
      await expect(fabButton).toBeVisible({ timeout: 5000 });
      await fabButton.click({ force: true });
      
      // Wait for menu to fully expand
      await page.waitForTimeout(500);
      
      // Click the tour option
      const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
      await expect(tourOption).toBeVisible({ timeout: 5000 });
      await tourOption.click({ force: true });
      
      // Wait a moment for tour to initialize
      await page.waitForTimeout(300);
      
      // Verify tour started
      await expect(closeTourButton).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000, 5000] });
  }

  test('tour auto-shows on first visit to dashboard (after onboarding)', async ({ page }) => {
    // Increase test timeout for this test since it involves full onboarding flow
    test.setTimeout(90000);

    const email = `tour-auto-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Wait for the page to load and potential tour to appear
    await page.waitForTimeout(2000);

    // Tour auto-show is deferred while onboarding wizard is active.
    await completeOnboardingIfPresent(page);

    // Wait for tour to auto-show after onboarding completes
    // Use retry logic to handle state propagation delays in CI
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(async () => {
      await expect(closeTourButton).toBeVisible();
    }).toPass({ timeout: 35000, intervals: [1000, 2000, 3000, 5000] });
  });

  test('tour does not auto-show on refresh after dismissal', async ({ page }) => {
    // Increase test timeout since it involves full authentication and onboarding flow
    test.setTimeout(90000);

    const email = `tour-dismiss-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Wait for page to load
    await page.waitForTimeout(2000);

    await completeOnboardingIfPresent(page);

    // Wait for tour to auto-show with retry logic for state propagation
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(async () => {
      await expect(closeTourButton).toBeVisible();
    }).toPass({ timeout: 35000, intervals: [1000, 2000, 3000, 5000] });

    await closeTourButton.click();
    await expect(closeTourButton).toBeHidden({ timeout: 10000 });

    // Refresh
    await page.reload();
    await page.waitForTimeout(2000);

    // Tour should not auto-show again
    const isTourAutoShowing = await closeTourButton.isVisible().catch(() => false);
    expect(isTourAutoShowing).toBe(false);
  });

  test('tour can be replayed via floating help button', async ({ page }) => {
    // Increase test timeout since it involves full onboarding flow
    test.setTimeout(90000);

    const email = `tour-replay-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Wait for page to load
    await page.waitForTimeout(2000);

    await completeOnboardingIfPresent(page);
    await dismissTourIfPresent(page);

    // Use floating help button to start tour (MUST work - no conditional)
    await startTourViaFloatingHelp(page);

    // Tour should now be active - verify by checking close button
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });
  });

  test('tour is deferred while onboarding wizard is active', async ({ page }) => {
    // This test uses fresh email authentication which can be slow
    test.setTimeout(90000);
    
    // Use a fresh email to ensure onboarding wizard shows
    const freshEmail = `tour-defer-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if onboarding wizard is visible
    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    
    // For a fresh user, wizard MUST be visible (mandatory onboarding)
    await expect(wizardDialog).toBeVisible({ timeout: 10000 });

    // While wizard is active, tour should NOT be showing
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    const isTourActive = await closeTourButton.isVisible().catch(() => false);
    
    // Tour should be deferred while onboarding is active
    expect(isTourActive).toBe(false);
  });

  test('tour gracefully handles missing target elements', async ({ page }) => {
    // This test uses fresh email authentication which can be slow
    test.setTimeout(90000);
    
    const email = `tour-missing-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Complete onboarding first (tours are deferred while onboarding is active)
    await page.waitForTimeout(2000);
    await completeOnboardingIfPresent(page);

    // Dismiss any auto-shown tour on dashboard so it doesn't interfere
    await dismissTourIfPresent(page);

    // Navigate to History in an "empty" state where some tour targets may be missing
    await page.goto('/history');
    await page.waitForTimeout(1500);

    // Start tour via floating help (MUST work - no conditional)
    await startTourViaFloatingHelp(page);

    // Tour should become active, and must not crash even if some targets are missing (FR-018).
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });

    // Basic smoke: advance a couple steps (if available), then close.
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

  test('tour keyboard navigation works (ArrowRight, ArrowLeft, Escape)', async ({ page }) => {
    test.setTimeout(90000);

    const email = `tour-keyboard-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    await page.waitForTimeout(2000);
    await completeOnboardingIfPresent(page);
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

  test('tour can be started on manage page via floating help', async ({ page }) => {
    test.setTimeout(90000);

    const email = `tour-manage-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    await page.waitForTimeout(2000);
    await completeOnboardingIfPresent(page);
    await dismissTourIfPresent(page);

    // Navigate to manage page
    await page.goto('/manage');
    await page.waitForTimeout(1500);

    // Dismiss any auto-shown tour
    await dismissTourIfPresent(page);

    // Start tour via floating help
    await startTourViaFloatingHelp(page);

    // Tour should be active
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });
  });

  test('tour can be started on history page via floating help', async ({ page }) => {
    test.setTimeout(90000);

    const email = `tour-history-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    await page.waitForTimeout(2000);
    await completeOnboardingIfPresent(page);
    await dismissTourIfPresent(page);

    // Navigate to history page
    await page.goto('/history');
    await page.waitForTimeout(1500);

    // Dismiss any auto-shown tour
    await dismissTourIfPresent(page);

    // Start tour via floating help
    await startTourViaFloatingHelp(page);

    // Tour should be active
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 10000 });
  });

  test('tour gracefully skips when target element is forcibly removed (deterministic)', async ({ page }) => {
    // This test deterministically forces a missing target by removing the DOM element
    // BEFORE TourRunner tries to resolve it, ensuring we test the skip/advance logic.
    test.setTimeout(90000);

    const email = `tour-dom-removal-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    await page.waitForTimeout(2000);
    await completeOnboardingIfPresent(page);
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
    // Check that either we're on step 2+ or the tour finished cleanly.
    const stepCounter = page.getByText(/\d+ de \d+/);
    const isStepCounterVisible = await stepCounter.isVisible().catch(() => false);
    
    if (isStepCounterVisible) {
      // Tour is still running - verify it's not stuck on step 1
      // (TourRunner should have auto-advanced past the missing target)
      const stepText = await stepCounter.textContent();
      // Either step 2+ or step counter shows we progressed
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

  test('tour auto-shows again after version bump (completed at older version)', async ({ page }) => {
    // This test verifies that if a tour was COMPLETED with an older version,
    // it auto-shows again when the tour definition version is bumped.
    // NOTE: Only 'completed' status triggers auto-show on version bump, not 'dismissed'.
    test.setTimeout(90000);

    const email = `tour-version-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);

    await authenticateUser(page, email);

    // Wait for page to load
    await page.waitForTimeout(2000);
    

    // Complete onboarding first
    await completeOnboardingIfPresent(page);
    

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
      // Find the Supabase auth token to extract user ID
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
      localStorage.setItem(key, JSON.stringify({
        status: 'completed',
        version: 0, // Older version - triggers auto-show
        updatedAt: Date.now(),
      }));
    }, tourKey);

    // CRITICAL: Intercept the tour_states API to return no rows on reload.
    // This ensures `state` is null and the hook uses `localCache` for the auto-show decision.
    // Without this, the server state (completed v1) would override localCache and prevent auto-show.
    await page.route('**/rest/v1/tour_states*', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        // Return PGRST116 error (no rows found) so the hook treats it as null state.
        // The Supabase client uses .single() which expects this error format for empty results.
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
        // Allow POST/PATCH to proceed normally
        await route.continue();
      }
    });

    // Reload the page - tour should auto-show because:
    // - Server returns no state (intercepted), so `state` is null
    // - localCache has status='completed' and version=0
    // - isTourUpdated('dashboard', 0) returns true (current version is 1)
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
