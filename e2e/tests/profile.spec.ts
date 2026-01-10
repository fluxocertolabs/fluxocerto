/**
 * E2E Tests: User Story 3 - Profile Settings
 * Tests profile page, display name update, email read-only, and email notifications toggle
 */

import { test, expect } from '../fixtures/test-base';

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ db }) => {
    // Clear any existing preferences for clean state
    await db.resetDatabase();
  });

  test('/profile is reachable from navigation', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    // Find and click the Profile nav link
    const profileLink = page.getByRole('link', { name: /perfil/i });
    await expect(profileLink).toBeVisible({ timeout: 10000 });
    await profileLink.click();

    // Verify we're on the profile page
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /perfil/i })).toBeVisible();
  });

  test('email is shown read-only with explanatory pt-BR hint', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find the email input (use exact match to avoid matching email notifications toggle)
    const emailInput = page.getByRole('textbox', { name: /^email$/i });
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Verify it's disabled
    await expect(emailInput).toBeDisabled();

    // Verify the hint text is present (pt-BR) - use the specific hint below the email input
    const hint = page.locator('#email-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText(/não pode ser alterado/i);
  });

  test('updating display name persists across reload', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find the name input
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Clear and enter new name
    const newName = 'Teste E2E Nome ' + Date.now();
    await nameInput.clear();
    await nameInput.fill(newName);

    // Click save button
    const saveButton = page.getByRole('button', { name: /salvar nome/i });
    await saveButton.click();

    // Wait for save confirmation
    const savedIndicator = page.getByText(/salvo/i);
    await expect(savedIndicator).toBeVisible({ timeout: 5000 });

    // Reload and verify name persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    const nameInputAfterReload = page.getByLabel(/nome/i);
    await expect(nameInputAfterReload).toHaveValue(newName);
  });

  test('toggling email notifications persists across reload', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find the email notifications toggle
    const toggle = page.getByRole('switch', { name: /ativar notificações por email/i });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // Get initial state
    const initialState = await toggle.getAttribute('aria-checked');

    // Toggle it
    await toggle.click();
    await page.waitForTimeout(1000);

    // Verify state changed
    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);

    // Reload and verify state persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    const toggleAfterReload = page.getByRole('switch', { name: /ativar notificações por email/i });
    await expect(toggleAfterReload).toHaveAttribute('aria-checked', newState!);
  });

  test('email notifications defaults to enabled when no preference row exists', async ({
    page,
    dashboardPage,
    db,
  }) => {
    // Ensure no user preferences exist (clean state)
    await db.resetDatabase();

    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find the email notifications toggle
    const toggle = page.getByRole('switch', { name: /ativar notificações por email/i });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // Should default to enabled (checked)
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('name validation shows error for empty name', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find the name input
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Clear the name
    await nameInput.clear();

    // Click save button
    const saveButton = page.getByRole('button', { name: /salvar nome/i });
    await saveButton.click();

    // Verify error message is shown
    const errorMessage = page.getByText(/nome é obrigatório/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

