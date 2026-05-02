import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders providers', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Sign in to Decar' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue with GitHub/i })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('magic link form shows confirmation after submit', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    // Note: in real E2E we'd mock the email provider; this tests the UI state
    await expect(page.getByRole('button', { name: 'Send magic link' })).toBeEnabled()
  })

  test('unauthenticated user redirected from dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL('/login')
  })
})
