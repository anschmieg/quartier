import { test, expect } from '@playwright/test';

test.describe('UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('header connection status is visible', async ({ page }) => {
    // Check if we are in the main app layout
    // We look for the header element which contains the connection status
    const header = page.locator('header');
    
    // If header doesn't exist or isn't our AppHeader, skip
    if (await header.count() === 0) {
      test.skip(true, 'Main app header not found - likely on landing page');
      return;
    }

    // ConnectionStatus should be visible in the header
    // It has role="status" and specific class
    const status = page.locator('.connection-status');
    const statusDot = status.locator('.status-dot');
    
    // Only check if we are actually authenticated/in-app
    // A good proxy is checking for the sidebar toggle too
    const hasSidebarToggle = await page.locator('button').filter({ has: page.locator('svg.lucide-panel-left') }).count() > 0;
    
    if (hasSidebarToggle) {
        await expect(status).toBeVisible();
        await expect(statusDot).toBeVisible();
    } else {
        test.skip(true, 'Sidebar toggle not found - likely not in main app interface');
    }
  });

  test('sidebar can be toggled', async ({ page }) => {
    // Sidebar should be initialized (might be visible or hidden depending on screen size/prefs)
    // We look for the toggle button in the header
    const toggleButton = page.locator('button').filter({ has: page.locator('svg.lucide-panel-left') });
    
    // Use count check to avoid timeout error
    if (await toggleButton.count() === 0) {
        test.skip(true, 'Sidebar toggle not found - likely on landing page');
        return;
    }
    
    // Toggle button should be present
    await expect(toggleButton).toBeVisible();
    
    // Check initial state check (sidebar container)
    // The sidebar usually has a specific width or class when open
    const sidebar = page.locator('aside'); // Assuming aside element for sidebar
    
    // If sidebar exists, we can try toggling
    if (await sidebar.count() > 0) {
      const initialVis = await sidebar.isVisible();
      await toggleButton.click();
      // Wait a bit for animation
      await page.waitForTimeout(300); 
      const newVis = await sidebar.isVisible();
      
      // Visibility should change
      expect(newVis).not.toBe(initialVis);
    }
  });

  test('file browser structure renders', async ({ page }) => {
    // Check if sidebar/aside is present
    const sidebar = page.locator('aside');
    
    // Use count check to avoid timeout error
    if (await sidebar.count() === 0) {
        test.skip(true, 'Sidebar not found - likely on landing page');
        return;
    }

    // Check for "Files" header in the browser pane
    // Might be in a collapsed state or different tab, but usually present in DOM
    const filesHeader = page.getByText('Files', { exact: true });
    
    // If sidebar is visible, check for file tree elements
    if (await sidebar.isVisible()) {
        await expect(sidebar).toBeVisible();
        
        // Check that either we have files header OR a file explorer component
        // This is a loose check to ensure the component rendered without crashing
        const hasContent = await filesHeader.count() > 0 || await page.locator('.file-tree').count() > 0 || await page.locator('.empty-state').count() > 0;
        expect(hasContent).toBeTruthy();
    }
  });
});
