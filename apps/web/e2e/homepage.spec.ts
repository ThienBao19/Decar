import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('shows hero section and navigation', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every detail about every vehicle')
    await expect(page.getByRole('link', { name: 'Explore Vehicles' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View Pricing' })).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'Pricing' }).first().click()
    await expect(page).toHaveURL('/pricing')
  })
})
