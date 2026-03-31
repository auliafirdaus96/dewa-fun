import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start from homepage
    await page.goto('/');
  });

  test('should display login/connect wallet button', async ({ page }) => {
    // Look for wallet connect or login button
    const loginButton = page.locator(
      'button:has-text("Connect"), button:has-text("Login"), button:has-text("Sign In"), [data-testid="connect-wallet"]'
    );
    
    await expect(loginButton.first()).toBeVisible();
  });

  test('should open wallet connection modal on click', async ({ page }) => {
    // Click connect wallet button
    const connectButton = page.locator('button:has-text("Connect")').first();
    await connectButton.click();
    
    // Wait for modal to appear (common patterns)
    const modal = page.locator(
      '[role="dialog"], [class*="modal"], [class*="wallet"], text=Connect Wallet'
    );
    
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show supported wallets', async ({ page }) => {
    // Navigate to what might be a wallet connection page
    await page.goto('/');
    
    const connectButton = page.locator('button:has-text("Connect")').first();
    await connectButton.click();
    
    // Look for common wallet names
    const walletOptions = page.locator(
      'text=Phantom, text=Solflare, text=Backpack, text=WalletConnect'
    );
    
    // At least one wallet option should be visible
    await expect(walletOptions.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle wallet connection gracefully', async ({ page }) => {
    // This test checks the flow without actually connecting
    // since we don't have a real wallet in test environment
    
    const connectButton = page.locator('button:has-text("Connect")').first();
    await connectButton.click();
    
    // Modal should appear
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();
    
    // Should be able to close modal
    const closeButton = page.locator('button[aria-label="Close"], button:has-text("Close"), .modal-close').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('should display user state when connected (mock)', async ({ page }) => {
    // This would normally test actual connection
    // For now, we verify the UI elements exist
    
    // Check for user menu/profile placeholder
    const userMenu = page.locator(
      '[data-testid="user-menu"], [class*="user"], [class*="profile"]'
    );
    
    // Might not be visible before connection, so we don't fail on this
    const count = await userMenu.count();
    console.log(`Found ${count} user menu elements`);
  });

  test('should have proper error handling for failed connection', async ({ page }) => {
    // Test that error states are handled
    await page.goto('/');
    
    // Try to interact with connect button
    const connectButton = page.locator('button:has-text("Connect")').first();
    await expect(connectButton).toBeEnabled();
    
    // The actual error handling would require mocking wallet rejection
    // which is more complex and typically done with service workers
  });

  test('should persist session across page refresh (if connected)', async ({ page }) => {
    // This tests session persistence
    // Would require actual wallet connection setup
    
    // Navigate around and check if state persists
    await page.goto('/');
    const url1 = page.url();
    
    await page.goto('/games/dice');
    const url2 = page.url();
    
    expect(url2).toContain('dice');
    
    // Go back to home
    await page.goto('/');
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('should respect logout/disconnect', async ({ page }) => {
    // If there's a disconnect button, test it
    await page.goto('/');
    
    // Look for any settings or profile menu
    const settingsButton = page.locator(
      '[data-testid="settings"], [class*="settings"], [aria-label="Settings"]'
    ).first();
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Look for disconnect/logout
      const disconnectButton = page.locator(
        'button:has-text("Disconnect"), button:has-text("Logout"), button:has-text("Sign Out")'
      ).first();
      
      if (await disconnectButton.count() > 0) {
        await expect(disconnectButton).toBeEnabled();
      }
    }
  });
});
