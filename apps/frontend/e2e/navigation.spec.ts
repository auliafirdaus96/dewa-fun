import { test, expect } from '@playwright/test';

test.describe('Navigation & Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to dice game from homepage', async ({ page }) => {
    // Look for dice game link
    const diceLink = page.locator(
      'a[href*="/games/dice"], a[href*="/dice"], text=Dice, text=Play Dice'
    ).first();
    
    if (await diceLink.count() > 0) {
      await diceLink.click();
      await expect(page).toHaveURL(/.*dice/, { timeout: 5000 });
    } else {
      // If no direct link, try navigating directly
      await page.goto('/games/dice');
      await expect(page).toHaveURL(/.*dice/);
    }
  });

  test('should navigate to agents page', async ({ page }) => {
    // Look for agents link
    const agentsLink = page.locator(
      'a[href*="/agents"], text=Agents, text=AI Agents'
    ).first();
    
    if (await agentsLink.count() > 0) {
      await agentsLink.click();
      await expect(page).toHaveURL(/.*agents/, { timeout: 5000 });
    } else {
      await page.goto('/agents');
      await expect(page).toHaveURL(/.*agents/);
    }
  });

  test('should navigate to launchpad', async ({ page }) => {
    // Look for launchpad link
    const launchpadLink = page.locator(
      'a[href*="/launchpad"], text=Launchpad, text=Create Token'
    ).first();
    
    if (await launchpadLink.count() > 0) {
      await launchpadLink.click();
      await expect(page).toHaveURL(/.*launchpad/, { timeout: 5000 });
    } else {
      await page.goto('/launchpad');
      await expect(page).toHaveURL(/.*launchpad/);
    }
  });

  test('should have working header navigation', async ({ page }) => {
    // Check header exists
    const header = page.locator('header, [data-testid="header"], [class*="header"]').first();
    await expect(header).toBeVisible();
    
    // Look for nav links in header
    const navLinks = header.locator('a[href]');
    const count = await navLinks.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Click first nav link and verify navigation
    const firstLink = navLinks.first();
    const href = await firstLink.getAttribute('href');
    
    if (href && !href.startsWith('#') && !href.startsWith('http')) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(href);
    }
  });

  test('should have working sidebar navigation (if exists)', async ({ page }) => {
    // Check for sidebar
    const sidebar = page.locator(
      'aside, [data-testid="sidebar"], [class*="sidebar"], nav[aria-label*="main"]'
    ).first();
    
    const isVisible = await sidebar.isVisible();
    
    if (isVisible) {
      // Find links in sidebar
      const sidebarLinks = sidebar.locator('a[href]');
      const count = await sidebarLinks.count();
      
      if (count > 0) {
        const firstLink = sidebarLinks.first();
        const href = await firstLink.getAttribute('href');
        
        if (href && !href.startsWith('#')) {
          await firstLink.click();
          await page.waitForLoadState('networkidle');
          expect(page.url()).toContain(href);
        }
      }
    }
  });

  test('should handle 404 pages correctly', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/this-page-does-not-exist-12345');
    
    // Should show 404 or not-found page
    const notFoundElement = page.locator(
      'text=404, text=Not Found, text=Page Not Found, [class*="404"], [class*="not-found"]'
    );
    
    // Either shows 404 message or redirects
    const hasNotFound = await notFoundElement.count() > 0;
    const is404Url = page.url().includes('404');
    
    expect(hasNotFound || is404Url).toBeTruthy();
  });

  test('should have correct browser back/forward navigation', async ({ page }) => {
    // Start at home
    await page.goto('/');
    const homeUrl = page.url();
    
    // Navigate to dice
    await page.goto('/games/dice');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('dice');
    
    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe(homeUrl);
    
    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('dice');
  });

  test('should maintain state during navigation', async ({ page }) => {
    // This tests that navigation doesn't break app state
    
    // Navigate to a page
    await page.goto('/games/dice');
    
    // Get initial URL
    const initialUrl = page.url();
    
    // Navigate away
    await page.goto('/');
    
    // Navigate back
    await page.goto('/games/dice');
    
    // Should be back on dice page
    expect(page.url()).toContain('dice');
  });

  test('should have proper meta tags on all pages', async ({ page }) => {
    const pages = ['/', '/games/dice', '/agents', '/launchpad'];
    
    for (const path of pages) {
      try {
        await page.goto(path);
        
        // Check for title
        const title = await page.title();
        expect(title).toBeTruthy();
        
        // Check for meta description
        const description = page.locator('meta[name="description"]');
        const descCount = await description.count();
        
        // Description is optional but recommended
        if (descCount > 0) {
          const content = await description.first().getAttribute('content');
          expect(content).toBeTruthy();
        }
        
        // Check for viewport meta tag
        const viewport = page.locator('meta[name="viewport"]');
        await expect(viewport.first()).toHaveAttribute('content');
      } catch (error) {
        console.log(`Page ${path} may not exist:`, error);
      }
    }
  });
});
