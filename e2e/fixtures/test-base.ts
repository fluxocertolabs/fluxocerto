/**
 * Extended Playwright test with custom fixtures
 * Provides db, auth, and page object fixtures for all tests
 */

import { test as base, expect } from '@playwright/test';
import { dbFixture, type DatabaseFixture } from './db';
import { AuthFixture } from './auth';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';

/**
 * Custom test fixtures type
 */
type TestFixtures = {
  db: DatabaseFixture;
  auth: AuthFixture;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  managePage: ManagePage;
  quickUpdatePage: QuickUpdatePage;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  // Database fixture
  db: async ({}, use) => {
    await use(dbFixture);
  },

  // Auth fixture
  auth: async ({}, use) => {
    const authFixture = new AuthFixture();
    await use(authFixture);
  },

  // Page Objects
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  managePage: async ({ page }, use) => {
    const managePage = new ManagePage(page);
    await use(managePage);
  },

  quickUpdatePage: async ({ page }, use) => {
    const quickUpdatePage = new QuickUpdatePage(page);
    await use(quickUpdatePage);
  },
});

export { expect };

