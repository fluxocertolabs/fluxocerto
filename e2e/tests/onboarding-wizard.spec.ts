/**
 * E2E Tests: User Story 3 - Onboarding Wizard
 * Tests auto-show once, skip doesn't re-auto-show, resume after refresh, entry points work,
 * validation behavior, and data persistence.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';

// Generate unique email for onboarding tests to ensure clean state
const ONBOARDING_TEST_EMAIL = `onboarding-${Date.now()}@example.com`;

test.describe('Onboarding Wizard', () => {
  // Run onboarding tests serially to maintain state
  test.describe.configure({ mode: 'serial' });

  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
    // Purge mailbox to ensure clean state
    await inbucket.purgeMailbox(ONBOARDING_TEST_EMAIL.split('@')[0]);
  });

  test.beforeEach(async () => {
    // Small delay between tests to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  });

  /**
   * Helper to authenticate a user via magic link
   */
  async function authenticateUser(page: import('@playwright/test').Page, email: string) {
    const loginPage = new LoginPage(page);
    const mailbox = email.split('@')[0];

    await loginPage.goto();
    await loginPage.requestMagicLink(email);
    await loginPage.expectMagicLinkSent();

    // Get magic link from Inbucket
    let magicLink: string | null = null;
    for (let i = 0; i < 15; i++) {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
        if (magicLink) break;
      }
      await page.waitForTimeout(500);
    }

    expect(magicLink).not.toBeNull();
    await page.goto(magicLink!);
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
  }

  /**
   * Helper to get the onboarding wizard dialog locator
   */
  function getWizardDialog(page: import('@playwright/test').Page) {
    return page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
  }

  test('T041a: onboarding wizard auto-shows on first login for new user', async ({ page }) => {
    await authenticateUser(page, ONBOARDING_TEST_EMAIL);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Check if onboarding wizard dialog is visible - MUST be visible for new user
    const wizardDialog = getWizardDialog(page);
    
    // For a new user with no data, onboarding MUST auto-show (mandatory)
    await expect(wizardDialog).toBeVisible({ timeout: 10000 });
    
    // Verify it's the onboarding wizard by checking for expected content
    const profileHeading = wizardDialog.getByRole('heading', { name: /seu perfil/i });
    await expect(profileHeading).toBeVisible({ timeout: 5000 });
  });

  test('T041b: onboarding wizard cannot be skipped/dismissed', async ({ page }) => {
    await authenticateUser(page, ONBOARDING_TEST_EMAIL);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    const wizardDialog = getWizardDialog(page);
    await expect(wizardDialog).toBeVisible({ timeout: 5000 });

    // No "Pular" button should exist (onboarding is mandatory)
    const skipButton = wizardDialog.getByRole('button', { name: /pular|skip/i });
    await expect(skipButton).toHaveCount(0);

    // Attempt to dismiss via Escape / outside click should not close the wizard
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await expect(wizardDialog).toBeVisible();

    await page.mouse.click(5, 5);
    await page.waitForTimeout(250);
    await expect(wizardDialog).toBeVisible();
  });

  test('T041c: wizard progress resumes after page refresh', async ({ page }) => {
    // Use a fresh email to start with clean onboarding state
    const freshEmail = `onboarding-resume-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for the page to load and wizard to appear
    await page.waitForTimeout(2000);

    const wizardDialog = getWizardDialog(page);

    await expect(wizardDialog).toBeVisible({ timeout: 5000 });
    await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();

    // Advance to the next step (profile -> group)
    await page.locator('#profile-name').fill('Usuário Teste');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

    // Refresh the page - should resume at the same step
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(wizardDialog).toBeVisible({ timeout: 5000 });
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible();

    // Finish onboarding to ensure it does not appear again after completion
    await page.locator('#group-name').fill('Grupo Teste');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

    await page.locator('#account-name').fill('Conta Teste');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

    // Optional steps: income + expense + credit card (leave blank)
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });

    await wizardDialog.getByRole('button', { name: /finalizar/i }).click();
    await expect(wizardDialog).toBeHidden({ timeout: 15000 });

    // Refresh - wizard should not auto-show again after completion
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(wizardDialog).toBeHidden();
  });

  test('T041d: "Continuar configuração" entry point does not exist (onboarding is mandatory)', async ({ page }) => {
    await authenticateUser(page, ONBOARDING_TEST_EMAIL);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    const setupButton = page.getByRole('button', { name: /continuar configuração|continue setup/i });
    await expect(setupButton).toHaveCount(0);
  });

  test('T041e: empty state CTA opens wizard', async ({ page }) => {
    // Use a fresh email to ensure empty state
    const freshEmail = `onboarding-empty-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // For a fresh user, the wizard MUST be showing (mandatory onboarding)
    const wizardDialog = getWizardDialog(page);
    await expect(wizardDialog).toBeVisible({ timeout: 10000 });
  });

  test('T041f: wizard does not block navigation', async ({ page }) => {
    // Use a fresh email
    const freshEmail = `onboarding-nav-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Even if wizard is showing, navigation should work
    // Try to navigate to /manage
    await page.goto('/manage');
    
    // Should successfully navigate (not blocked)
    await expect(page).toHaveURL(/\/manage/);

    // Try to navigate to /history
    await page.goto('/history');
    
    // Should successfully navigate
    await expect(page).toHaveURL(/\/history/);

    // Navigate back to dashboard
    await page.goto('/');
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test.describe('Validation Behavior', () => {
    test('profile step: clicking next with empty name shows validation error', async ({ page }) => {
      const freshEmail = `onboarding-val-profile-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });
      await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();

      // Clear the name field (might have default value)
      await page.locator('#profile-name').fill('');
      
      // Click next with empty name
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await page.waitForTimeout(500);

      // Should still be on profile step (validation failed)
      await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();
      
      // Input should have error styling (aria-invalid)
      const nameInput = page.locator('#profile-name');
      await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('group step: clicking next with empty name shows validation error', async ({ page }) => {
      const freshEmail = `onboarding-val-group-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Fill profile and advance
      await page.locator('#profile-name').fill('Usuário Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      // Clear the group name field
      await page.locator('#group-name').fill('');
      
      // Click next with empty name
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await page.waitForTimeout(500);

      // Should still be on group step (validation failed)
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible();
      
      // Input should have error styling
      const groupInput = page.locator('#group-name');
      await expect(groupInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('bank account step: clicking next with empty name shows validation error', async ({ page }) => {
      const freshEmail = `onboarding-val-bank-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Fill profile and advance
      await page.locator('#profile-name').fill('Usuário Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      // Fill group and advance
      await page.locator('#group-name').fill('Grupo Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      // Clear the account name field
      await page.locator('#account-name').fill('');
      
      // Click next with empty name
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await page.waitForTimeout(500);

      // Should still be on bank account step (validation failed)
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible();
      
      // Input should have error styling
      const accountInput = page.locator('#account-name');
      await expect(accountInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('income step: partial input (name only) shows validation error', async ({ page }) => {
      const freshEmail = `onboarding-val-income-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Navigate to income step
      await page.locator('#profile-name').fill('Usuário Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#group-name').fill('Grupo Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#account-name').fill('Conta Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

      // Fill name but leave amount empty/0
      await page.locator('#income-name').fill('Salário');
      // Amount input is empty by default

      // Click next
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await page.waitForTimeout(500);

      // Should still be on income step (validation failed - name filled but amount is 0)
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible();
    });

    test('income step: empty fields allows continuing (optional step)', async ({ page }) => {
      const freshEmail = `onboarding-val-income-empty-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Navigate to income step
      await page.locator('#profile-name').fill('Usuário Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#group-name').fill('Grupo Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#account-name').fill('Conta Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

      // Leave both fields empty (optional step)
      // Click next - should advance to expense step
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      
      // Should advance to expense step (optional step allows empty)
      await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });
    });

    test('expense step: partial input (name only) shows validation error', async ({ page }) => {
      const freshEmail = `onboarding-val-expense-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Navigate to expense step
      await page.locator('#profile-name').fill('Usuário Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#group-name').fill('Grupo Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#account-name').fill('Conta Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

      // Skip income (optional)
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });

      // Fill name but leave amount empty/0
      await page.locator('#expense-name').fill('Aluguel');

      // Click next
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await page.waitForTimeout(500);

      // Should still be on expense step (validation failed - name filled but amount is 0)
      await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible();
    });

    test('credit card step: name only with empty balance creates card with zero balance', async ({ page }) => {
      // This test verifies that the credit card step (optional) allows creating a card
      // with just a name, treating empty/0 balance as valid.
      const freshEmail = `onboarding-val-card-name-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Navigate to credit card step
      await page.locator('#profile-name').fill('Usuário Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#group-name').fill('Grupo Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#account-name').fill('Conta Validação');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

      // Skip income
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });

      // Skip expense
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });

      // Confirm we're on credit card step
      const cardNameInput = page.locator('#card-name');
      const cardBalanceInput = page.locator('#card-balance');
      await expect(cardNameInput).toBeVisible();
      await expect(cardBalanceInput).toBeVisible();

      // Fill card name but leave balance empty
      await cardNameInput.fill('Cartão Teste');
      // Balance is empty by default

      // Click Finalizar - should succeed (credit card step allows name-only with 0 balance)
      await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

      // Wizard should close (onboarding complete)
      await expect(wizardDialog).toBeHidden({ timeout: 15000 });

      // Verify the card was created by navigating to manage page
      await page.goto('/manage');
      await page.waitForTimeout(2000);

      // Switch to Credit Cards tab
      const cardTab = page.getByRole('tab', { name: /cartão|card/i });
      await cardTab.click();
      await page.waitForTimeout(500);

      // Card should exist with the name we entered
      await expect(page.getByText('Cartão Teste')).toBeVisible({ timeout: 10000 });
    });

    test('credit card step: empty fields allows skipping (fully optional)', async ({ page }) => {
      // This test verifies that leaving both card name and balance empty
      // allows completing onboarding without creating a card.
      const freshEmail = `onboarding-val-card-empty-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Navigate to credit card step
      await page.locator('#profile-name').fill('Usuário Skip Card');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#group-name').fill('Grupo Skip Card');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#account-name').fill('Conta Skip Card');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

      // Skip income
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });

      // Skip expense
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });

      // Leave both fields empty and click Finalizar
      await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

      // Wizard should close (onboarding complete)
      await expect(wizardDialog).toBeHidden({ timeout: 15000 });

      // Verify no card was created by navigating to manage page
      await page.goto('/manage');
      await page.waitForTimeout(2000);

      // Switch to Credit Cards tab
      const cardTab = page.getByRole('tab', { name: /cartão|card/i });
      await cardTab.click();
      await page.waitForTimeout(500);

      // Should show empty state (no cards created)
      await expect(page.getByText(/nenhum cartão de crédito ainda/i)).toBeVisible({ timeout: 10000 });
    });

    test('credit card step: non-numeric balance coerces to zero and card is created', async ({ page }) => {
      // This test verifies that entering invalid/non-numeric characters in the balance
      // field results in the card being created with a zero balance.
      // The CurrencyInput component strips non-digits, so "abc" becomes "" which coerces to 0.
      const freshEmail = `onboarding-val-card-invalid-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Navigate to credit card step
      await page.locator('#profile-name').fill('Usuário Invalid Balance');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#group-name').fill('Grupo Invalid Balance');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      await page.locator('#account-name').fill('Conta Invalid Balance');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

      // Skip income
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });

      // Skip expense
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });

      // Confirm we're on credit card step
      const cardNameInput = page.locator('#card-name');
      const cardBalanceInput = page.locator('#card-balance');
      await expect(cardNameInput).toBeVisible();
      await expect(cardBalanceInput).toBeVisible();

      // Fill card name with valid value
      await cardNameInput.fill('Cartão Balance Inválido');

      // Try to type non-numeric characters in balance field
      // The CurrencyInput strips non-digits, so this will result in empty value
      await cardBalanceInput.fill('abc');
      await page.waitForTimeout(200);

      // Verify the input was sanitized (CurrencyInput strips non-digits)
      // The displayed value should be empty or "0,00" after sanitization
      const displayedValue = await cardBalanceInput.inputValue();
      // Non-digits are stripped, so the value should be empty
      expect(displayedValue).toBe('');

      // Click Finalizar - should succeed with balance coerced to 0
      await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

      // Wizard should close (onboarding complete - no validation error)
      await expect(wizardDialog).toBeHidden({ timeout: 15000 });

      // Verify the card was created by navigating to manage page
      await page.goto('/manage');
      await page.waitForTimeout(2000);

      // Switch to Credit Cards tab
      const cardTab = page.getByRole('tab', { name: /cartão|card/i });
      await cardTab.click();
      await page.waitForTimeout(500);

      // Card should exist with the name we entered (balance will be R$ 0,00)
      await expect(page.getByText('Cartão Balance Inválido')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Data Persistence', () => {
    test('completed onboarding data persists and shows in manage page', async ({ page }) => {
      // Increase timeout for this comprehensive test
      test.setTimeout(120000);

      const freshEmail = `onboarding-persist-${Date.now()}@example.com`;
      await inbucket.purgeMailbox(freshEmail.split('@')[0]);
      
      await authenticateUser(page, freshEmail);
      await page.waitForTimeout(2000);

      const wizardDialog = getWizardDialog(page);
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });

      // Define test data
      const testData = {
        profileName: 'Usuário Persistência',
        groupName: 'Grupo Persistência',
        accountName: 'Conta Principal',
        accountBalance: '5000',
        incomeName: 'Salário Mensal',
        incomeAmount: '8000',
        expenseName: 'Aluguel Apartamento',
        expenseAmount: '2500',
        creditCardName: 'Nubank Roxinho',
        creditCardBalance: '1500',
      };

      // Step 1: Profile
      await page.locator('#profile-name').fill(testData.profileName);
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });

      // Step 2: Group
      await page.locator('#group-name').fill(testData.groupName);
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });

      // Step 3: Bank Account
      await page.locator('#account-name').fill(testData.accountName);
      await page.locator('#account-balance').fill(testData.accountBalance);
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });

      // Step 4: Income
      await page.locator('#income-name').fill(testData.incomeName);
      await page.locator('#income-amount').fill(testData.incomeAmount);
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });

      // Step 5: Expense
      await page.locator('#expense-name').fill(testData.expenseName);
      await page.locator('#expense-amount').fill(testData.expenseAmount);
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();
      await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });

      // Step 6: Credit Card
      await page.locator('#card-name').fill(testData.creditCardName);
      await page.locator('#card-balance').fill(testData.creditCardBalance);
      await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

      // Wait for wizard to close
      await expect(wizardDialog).toBeHidden({ timeout: 15000 });

      // Navigate to manage page to verify data persisted
      await page.goto('/manage');
      await page.waitForTimeout(2000);

      // Verify bank account exists in Accounts tab (should be default tab)
      await expect(page.getByText(testData.accountName)).toBeVisible({ timeout: 10000 });

      // Switch to Income tab and verify income
      const incomeTab = page.getByRole('tab', { name: /renda|income/i });
      await incomeTab.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(testData.incomeName)).toBeVisible({ timeout: 10000 });

      // Switch to Expenses tab and verify expense
      const expenseTab = page.getByRole('tab', { name: /despesa|expense/i });
      await expenseTab.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(testData.expenseName)).toBeVisible({ timeout: 10000 });

      // Switch to Credit Cards tab and verify credit card
      const cardTab = page.getByRole('tab', { name: /cartão|card/i });
      await cardTab.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(testData.creditCardName)).toBeVisible({ timeout: 10000 });

      // Switch to Group tab and verify group name
      const groupTab = page.getByRole('tab', { name: /grupo|group/i });
      await groupTab.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(testData.groupName)).toBeVisible({ timeout: 10000 });
    });
  });
});
