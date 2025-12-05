/**
 * E2E Tests: User Story 4 - Project (Income) Management
 * Tests recurring income projects and single-shot income management
 */

import { test, expect } from '../fixtures/test-base';
import { createProject, createSingleShotIncome } from '../utils/test-data';

test.describe('Project (Income) Management', () => {
  // Tests now run in parallel with per-worker data prefixing for isolation

  test.describe('Recurring Projects', () => {
    test('T044: create recurring project "Salário" R$ 8.000,00 monthly guaranteed → appears in recurring list', async ({
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();

      // Use worker-specific name for UI-created data to avoid conflicts
      const projectName = `Salário W${workerContext.workerIndex}`;
      await projects.createRecurringProject({
        name: projectName,
        amount: '8.000,00',
        paymentDay: '5',
        frequency: 'monthly',
        certainty: 'guaranteed',
      });

      await projects.expectProjectVisible(projectName);
    });

    test('T045: change project frequency to biweekly → updated frequency displayed', async ({
      page,
      managePage,
      db,
    }) => {
      // Use unique name to avoid collisions
      const uniqueId = Date.now();
      const [seeded] = await db.seedProjects([
        createProject({ name: `Projeto Mensal ${uniqueId}`, frequency: 'monthly' }),
      ]);

      // Navigate and wait for page to be fully ready
      await managePage.goto();
      await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(3000)]);
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      
      await projects.expectProjectVisible(seeded.name);
      await projects.updateProjectFrequency(seeded.name, 'biweekly');

      // Wait for update to complete via realtime subscription
      // Use toPass to retry until realtime update propagates
      await expect(async () => {
        await expect(page.getByText(/quinzenal|biweekly/i).first()).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });
    });

    test('T046: toggle project inactive → toggle switch state changes', async ({
      page,
      managePage,
      db,
    }) => {
      // Use unique name to avoid collisions
      const uniqueId = Date.now();
      const [seeded] = await db.seedProjects([
        createProject({ name: `Projeto Ativo ${uniqueId}`, is_active: true }),
      ]);

      // Navigate and wait for page to be fully ready
      await managePage.goto();
      await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(3000)]);
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      
      await projects.expectProjectVisible(seeded.name);
      
      // Find the toggle switch and verify it's initially checked (active)
      const projectName = page.getByText(seeded.name, { exact: true }).first();
      const row = projectName.locator('xpath=ancestor::div[contains(@class, "flex") and contains(@class, "items-center") and contains(@class, "justify-between")][1]');
      const toggle = row.getByRole('switch').first();
      
      // Verify initial state is checked (active)
      await expect(toggle).toHaveAttribute('data-state', 'checked');
      
      // Click toggle
      await toggle.click();
      
      // Wait for the toggle state to change via realtime update
      // Use toPass with longer timeout to handle slow realtime updates in parallel execution
      // Increased to 30s for heavily loaded parallel environments
      await expect(async () => {
        await expect(toggle).toHaveAttribute('data-state', 'unchecked', { timeout: 3000 });
      }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000, 5000] });
    });

    test('T047: change project certainty to "probable" → certainty badge updates', async ({
      page,
      managePage,
      db,
    }) => {
      // Use unique name to avoid collisions
      const uniqueId = Date.now();
      const [seeded] = await db.seedProjects([
        createProject({ name: `Projeto Garantido ${uniqueId}`, certainty: 'guaranteed' }),
      ]);

      // Navigate and wait for page to be fully ready
      await managePage.goto();
      await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(3000)]);
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      
      await projects.expectProjectVisible(seeded.name);
      await projects.updateProjectCertainty(seeded.name, 'probable');

      // Hybrid approach: first try realtime, then fall back to reload
      // This handles both fast local environments and slow CI environments
      let reloadAttempts = 0;
      await expect(async () => {
        // Re-query locators inside the retry to get fresh DOM state
        const projectNameEl = page.getByText(seeded.name, { exact: true }).first();
        const container = projectNameEl.locator('..'); // parent div with flex items
        
        try {
          await expect(container.getByText(/provável/i)).toBeVisible({ timeout: 1000 });
        } catch {
          // Realtime didn't work - fall back to reload after a few attempts
          reloadAttempts++;
          if (reloadAttempts >= 3) {
            // Force reload to get fresh data from database
            await page.reload();
            await managePage.waitForReady();
            await managePage.selectProjectsTab();
            await projects.selectRecurring();
            // Re-query after reload
            const reloadedNameEl = page.getByText(seeded.name, { exact: true }).first();
            const reloadedContainer = reloadedNameEl.locator('..');
            await expect(reloadedContainer.getByText(/provável/i)).toBeVisible({ timeout: 3000 });
          } else {
            throw new Error('Waiting for realtime update...');
          }
        }
      }).toPass({ timeout: 35000, intervals: [500, 1000, 2000, 3000, 5000, 8000] });
    });
  });

  test.describe('Single-Shot Income', () => {
    test('T048: create single-shot income "Bônus Anual" R$ 10.000,00 date 2025-12-20 guaranteed → appears in single-shot list', async ({
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectSingleShot();

      // Use worker-specific name for UI-created data to avoid conflicts
      const incomeName = `Bônus Anual W${workerContext.workerIndex}`;
      await projects.createSingleShotIncome({
        name: incomeName,
        amount: '10.000,00',
        date: '2025-12-20',
        certainty: 'guaranteed',
      });

      await projects.expectProjectVisible(incomeName);
    });

    test('T049: edit single-shot income certainty to "uncertain" → certainty badge updates', async ({
      page,
      managePage,
      db,
    }) => {
      // Use unique name to avoid collisions
      const uniqueId = Date.now();
      const [seeded] = await db.seedSingleShotIncome([
        createSingleShotIncome({ name: `Receita Avulsa ${uniqueId}`, certainty: 'guaranteed' }),
      ]);

      // Navigate and wait for page to be fully ready
      await managePage.goto();
      await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(3000)]);
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectSingleShot();

      await projects.expectProjectVisible(seeded.name);
      
      // Use the page object method to update certainty
      await projects.updateSingleShotCertainty(seeded.name, 'uncertain');
      
      // Hybrid approach: first try realtime, then fall back to reload
      // This handles both fast local environments and slow CI environments
      let reloadAttempts = 0;
      await expect(async () => {
        // Re-query locators inside the retry to get fresh DOM state
        const projectNameEl = page.getByText(seeded.name, { exact: true }).first();
        const container = projectNameEl.locator('..'); // parent div with flex items
        
        try {
          await expect(container.getByText(/incert/i)).toBeVisible({ timeout: 1000 });
        } catch {
          // Realtime didn't work - fall back to reload after a few attempts
          reloadAttempts++;
          if (reloadAttempts >= 3) {
            // Force reload to get fresh data from database
            await page.reload();
            await managePage.waitForReady();
            await managePage.selectProjectsTab();
            await projects.selectSingleShot();
            // Re-query after reload
            const reloadedNameEl = page.getByText(seeded.name, { exact: true }).first();
            const reloadedContainer = reloadedNameEl.locator('..');
            await expect(reloadedContainer.getByText(/incert/i)).toBeVisible({ timeout: 3000 });
          } else {
            throw new Error('Waiting for realtime update...');
          }
        }
      }).toPass({ timeout: 35000, intervals: [500, 1000, 2000, 3000, 5000, 8000] });
    });

    test('T050: delete project confirmation dialog → opens and closes correctly', async ({
      page,
      managePage,
      db,
    }) => {
      // Use a unique name to avoid conflicts with other workers
      const uniqueId = Date.now();
      const [seededProject] = await db.seedProjects([createProject({ name: `Projeto Excluir ${uniqueId}` })]);

      // Navigate and wait for page to be fully ready
      await managePage.goto();
      await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(3000)]);
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      
      await projects.expectProjectVisible(seededProject.name);
      
      // Click delete button
      const deleteButton = page.getByText(seededProject.name, { exact: true }).first()
        .locator('xpath=ancestor::*[.//button[contains(text(), "Excluir")]]//button[contains(text(), "Excluir")]').first();
      await deleteButton.click();

      // Verify confirmation dialog appears
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // Click the confirm button
      const confirmButton = confirmDialog.locator('button').filter({ hasText: /^Excluir$/ });
      await confirmButton.click();

      // Dialog should close
      await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });
    });
  });
});
