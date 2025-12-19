import { test, expect } from '@playwright/test';

test.describe('Storage Providers', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the app view
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    // Wait for the layout to render (look for sidebar)
    await expect(page.locator('aside').first()).toBeVisible();
  });

  test('source switcher shows all providers', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    
    // Find the switcher. It uses a button with border-dashed class inside the sidebar
    // We can also filter by the text "Select" or "GitHub" if we knew the default
    const switcher = sidebar.locator('button.border-dashed');
    await expect(switcher).toBeVisible();
    await switcher.click();
    
    // Check options in the dropdown
    // Dropdown content is in a portal, look for menu items
    await expect(page.getByRole('menuitem', { name: 'Google Drive' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Nextcloud' })).toBeVisible();
  });

  test('nextcloud login dialog renders correctly', async ({ page }) => {
    const sidebar = page.locator('aside').first();
    
    // Open Switcher
    const switcher = sidebar.locator('button.border-dashed');
    await switcher.click();
    
    // Select Nextcloud
    // DropdownMenu items have role="menuitem"
    await page.getByRole('menuitem', { name: /Nextcloud/i }).click();
    
    // Verify Dialog Open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Open from Nextcloud');
    
    // Verify Fields
    await expect(page.getByPlaceholder('https://cloud.example.com')).toBeVisible();
    
    // Verify Hint
    await expect(dialog).toContainText('Settings → Security → Devices & session');
  });
});
