import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const basePath = '/pechatnaya-plata/'

function articleUrl(page?: number): string {
  return `${basePath}#/article/specialist${page ? `/${page}` : ''}`
}

async function lastPageNumber(page: Page): Promise<number> {
  const pages = page.locator('section[aria-label^="Страница"]')
  await expect(pages.first()).toBeAttached()
  const label = await pages.last().getAttribute('aria-label')
  return Number(label?.replace('Страница ', ''))
}

test('desktop A4 spreads stay in one vertically scrolling DOM', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(articleUrl())
  const pages = page.locator('section[aria-label^="Страница"]')
  const first = page.locator('section[aria-label="Страница 19"]')
  const second = page.locator('section[aria-label="Страница 20"]')
  const third = page.locator('section[aria-label="Страница 21"]')
  await expect.poll(async () => pages.count()).toBeGreaterThan(3)
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(second).toBeInViewport({ ratio: 0.5 })

  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  const thirdBox = await third.boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  expect(thirdBox).not.toBeNull()
  expect(firstBox!.width).toBe(1050)
  expect(firstBox!.height / firstBox!.width).toBeCloseTo(297 / 210, 2)
  expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(firstBox!.x + firstBox!.width - secondBox!.x)).toBeLessThanOrEqual(1)
  expect(thirdBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height)

  await first.evaluate((element) => element.setAttribute('data-preserved', 'yes'))
  await page.getByRole('button', { name: 'Следующая страница' }).click()
  await expect(page).toHaveURL(/specialist\/21$/)
  await expect(third).toBeInViewport({ ratio: 0.5 })
  await expect(first).toHaveAttribute('data-preserved', 'yes')

  const overflow = await pages.evaluateAll((items) => items.flatMap((item) => {
    const content = item.querySelector('[class*="content"]')
    return content && content.scrollHeight > content.clientHeight + 1
      ? [item.getAttribute('aria-label')]
      : []
  }))
  expect(overflow).toEqual([])
  expect(errors).toEqual([])
})

test('mobile reader, single-item catalog and resize remain consistent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(articleUrl())
  const first = page.locator('section[aria-label="Страница 19"]')
  const second = page.locator('section[aria-label="Страница 20"]')
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(second).toBeAttached()
  await expect(first.getByRole('heading', { name: 'Ваш помощник — компьютер' })).toBeVisible()
  await expect(first.getByText('Историческая статья А. Волкова об одноплатном компьютере «Специалист»')).toBeVisible()
  expect(await page.locator('section[aria-label^="Страница"]').count()).toBeGreaterThan(2)

  const mobileBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  expect(mobileBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  expect(mobileBox!.height / mobileBox!.width).toBeCloseTo(297 / 210, 2)
  expect(secondBox!.y).toBeGreaterThanOrEqual(mobileBox!.y + mobileBox!.height)
  expect(Math.abs(secondBox!.x - mobileBox!.x)).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Содержание' }).click()
  await expect(page.locator('dialog [class*="catalogEntry"] strong')).toHaveText([
    'Ваш помощник — компьютер',
  ])
  await page.locator('dialog [class*="catalogEntry"]').click()
  await expect(page).toHaveURL(/specialist\/19$/)
  await expect(first).toBeInViewport({ ratio: 0.5 })

  await page.setViewportSize({ width: 1440, height: 1050 })
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(first).toHaveCSS('width', '1050px')
  const singleFirstBox = await first.boundingBox()
  const singleSecondBox = await second.boundingBox()
  expect(singleSecondBox!.y).toBeGreaterThanOrEqual(singleFirstBox!.y + singleFirstBox!.height)

  await page.setViewportSize({ width: 2560, height: 1600 })
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(second).toBeInViewport({ ratio: 0.5 })
  await expect(first).toHaveCount(1)
  expect((await first.boundingBox())!.width).toBe(1050)
  expect((await second.boundingBox())!.width).toBe(1050)
})

test('deep links, keyboard navigation and browser history work on the published base path', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(articleUrl(19))
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
  await expect(page.locator('[aria-label="Страницы статьи"]')).toHaveCSS('animation-name', 'none')

  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/specialist\/21$/)
  await expect(page.locator('section[aria-label="Страница 21"]')).toBeInViewport({ ratio: 0.5 })
  await page.goBack()
  await expect(page).toHaveURL(/specialist\/19$/)
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })

  const lastNumber = await lastPageNumber(page)
  await page.goto(articleUrl(lastNumber))
  await expect(page.locator(`section[aria-label="Страница ${lastNumber}"]`)).toBeInViewport({ ratio: 0.5 })
  await expect(page.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()
})

test('manual vertical scrolling synchronizes first and last page URLs', async ({ page }) => {
  await page.goto(articleUrl())
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
  const lastNumber = await lastPageNumber(page)
  const lastRowNumber = lastNumber - (lastNumber - 19) % 2

  await page.mouse.move(200, 200)
  await page.mouse.wheel(0, 40000)
  await expect(page).toHaveURL(new RegExp(`specialist/${lastRowNumber}$`))
  await expect(page.locator(`section[aria-label="Страница ${lastNumber}"]`)).toBeInViewport({ ratio: 0.5 })

  await page.mouse.wheel(0, -40000)
  await expect(page).toHaveURL(/specialist\/19$/)
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
})

test('all seven historical images load without browser errors', async ({ page }) => {
  const errors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => failedRequests.push(request.url()))

  await page.goto(articleUrl())
  await expect(page.locator('section[aria-label^="Страница"]').first()).toBeInViewport({ ratio: 0.5 })
  const state = await page.evaluate(() => ({
    brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
    uniqueImages: new Set([...document.images].map((image) => image.src)).size,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }))
  expect(state).toEqual({ brokenImages: 0, uniqueImages: 7, horizontalOverflow: false })
  expect(errors).toEqual([])
  expect(failedRequests).toEqual([])
})
