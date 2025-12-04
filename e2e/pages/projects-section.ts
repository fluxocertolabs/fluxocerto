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
    // Wait for tab panel to be ready
    await this.page.waitForTimeout(300);
    // Wait for recurring content to be visible (either list or empty state)
    await Promise.race([
      this.page.getByRole('button', { name: /adicionar receita recorrente|adicionar projeto/i }).waitFor({ state: 'visible', timeout: 30000 }),
      this.page.getByText(/nenhuma fonte de renda/i).waitFor({ state: 'visible', timeout: 30000 }),
      // Also check for project items
      this.page.locator('div.p-4.rounded-lg.border.bg-card').first().waitFor({ state: 'visible', timeout: 30000 }),
    ]).catch(() => {
      // Content might already be visible
    });
  }

  /**
   * Switch to single-shot income sub-tab
   */
  async selectSingleShot(): Promise<void> {
    await this.singleShotTab.click();
    // Wait for tab panel to be ready
    await this.page.waitForTimeout(300);
    // Wait for single-shot content to be visible (either list or empty state)  
    await Promise.race([
      this.page.getByRole('button', { name: /adicionar receita pontual/i }).waitFor({ state: 'visible', timeout: 30000 }),
      this.page.getByText(/nenhuma receita avulsa|nenhuma receita pontual/i).waitFor({ state: 'visible', timeout: 30000 }),
      // Also check for income items
      this.page.locator('div.p-4.rounded-lg.border.bg-card').first().waitFor({ state: 'visible', timeout: 30000 }),
    ]).catch(() => {
      // Content might already be visible
    });
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
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find the switch by its aria-label which contains the project action
    // The switch has aria-label like "Desativar projeto" or "Ativar projeto"
    const projectName = this.page.getByText(name, { exact: true }).first();
    
    // Navigate up to find the container with the switch
    // Try multiple strategies
    let toggle = this.page.getByRole('switch', { name: /ativar|desativar/i }).first();
    
    // If there are multiple switches, we need to find the one in the same row
    const switchCount = await this.page.getByRole('switch').count();
    if (switchCount > 1) {
      // Use xpath to find the switch in the same ancestor container
      toggle = projectName.locator('xpath=ancestor::*[.//button[@role="switch"]]//button[@role="switch"]').first();
    }
    
    await toggle.click();
    // Wait a bit for the state change to process
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit project by clicking edit button
   * The ProjectListItem has an "Editar" button directly visible
   */
  private async editProject(name: string): Promise<void> {
    // Wait for any pending updates to settle
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    await this.page.waitForTimeout(300);
    
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find all edit buttons and click the one in the same row as the project name
    // Strategy: find the text, go up to find the container, then find the edit button
    const projectName = this.page.getByText(name, { exact: true }).first();
    
    // Navigate to the parent container that has the edit button
    // The structure is: container > (name info) + (actions with edit button)
    const editButton = projectName.locator('xpath=ancestor::*[.//button[contains(text(), "Editar") or @aria-label[contains(., "Editar")]]]//button[contains(text(), "Editar") or @aria-label[contains(., "Editar")]]').first();
    
    // Wait for button to be stable
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.click();
    
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
   * Single-shot income items are in the "Pontuais" tab
   */
  async updateSingleShotCertainty(
    name: string,
    certainty: 'guaranteed' | 'probable' | 'uncertain'
  ): Promise<void> {
    // Make sure we're on the single-shot tab
    await this.selectSingleShot();
    
    // Wait for the item to be visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Use the editProject method which handles finding the edit button
    await this.editProject(name);
    
    // Wait for dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
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
    // Wait for any pending updates to settle
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    await this.page.waitForTimeout(300);
    
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find the delete button in the same row as the project name
    const projectName = this.page.getByText(name, { exact: true }).first();
    const deleteButton = projectName.locator('xpath=ancestor::*[.//button[contains(text(), "Excluir")]]//button[contains(text(), "Excluir")]').first();
    
    // Wait for button to be visible and clickable
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await deleteButton.click();
    
    // Wait for confirmation dialog (AlertDialog)
    const confirmDialog = this.page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    
    // The AlertDialogAction button has text "Excluir" or "Excluindo..."
    const confirmButton = confirmDialog.locator('button').filter({ hasText: /^Excluir$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();
    
    // Wait for dialog to close
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });
    
    // Wait for the UI to update after deletion
    await this.page.waitForTimeout(2000);
    
    // Also wait for network to settle
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
  }

  /**
   * Verify project is visible in list
   */
  async expectProjectVisible(name: string): Promise<void> {
    await expect(async () => {
      const project = this.page.getByText(name, { exact: true }).first();
      await expect(project).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
  }

  /**
   * Verify project is not visible in list
   */
  async expectProjectNotVisible(name: string): Promise<void> {
    const project = this.page.getByText(name, { exact: true });
    await expect(project).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify project shows as inactive
   * The inactive items have opacity-60 class and show "Inativo" badge
   */
  async expectProjectInactive(name: string): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Check for "Inativo" badge text near the project name
    // The badge should be in the same row as the project name
    const projectName = this.page.getByText(name, { exact: true }).first();
    // Find the immediate parent row that contains the project info
    const row = projectName.locator('xpath=ancestor::div[contains(@class, "flex") and contains(@class, "items-center")][1]');
    const inactiveBadge = row.getByText(/inativo/i).first();
    await expect(inactiveBadge).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify certainty badge displays correct value
   */
  async expectCertaintyBadge(
    name: string,
    certainty: 'guaranteed' | 'probable' | 'uncertain'
  ): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // The badge labels are: Garantida, Provável, Incerta (feminine for income)
    const certaintyLabels: Record<string, RegExp> = {
      guaranteed: /garantid/i,
      probable: /provável/i,
      uncertain: /incert/i,
    };
    
    // Find the badge near the project name
    // For recurring projects, the container has a switch
    // For single-shot income, there's no switch, so use a more general ancestor
    const projectName = this.page.getByText(name, { exact: true }).first();
    
    // Try to find container with switch first (recurring), then fall back to parent container
    let container = projectName.locator('xpath=ancestor::*[.//button[@role="switch"]]').first();
    const hasSwitch = await container.count() > 0;
    
    if (!hasSwitch) {
      // Single-shot income - use the row container (parent with Editar/Excluir buttons)
      container = projectName.locator('xpath=ancestor::*[.//button[contains(text(), "Editar")]]').first();
    }
    
    const badge = container.getByText(certaintyLabels[certainty]);
    await expect(badge).toBeVisible({ timeout: 5000 });
  }
}

