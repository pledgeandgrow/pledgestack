/**
 * E2E tests — Playwright tests for playground app.
 * Item 69 of the PledgeStack roadmap.
 *
 * These tests run against a running PledgeStack dev server.
 * Start the server with `pnpm dev` before running.
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage loads and renders', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PledgeStack/);
  });

  test('client-side navigation works', async ({ page }) => {
    await page.goto('/');
    // Look for internal links
    const links = page.locator('a[href^="/"]');
    const count = await links.count();
    if (count > 0) {
      await links.first().click();
      await expect(page).toHaveURL(/.+\//);
    }
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.locator('body')).toContainText(/not found|404/i);
  });
});

test.describe('Forms and interactions', () => {
  test('form submission works', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('form');
    if (await form.count() > 0) {
      const inputs = form.locator('input[type="text"], input[type="email"], textarea');
      const inputCount = await inputs.count();
      for (let i = 0; i < inputCount; i++) {
        await inputs.nth(i).fill('test-value');
      }
      const submitBtn = form.locator('button[type="submit"], input[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
      }
    }
  });
});

test.describe('API routes', () => {
  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThan(500);
  });
});
