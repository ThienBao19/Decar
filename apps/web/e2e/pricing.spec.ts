import { test, expect } from '@playwright/test'

test.describe('Pricing page', () => {
  test('shows Free and Pro tiers', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByRole('heading', { name: 'Simple, transparent pricing' })).toBeVisible()
    await expect(page.getByText('FREE')).toBeVisible()
    await expect(page.getByText('PRO')).toBeVisible()
    await expect(page.getByText('$0')).toBeVisible()
    await expect(page.getByText('$9')).toBeVisible()
  })

  test('free tier upgrade CTA links to login for unauthenticated user', async ({ page }) => {
    await page.goto('/pricing')

    const ctaButton = page.getByRole('link', { name: 'Get started free' })
    await expect(ctaButton).toBeVisible()
    await expect(ctaButton).toHaveAttribute('href', '/login')
  })
})
