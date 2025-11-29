/**
 * Section object for project/income management (recurring and single-shot)
 * Implements IProjectsSection contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ProjectsSection {
  readonly page: Page;
  readonly recurringTab: Locator;
  readonly singleShotTab: Locator;
  readonly projectList: Locator;

  constructor(page: Page) {
    this.page = page;
    // The ProjectSection uses tabs "Recorrentes" and "Pontuais"
    this.recurringTab = page.getByRole('tab', { name: /recorrentes/i });
    this.singleShotTab = page.getByRole('tab', { name: /pontuais/i });
    this.projectList = page.locator('[data-testid="projects-list"], .projects-list').first();
  }

  /**
   * Switch to recurring projects sub-tab
   */
  async selectRecurring(): Promise<void> {
    await this.recurringTab.click();
  }

  /**
   * Switch to single-shot income sub-tab
   */
  async selectSingleShot(): Promise<void> {
    await this.singleShotTab.click();
  }

  /**
   * Create a recurring project/income
   * The add button is at the bottom: "Adicionar Receita Recorrente"
   */
  async createRecurringProject(data: {
    name: string;
    amount: string;
    paymentDay: string;
    frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly';
    certainty: 'guaranteed' | 'probable' | 'uncertain';
  }): Promise<void> {
    await this.selectRecurring();
    await this.page.getByRole('button', { name: /adicionar receita recorrente|adicionar projeto/i }).click();

    // Wait for dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill form
    await dialog.getByLabel(/nome/i).fill(data.name);
    await dialog.getByLabel(/valor/i).fill(data.amount);
    
    // Select frequency first (it affects which day input appears)
    await dialog.locator('#frequency').click();
    
    const frequencyLabels: Record<string, RegExp> = {
      weekly: /semanal/i,
      biweekly: /quinzenal/i,
      'twice-monthly': /duas vezes/i,
      monthly: /mensal/i,
    };
    await this.page.getByRole('option', { name: frequencyLabels[data.frequency] }).click();

    // Fill payment day (the input varies based on frequency)
    const dayInput = dialog.getByLabel(/dia.*pagamento|dia do mês/i).or(dialog.locator('#paymentDay'));
    if (await dayInput.isVisible()) {
      await dayInput.fill(data.paymentDay);
    }

    // Select certainty - note the labels are feminine: Garantida, Provável, Incerta
    await dialog.locator('#certainty').click();
    
    const certaintyLabels: Record<string, RegExp> = {
      guaranteed: /garantid/i,
      probable: /provável/i,
      uncertain: /incert/i,
    };
    await this.page.getByRole('option', { name: certaintyLabels[data.certainty] }).click();

    // Submit
    await dialog.getByRole('button', { name: /salvar|adicionar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Create a one-time income entry
   * The add button is at the bottom: "Adicionar Receita Pontual"
   */
  async createSingleShotIncome(data: {
    name: string;
    amount: string;
    date: string;
    certainty: 'guaranteed' | 'probable' | 'uncertain';
  }): Promise<void> {
    await this.selectSingleShot();
    await this.page.getByRole('button', { name: /adicionar receita pontual/i }).click();

    // Wait for dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill form
    await dialog.getByLabel(/nome/i).fill(data.name);
    await dialog.getByLabel(/valor/i).fill(data.amount);
    
    // Handle date input
    const dateInput = dialog.locator('input[type="date"]').or(dialog.getByLabel(/data/i));
    await dateInput.fill(data.date);

    // Select certainty - note the labels are feminine: Garantida, Provável, Incerta
    await dialog.locator('#certainty').click();
    
    const certaintyLabels: Record<string, RegExp> = {
      guaranteed: /garantid/i,
      probable: /provável/i,
      uncertain: /incert/i,
    };
    await this.page.getByRole('option', { name: certaintyLabels[data.certainty] }).click();

    // Submit
    await dialog.getByRole('button', { name: /salvar|adicionar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Toggle project active/inactive status
   * The ProjectListItem has a Switch component
   */
  async toggleProject(name: string): Promise<void> {
    const projectRow = this.page.locator('.rounded-lg.border').filter({ hasText: name }).first();
    const toggle = projectRow.getByRole('switch');
    await toggle.click();
  }

  /**
   * Edit project by clicking edit button
   * The ProjectListItem has an "Editar" button directly visible
   */
  private async editProject(name: string): Promise<void> {
    const projectRow = this.page.locator('.rounded-lg.border').filter({ hasText: name }).first();
    await projectRow.getByRole('button', { name: /editar/i }).click();
    
    // Wait for dialog
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  /**
   * Change project frequency
   */
  async updateProjectFrequency(
    name: string,
    frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
  ): Promise<void> {
    await this.editProject(name);
    const dialog = this.page.getByRole('dialog');
    
    await dialog.locator('#frequency').click();
    
    const frequencyLabels: Record<string, RegExp> = {
      weekly: /semanal/i,
      biweekly: /quinzenal/i,
      'twice-monthly': /duas vezes/i,
      monthly: /mensal/i,
    };
    await this.page.getByRole('option', { name: frequencyLabels[frequency] }).click();

    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Change project certainty
   */
  async updateProjectCertainty(
    name: string,
    certainty: 'guaranteed' | 'probable' | 'uncertain'
  ): Promise<void> {
    await this.editProject(name);
    const dialog = this.page.getByRole('dialog');
    
    await dialog.locator('#certainty').click();
    
    const certaintyLabels: Record<string, RegExp> = {
      guaranteed: /garantid/i,
      probable: /provável/i,
      uncertain: /incert/i,
    };
    await this.page.getByRole('option', { name: certaintyLabels[certainty] }).click();

    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Update single-shot income certainty
   */
  async updateSingleShotCertainty(
    name: string,
    certainty: 'guaranteed' | 'probable' | 'uncertain'
  ): Promise<void> {
    await this.editProject(name);
    const dialog = this.page.getByRole('dialog');
    
    await dialog.locator('#certainty').click();
    
    const certaintyLabels: Record<string, RegExp> = {
      guaranteed: /garantid/i,
      probable: /provável/i,
      uncertain: /incert/i,
    };
    await this.page.getByRole('option', { name: certaintyLabels[certainty] }).click();

    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete project - directly click the "Excluir" button on the row
   */
  async deleteProject(name: string): Promise<void> {
    const projectRow = this.page.locator('.rounded-lg.border').filter({ hasText: name }).first();
    await projectRow.getByRole('button', { name: /excluir/i }).click();
    
    // Wait for confirmation dialog and confirm
    const confirmDialog = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /confirmar|sim|yes|excluir/i }).click();
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify project is visible in list
   */
  async expectProjectVisible(name: string): Promise<void> {
    const project = this.page.getByText(name).first();
    await expect(project).toBeVisible();
  }

  /**
   * Verify project is not visible in list
   */
  async expectProjectNotVisible(name: string): Promise<void> {
    const project = this.page.locator('.rounded-lg.border').filter({ hasText: name });
    await expect(project).not.toBeVisible();
  }

  /**
   * Verify project shows as inactive
   * The inactive items have opacity-60 class and show "Inativo" badge
   */
  async expectProjectInactive(name: string): Promise<void> {
    const projectRow = this.page.locator('.rounded-lg.border').filter({ hasText: name }).first();
    // Check for "Inativo" badge text
    await expect(projectRow.getByText(/inativo/i)).toBeVisible();
  }

  /**
   * Verify certainty badge displays correct value
   */
  async expectCertaintyBadge(
    name: string,
    certainty: 'guaranteed' | 'probable' | 'uncertain'
  ): Promise<void> {
    const projectRow = this.page.locator('.rounded-lg.border').filter({ hasText: name }).first();
    
    // The badge labels are: Garantido, Provável, Incerto (for projects/income)
    const certaintyLabels: Record<string, RegExp> = {
      guaranteed: /garantid/i,
      probable: /provável/i,
      uncertain: /incert/i,
    };
    
    const badge = projectRow.getByText(certaintyLabels[certainty]);
    await expect(badge).toBeVisible();
  }
}

