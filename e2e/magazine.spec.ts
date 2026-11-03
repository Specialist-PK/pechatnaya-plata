import { expect, test } from '@playwright/test'

const basePath = '/pechatnaya-plata/'

function articleUrl(slug: string, page?: number): string {
  return `${basePath}#/article/${slug}${page ? `/${page}` : ''}`
}

test('desktop spread opens the last page without overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(articleUrl('memory-of-specialist'))
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeVisible()
  await expect(page.locator('section[aria-label="Страница 20"]')).toBeVisible()

  await page.getByRole('button', { name: 'Следующая страница' }).click()
  await expect(page).toHaveURL(/memory-of-specialist\/21$/)
  await expect(page.locator('section[aria-label="Страница 21"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()

  const overflow = await page.locator('section[aria-label^="Страница"]').evaluateAll((pages) => pages.flatMap((page) => {
    const content = page.querySelector('[class*="content"]')
    return content && content.scrollHeight > content.clientHeight + 1
      ? [page.getAttribute('aria-label')]
      : []
  }))
  expect(overflow).toEqual([])
  expect(errors).toEqual([])
})

test('mobile reader, catalog order and resize remain consistent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(articleUrl('memory-of-specialist'))
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeVisible()
  await expect(page.locator('section[aria-label="Страница 20"]')).not.toBeVisible()
  await expect(page.locator('section[aria-label="Страница 19"]').getByRole('heading', { name: 'Компьютер начинается с памяти' })).toBeVisible()

  await page.getByRole('button', { name: 'Содержание' }).click()
  await expect(page.locator('dialog [class*="catalogEntry"] strong')).toHaveText([
    'Память домашнего компьютера',
    'Восемь бит для технического творчества',
    'От схемы к работающей машине',
  ])
  await page.locator('dialog [class*="catalogEntry"]').nth(1).click()
  await expect(page).toHaveURL(/eight-bit-workshop\/31$/)
  await expect(page.locator('section[aria-label="Страница 31"]')).toBeVisible()

  await page.setViewportSize({ width: 1440, height: 1050 })
  await expect(page.locator('section[aria-label="Страница 31"]')).toBeVisible()
  await expect(page.locator('section[aria-label="Страница 32"]')).toBeVisible()
  await expect(page.locator('section[aria-label="Страница 31"]')).toHaveCount(1)
})

test('deep links and reduced motion work on the published base path', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(articleUrl('from-schematic-to-machine', 45))
  await expect(page.locator('section[aria-label="Страница 45"]')).toBeVisible()
  await expect(page).toHaveURL(/from-schematic-to-machine\/45$/)
  await expect(page.locator('main > div').first()).toHaveCSS('animation-name', 'none')
})

test('all articles load local media without browser errors', async ({ page }) => {
  const errors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => failedRequests.push(request.url()))

  for (const slug of ['memory-of-specialist', 'eight-bit-workshop', 'from-schematic-to-machine']) {
    await page.goto(articleUrl(slug))
    await expect(page.locator('section[aria-label^="Страница"]').first()).toBeVisible()
    const state = await page.evaluate(() => ({
      brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }))
    expect(state).toEqual({ brokenImages: 0, horizontalOverflow: false })
  }

  expect(errors).toEqual([])
  expect(failedRequests).toEqual([])
})
