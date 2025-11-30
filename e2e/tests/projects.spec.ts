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
      const [seeded] = await db.seedProjects([
        createProject({ name: 'Projeto Mensal', frequency: 'monthly' }),
      ]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await page.waitForTimeout(500);
      
      await projects.expectProjectVisible(seeded.name);
      await projects.updateProjectFrequency(seeded.name, 'biweekly');

      // Wait for update to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Verify frequency is updated
      await expect(page.getByText(/quinzenal|biweekly/i).first()).toBeVisible();
    });

    test('T046: toggle project inactive → toggle switch state changes', async ({
      page,
      managePage,
      db,
    }) => {
      const [seeded] = await db.seedProjects([
        createProject({ name: 'Projeto Ativo', is_active: true }),
      ]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await page.waitForTimeout(500);
      
      await projects.expectProjectVisible(seeded.name);
      
      // Find the toggle switch and verify it's initially checked (active)
      const projectName = page.getByText(seeded.name, { exact: true }).first();
      const row = projectName.locator('xpath=ancestor::div[contains(@class, "flex") and contains(@class, "items-center") and contains(@class, "justify-between")][1]');
      const toggle = row.getByRole('switch').first();
      
      // Verify initial state is checked (active)
      await expect(toggle).toHaveAttribute('data-state', 'checked');
      
      // Click toggle
      await toggle.click();
      await page.waitForTimeout(500);
      
      // Verify state changed to unchecked (inactive)
      await expect(toggle).toHaveAttribute('data-state', 'unchecked');
    });

    test('T047: change project certainty to "probable" → certainty badge updates', async ({
      page,
      managePage,
      db,
    }) => {
      const [seeded] = await db.seedProjects([
        createProject({ name: 'Projeto Garantido', certainty: 'guaranteed' }),
      ]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await page.waitForTimeout(500);
      
      await projects.expectProjectVisible(seeded.name);
      await projects.updateProjectCertainty(seeded.name, 'probable');

      // Wait for update to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Verify certainty badge is updated - look for "Provável" text anywhere on the page
      await expect(page.getByText(/provável/i).first()).toBeVisible();
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
      const [seeded] = await db.seedSingleShotIncome([
        createSingleShotIncome({ name: 'Receita Avulsa', certainty: 'guaranteed' }),
      ]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectSingleShot();
      await page.waitForTimeout(500);

      await projects.expectProjectVisible(seeded.name);
      
      // Use the page object method to update certainty
      await projects.updateSingleShotCertainty(seeded.name, 'uncertain');

      // Wait for update to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Verify certainty badge is updated - look for "Incerta" text anywhere on the page
      await expect(page.getByText(/incert/i).first()).toBeVisible();
    });

    test('T050: delete project confirmation dialog → opens and closes correctly', async ({
      page,
      managePage,
      db,
    }) => {
      // Use a unique name to avoid conflicts with other workers
      const uniqueId = Date.now();
      const [seededProject] = await db.seedProjects([createProject({ name: `Projeto Excluir ${uniqueId}` })]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await page.waitForTimeout(500);
      
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
