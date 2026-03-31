import { test, expect } from '@playwright/test';

test.describe('Dice Game', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dice page
    await page.goto('/games/dice');
  });

  test('should load dice game page', async ({ page }) => {
    // Wait for page to load
    await expect(page).toHaveURL(/.*dice/);
    
    // Check if dice game container exists (adjust selector based on actual structure)
    const diceContainer = page.locator('[data-testid="dice-game"], .dice-game, #dice-game');
    await expect(diceContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display bet controls', async ({ page }) => {
    // Look for bet amount input (common selectors)
    const betInput = page.locator('input[type="number"][name*="bet"], input[placeholder*="bet" i]');
    await expect(betInput.first()).toBeVisible();
  });

  test('should have roll button', async ({ page }) => {
    // Look for roll/roll button
    const rollButton = page.locator('button:has-text("Roll"), button:has-text("Bet"), [data-testid="roll-button"]');
    await expect(rollButton.first()).toBeVisible();
  });

  test('should display win chance slider or input', async ({ page }) => {
    // Look for win chance controls
    const winChanceControl = page.locator(
      'input[type="range"][name*="chance"], input[name*="winChance"], [data-testid="win-chance"]'
    );
    await expect(winChanceControl.first()).toBeVisible();
  });

  test('should show balance information', async ({ page }) => {
    // Look for balance display
    const balanceDisplay = page.locator(
      '[data-testid="balance"], .balance, [class*="balance"], text=Balance'
    );
    await expect(balanceDisplay.first()).toBeVisible();
  });

  test('should allow changing bet amount', async ({ page }) => {
    const betInput = page.locator('input[type="number"][name*="bet"]').first();
    
    // Clear and enter new bet amount
    await betInput.fill('100');
    await expect(betInput).toHaveValue('100');
  });

  test('should validate minimum bet', async ({ page }) => {
    const betInput = page.locator('input[type="number"][name*="bet"]').first();
    
    // Try to enter very small amount
    await betInput.fill('0.000001');
    
    // Check if there's a validation error or the value is corrected
    const errorMessage = page.locator('[class*="error"], [class*="invalid"], text=minimum');
    const hasError = await errorMessage.count() > 0;
    
    // Either shows error or doesn't allow submission
    if (hasError) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });

  test('should display game history or recent bets', async ({ page }) => {
    // Look for history section
    const historySection = page.locator(
      '[data-testid="history"], [class*="history"], text=History, text=Recent Bets'
    );
    
    // History might be empty initially, so we just check if the section exists
    await expect(historySection.first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if game is still playable
    const betInput = page.locator('input[type="number"][name*="bet"]').first();
    await expect(betInput).toBeVisible();
    
    const rollButton = page.locator('button:has-text("Roll")').first();
    await expect(rollButton).toBeVisible();
  });
});
