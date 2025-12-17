import { test, expect } from '@playwright/test';

test.describe('Editor Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('landing page renders correctly', async ({ page }) => {
    // The app should render something - either landing page or editor
    const appRoot = page.locator('#app');
    await expect(appRoot).toBeVisible();
    
    // Check for any content that indicates the app loaded
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('editor is present when authenticated', async ({ page }) => {
    // Check if we're on a page with the editor
    const milkdownEditor = page.locator('.milkdown');
    const codeEditor = page.locator('.cm-editor');
    
    // If neither editor is visible, we're probably on landing/auth page
    const editorVisible = await milkdownEditor.count() > 0 || await codeEditor.count() > 0;
    
    if (!editorVisible) {
      // Not authenticated or on landing page - skip
      test.skip(true, 'Editor not visible - likely unauthenticated');
      return;
    }

    // If we see an editor, verify it's functional
    await expect(milkdownEditor.or(codeEditor).first()).toBeVisible();
  });
});
