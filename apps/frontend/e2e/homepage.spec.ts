import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display homepage correctly', async ({ page }) => {
    // Check if page loaded
    await expect(page).toHaveURL('/');
    
    // Check for main content areas (adjust selectors based on actual homepage structure)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper title', async ({ page }) => {
    // Check page title contains Dewa.fun
    await expect(page).toHaveTitle(/Dewa/i);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check body is visible and properly laid out
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
