/**
 * Section object for group management within ManagePage
 * Tests group info display and member list (FR-015, FR-016, FR-017)
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class GroupSection {
  readonly page: Page;
  readonly membersList: Locator;
  readonly groupName: Locator;

  constructor(page: Page) {
    this.page = page;
    // The members list is rendered by MembersList component
    this.membersList = page.locator('ul').filter({ has: page.locator('li') });
    // Group name appears in the CardDescription
    this.groupName = page.locator('[class*="CardDescription"]').filter({ hasText: /grupo/i });
  }

  /**
   * Wait for group section to load
   */
  async waitForLoad(): Promise<void> {
    // Wait for either members list or empty state or loading to complete
    await Promise.race([
      this.page.getByText(/membros do grupo/i).waitFor({ state: 'visible', timeout: 30000 }),
      this.page.getByText(/nenhum membro/i).waitFor({ state: 'visible', timeout: 30000 }),
      this.page.getByText(/carregando/i).waitFor({ state: 'hidden', timeout: 30000 }),
    ]).catch(() => {
      // Content might already be visible
    });
  }

  /**
   * Get the displayed group name from the section
   */
  async getGroupName(): Promise<string | null> {
    await this.waitForLoad();
    
    // The group name is in the CardDescription: "Membros do grupo <strong>{name}</strong>"
    const description = this.page.locator('p').filter({ hasText: /membros do grupo/i }).first();
    
    if (await description.isVisible()) {
      const text = await description.textContent();
      // Extract the group name from the text
      const match = text?.match(/grupo\s+(.+)/i);
      return match?.[1]?.trim() ?? null;
    }
    
    return null;
  }

  /**
   * Verify group name is displayed
   */
  async expectGroupNameVisible(name: string): Promise<void> {
    await expect(async () => {
      await this.waitForLoad();
      // Look for the group name in the description
      const nameElement = this.page.getByText(name, { exact: false });
      await expect(nameElement.first()).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
  }

  /**
   * Get the list of member names displayed
   */
  async getMemberNames(): Promise<string[]> {
    await this.waitForLoad();
    
    // Members are in list items with a User icon and name
    const memberItems = this.page.locator('li').filter({ 
      has: this.page.locator('[class*="lucide-user"]') 
    });
    
    const count = await memberItems.count();
    const names: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await memberItems.nth(i).locator('span.font-medium').textContent();
      if (text) {
        names.push(text.trim());
      }
    }
    
    return names;
  }

  /**
   * Verify a specific member is visible in the list
   */
  async expectMemberVisible(name: string): Promise<void> {
    await expect(async () => {
      await this.waitForLoad();
      const member = this.page.locator('li').filter({ hasText: name });
      await expect(member.first()).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
  }

  /**
   * Verify the "(Você)" indicator is shown for the current user
   */
  async expectCurrentUserIndicator(): Promise<void> {
    await expect(async () => {
      await this.waitForLoad();
      const youIndicator = this.page.getByText('(Você)');
      await expect(youIndicator.first()).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
  }

  /**
   * Get the count of members displayed
   */
  async getMemberCount(): Promise<number> {
    await this.waitForLoad();
    
    const memberItems = this.page.locator('li').filter({ 
      has: this.page.locator('[class*="lucide-user"]') 
    });
    
    return memberItems.count();
  }

  /**
   * Check if error state is displayed (e.g., orphaned user)
   */
  async hasError(): Promise<boolean> {
    const errorElement = this.page.locator('[class*="destructive"]').filter({ hasText: /desassociada|erro/i });
    return errorElement.isVisible();
  }

  /**
   * Get error message if displayed
   */
  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator('[class*="destructive"]').first();
    if (await errorElement.isVisible()) {
      return errorElement.textContent();
    }
    return null;
  }
}



