import { test, expect } from '@playwright/test';

test.describe('App Loading', () => {
  test('homepage loads and displays landing content', async ({ page }) => {
    await page.goto('/');

    // Should see the landing page or redirect to login
    // Check for any content that indicates the app loaded
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load and check title
    await expect(page).toHaveTitle(/Quartier|Loading/i);
  });
});

test.describe('Editor Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Go to app root - may show login or landing
    await page.goto('/');
  });

  test('app container renders', async ({ page }) => {
    // Basic check that the Vue app mounted
    const appRoot = page.locator('#app');
    await expect(appRoot).toBeVisible();
  });
});
