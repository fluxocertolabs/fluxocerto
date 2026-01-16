/**
 * Stable helpers for interacting with the Floating Help button and page tours.
 *
 * The Floating Help component has different behaviors on desktop vs mobile:
 * - Desktop (hover-capable): hovering the container opens the menu
 * - Mobile (touch): clicking the inner FAB button toggles the menu
 *
 * These helpers abstract those differences and use proper assertion-based waits
 * to avoid flaky tests caused by fixed timeouts or clicking the wrong element.
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Get the Floating Help container element.
 * This is the outer wrapper - do NOT click it directly on mobile.
 */
export function getFloatingHelpContainer(page: Page): Locator {
  return page.getByTestId('floating-help-button');
}

/**
 * Get the inner FAB button that toggles the menu.
 * This is the actual clickable button with aria-expanded.
 */
export function getFloatingHelpFAB(page: Page): Locator {
  return getFloatingHelpContainer(page).getByRole('button', { name: /abrir ajuda|ajuda \(aberta\)/i });
}

/**
 * Get the "Start Tour" option button from the expanded menu.
 */
export function getTourOptionButton(page: Page): Locator {
  return page.getByRole('button', { name: /iniciar tour guiado/i });
}

/**
 * Get the "Chat with Support" option button from the expanded menu.
 */
export function getChatOptionButton(page: Page): Locator {
  return page.getByRole('button', { name: /falar com suporte|abrir chat de suporte/i });
}

/**
 * Get the "Suggest Improvements" (Canny feedback) option button from the expanded menu.
 */
export function getFeedbackOptionButton(page: Page): Locator {
  return page.getByRole('button', { name: /sugerir melhorias/i });
}

/**
 * Get the "Close Tour" button that appears during an active tour.
 */
export function getCloseTourButton(page: Page): Locator {
  return page.getByRole('button', { name: /fechar tour/i });
}

/**
 * Check if the device supports hover (desktop) or is touch-only (mobile).
 * Uses the browser's media queries for accurate detection (matches app behavior).
 */
async function isHoverCapable(page: Page): Promise<boolean> {
  // Match the app's own heuristic: hover + fine pointer indicates mouse/trackpad.
  // This avoids flakes where Playwright uses a mouse to click in a touch context,
  // which can trigger hover handlers and instantly animate elements off-screen
  // (visual tests set animation durations to 0ms).
  return await page
    .evaluate(() => {
      const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)');
      return mq ? mq.matches : true;
    })
    .catch(() => true);
}

/**
 * Open the Floating Help menu deterministically.
 *
 * - On desktop (hover-capable): hovers the container to trigger the menu
 * - On mobile (touch): taps the inner FAB button
 *
 * Waits for the menu to be fully expanded before returning.
 */
export async function openFloatingHelpMenu(page: Page): Promise<void> {
  const container = getFloatingHelpContainer(page);
  const fab = getFloatingHelpFAB(page);

  // Ensure the help button is visible first
  await expect(container).toBeVisible({ timeout: 10000 });

  const hoverCapable = await isHoverCapable(page);

  if (hoverCapable) {
    // Desktop: hover the container to open menu
    await container.hover();
  } else {
    // Touch/mobile: use a tap to avoid mouse hover side-effects.
    // IMPORTANT: When the menu is open, the FAB is intentionally animated off-screen
    // and has `pointer-events: none`, so never try to click it if already expanded.
    await expect(async () => {
      const expanded = (await fab.getAttribute('aria-expanded')) === 'true';
      if (expanded) {
        return;
      }

      await fab.scrollIntoViewIfNeeded();
      await fab.tap({ timeout: 2000 });

      const nowExpanded = (await fab.getAttribute('aria-expanded')) === 'true';
      if (!nowExpanded) {
        throw new Error('Floating help menu not expanded yet');
      }
    }).toPass({ timeout: 10000, intervals: [250, 500, 1000, 2000] });
  }

  // Wait for menu to be expanded
  await expect(fab).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });

  // Also verify at least one option is visible (menu content is rendered)
  // Feedback option is always visible, so we can just wait for that
  const feedbackOption = getFeedbackOptionButton(page);
  await expect(feedbackOption).toBeVisible({ timeout: 5000 });
}

/**
 * Close the Floating Help menu if it's open.
 *
 * - On desktop: moves mouse away from the container
 * - On mobile: clicks the FAB button to toggle closed
 */
export async function closeFloatingHelpMenu(page: Page): Promise<void> {
  const fab = getFloatingHelpFAB(page);

  // Check if menu is currently open
  const isExpanded = await fab.getAttribute('aria-expanded');
  if (isExpanded !== 'true') {
    return; // Already closed
  }

  const hoverCapable = await isHoverCapable(page);

  if (hoverCapable) {
    // Desktop: move mouse away to close
    await page.mouse.move(0, 0);
  } else {
    // Mobile: click FAB to toggle closed
    await fab.click();
  }

  // Wait for menu to close
  await expect(fab).toHaveAttribute('aria-expanded', 'false', { timeout: 5000 });
}

/**
 * Start the page tour via the Floating Help menu.
 *
 * This helper:
 * 1. Opens the Floating Help menu (hover or click depending on device)
 * 2. Clicks the "Start Tour" option
 * 3. Waits for the tour to begin (tour overlay becomes visible)
 */
export async function startTourViaFloatingHelp(page: Page): Promise<void> {
  // Open the menu first
  await openFloatingHelpMenu(page);

  // Click the tour option
  const tourOption = getTourOptionButton(page);
  await tourOption.click();

  // Wait for tour to start - the close tour button should appear
  const closeTourBtn = getCloseTourButton(page);
  await expect(closeTourBtn).toBeVisible({ timeout: 5000 });
}

/**
 * Dismiss a tour if it's currently showing.
 * Returns true if a tour was dismissed, false if no tour was active.
 *
 * @param waitForTour - If true, waits briefly for a tour to potentially appear
 */
export async function dismissTourIfPresent(page: Page, waitForTour: boolean = true): Promise<boolean> {
  const closeTourButton = getCloseTourButton(page);

  if (waitForTour) {
    try {
      await expect(closeTourButton).toBeVisible({ timeout: 3000 });
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
      return true;
    } catch {
      // Tour didn't appear, that's fine
      return false;
    }
  }

  // Immediate check without waiting
  const isVisible = await closeTourButton.isVisible().catch(() => false);

  if (isVisible) {
    await closeTourButton.click();
    await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    return true;
  }

  return false;
}

/**
 * Wait for the Floating Help button to be ready (page is fully interactive).
 */
export async function waitForFloatingHelp(page: Page): Promise<void> {
  const container = getFloatingHelpContainer(page);
  await expect(container).toBeVisible({ timeout: 10000 });
}

/**
 * Advance to the next step in an active tour.
 * Clicks the "Next" button in the tour tooltip.
 */
export async function advanceTourStep(page: Page): Promise<void> {
  const nextButton = page.getByRole('button', { name: /próximo|avançar|next/i });
  await expect(nextButton).toBeVisible({ timeout: 5000 });
  await nextButton.click();
}

/**
 * Close the tour by clicking the close button.
 */
export async function closeTour(page: Page): Promise<void> {
  const closeTourButton = getCloseTourButton(page);
  await expect(closeTourButton).toBeVisible({ timeout: 5000 });
  await closeTourButton.click();
  await expect(closeTourButton).toBeHidden({ timeout: 5000 });
}

