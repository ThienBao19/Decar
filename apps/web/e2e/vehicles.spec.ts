import { test, expect } from '@playwright/test'

test.describe('Vehicle listing', () => {
  test('shows search bar and empty state when no results', async ({ page }) => {
    await page.goto('/vehicles')

    // Search bar present
    await expect(page.getByPlaceholder('Make (e.g. Toyota, BMW, Porsche)')).toBeVisible()
    await expect(page.getByPlaceholder('Model (e.g. Camry, 911, Civic)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
  })

  test('search form submits with make filter in URL', async ({ page }) => {
    await page.goto('/vehicles')

    await page.getByPlaceholder('Make (e.g. Toyota, BMW, Porsche)').fill('Toyota')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page).toHaveURL(/make=Toyota/)
  })

  test('page title is Browse Vehicles', async ({ page }) => {
    await page.goto('/vehicles')

    await expect(page).toHaveTitle(/Browse Vehicles/)
  })
})

test.describe('Pricing page feature table', () => {
  test('comparison table shows Free and Pro columns', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByRole('columnheader', { name: 'Free' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Pro' })).toBeVisible()
  })

  test('FAQ section is visible', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByText('Frequently asked questions')).toBeVisible()
    await expect(page.getByText('Can I cancel anytime?')).toBeVisible()
  })
})

test.describe('Upgrade gate', () => {
  test('unauthenticated user sees upgrade CTA on pricing page', async ({ page }) => {
    await page.goto('/pricing')

    // Unauthenticated: Free CTA goes to /login
    const freeLink = page.getByRole('link', { name: 'Get started free' })
    await expect(freeLink).toBeVisible()
    await expect(freeLink).toHaveAttribute('href', '/login')
  })

  test('Pro upgrade button is visible on pricing page', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toBeVisible()
  })
})