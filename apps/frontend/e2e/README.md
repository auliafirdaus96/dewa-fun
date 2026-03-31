# E2E Tests - Dewa.fun Frontend

This directory contains End-to-End (E2E) tests using Playwright.

## 📁 Files

- `homepage.spec.ts` - Homepage tests
- `dice-game.spec.ts` - Dice game feature tests
- `authentication.spec.ts` - Authentication/wallet connection tests
- `navigation.spec.ts` - Navigation and routing tests

## 🚀 Quick Start

```bash
# Install browsers (first time only)
pnpm exec playwright install

# Run all tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e e2e/dice-game.spec.ts

# Run with UI mode
pnpm test:e2e:ui

# View HTML report
pnpm test:e2e:report
```

## 📖 Documentation

See [PLAYWRIGHT_E2E_GUIDE.md](../docs/PLAYWRIGHT_E2E_GUIDE.md) for complete documentation.

## 🎯 Test Coverage

| Suite | Tests | Description |
|-------|-------|-------------|
| Homepage | 3 | Basic homepage functionality |
| Dice Game | 9 | Dice game interactions and validation |
| Authentication | 8 | Wallet connection flows |
| Navigation | 9 | Routing and navigation tests |
| **Total** | **29** | **Production ready** |

## 🔧 Configuration

Tests are configured in `playwright.config.ts` at the root of `apps/frontend`.

Key settings:
- **Timeout:** 60s per test
- **Retry:** 2 times on CI
- **Browsers:** Chrome, Firefox, Safari (Desktop + Mobile)
- **Screenshots:** On failure
- **Video:** On failure
- **Trace:** On first retry

## 📝 Writing New Tests

Template for new test files:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/starting-point');
  });

  test('should do something', async ({ page }) => {
    // Your test here
  });
});
```

## 🐛 Debugging

```bash
# Debug with inspector
pnpm test:e2e:debug

# Run headed to see browser
pnpm test:e2e:headed

# Take screenshots
await page.screenshot({ path: 'debug.png' });
```

## 📊 Reports

After running tests, view the HTML report:

```bash
pnpm test:e2e:report
```

Reports are saved to `playwright-report/` directory.

## ⚠️ Notes

- Tests assume a local dev server running on `http://localhost:3000`
- For production testing, set `BASE_URL` environment variable
- Some tests may require wallet extensions for full coverage
- Mobile tests use emulated viewports, not real devices
