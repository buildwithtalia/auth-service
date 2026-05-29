const { test, expect } = require('@playwright/test');

test.describe('Auth Service UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the login form by default', async ({ page }) => {
    // Page title
    await expect(page).toHaveTitle('Auth Service');

    // Header is visible
    await expect(page.getByRole('heading', { name: 'Auth Service' })).toBeVisible();

  });
});
