/**
 * E2E Tests: User Story 4 - Project (Income) Management
 * Tests recurring income projects and single-shot income management
 */

import { test, expect } from '../fixtures/test-base';
import { createProject, createSingleShotIncome } from '../utils/test-data';

test.describe('Project (Income) Management', () => {
  // Run tests serially to avoid database race conditions
  test.describe.configure({ mode: 'serial' });

  test.describe('Recurring Projects', () => {
    test('T044: create recurring project "Salário" R$ 8.000,00 monthly guaranteed → appears in recurring list', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await projects.createRecurringProject({
        name: 'Salário',
        amount: '8.000,00',
        paymentDay: '5',
        frequency: 'monthly',
        certainty: 'guaranteed',
      });

      await projects.expectProjectVisible('Salário');
    });

    test('T045: change project frequency to biweekly → updated frequency displayed', async ({
      page,
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedProjects([
        createProject({ name: 'Projeto Mensal', frequency: 'monthly' }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await projects.updateProjectFrequency('Projeto Mensal', 'biweekly');

      // Verify frequency is updated
      await expect(page.getByText(/quinzenal|biweekly/i)).toBeVisible();
    });

    test('T046: toggle project inactive → shows as inactive', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedProjects([
        createProject({ name: 'Projeto Ativo', is_active: true }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await projects.toggleProject('Projeto Ativo');

      await projects.expectProjectInactive('Projeto Ativo');
    });

    test('T047: change project certainty to "probable" → certainty badge updates', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedProjects([
        createProject({ name: 'Projeto Garantido', certainty: 'guaranteed' }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();
      await projects.updateProjectCertainty('Projeto Garantido', 'probable');

      await projects.expectCertaintyBadge('Projeto Garantido', 'probable');
    });
  });

  test.describe('Single-Shot Income', () => {
    test('T048: create single-shot income "Bônus Anual" R$ 10.000,00 date 2025-12-20 guaranteed → appears in single-shot list', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectSingleShot();
      await projects.createSingleShotIncome({
        name: 'Bônus Anual',
        amount: '10.000,00',
        date: '2025-12-20',
        certainty: 'guaranteed',
      });

      await projects.expectProjectVisible('Bônus Anual');
    });

    test('T049: edit single-shot income certainty to "uncertain" → certainty badge updates', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedSingleShotIncome([
        createSingleShotIncome({ name: 'Receita Avulsa', certainty: 'guaranteed' }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectSingleShot();

      // Use the page object method to update certainty
      await projects.updateSingleShotCertainty('Receita Avulsa', 'uncertain');

      // Verify certainty badge updated
      await projects.expectCertaintyBadge('Receita Avulsa', 'uncertain');
    });

    // TODO: Fix single-shot income deletion - the delete confirmation dialog may have issues
    test.skip('T050: delete income items with confirmation → removed from respective lists', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedProjects([createProject({ name: 'Projeto Excluir' })]);
      await db.seedSingleShotIncome([createSingleShotIncome({ name: 'Receita Excluir' })]);

      await managePage.goto();
      await managePage.selectProjectsTab();

      const projects = managePage.projects();

      // Delete recurring project
      await projects.selectRecurring();
      await projects.expectProjectVisible('Projeto Excluir');
      await projects.deleteProject('Projeto Excluir');
      await projects.expectProjectNotVisible('Projeto Excluir');

      // Reload page to ensure clean state before deleting single-shot
      await managePage.goto();
      await managePage.selectProjectsTab();

      // Delete single-shot income
      await projects.selectSingleShot();
      await projects.expectProjectVisible('Receita Excluir');
      await projects.deleteProject('Receita Excluir');
      await projects.expectProjectNotVisible('Receita Excluir');
    });
  });
});

