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

  const oddRubricBox = await first.locator('[class*="footer"] span').first().boundingBox()
  const oddNumberBox = await first.locator('[class*="pageNumber"]').boundingBox()
  const evenRubricBox = await second.locator('[class*="footer"] span').first().boundingBox()
  const evenNumberBox = await second.locator('[class*="pageNumber"]').boundingBox()
  expect(oddNumberBox!.x).toBeGreaterThan(oddRubricBox!.x)
  expect(evenNumberBox!.x).toBeLessThan(evenRubricBox!.x)

  const schematicStart = page.locator('figure[data-spread-start]')
  const schematicEnd = page.locator('figure[data-spread-end]')
  const schematicStartPage = pages.filter({ has: schematicStart })
  const schematicEndPage = pages.filter({ has: schematicEnd })
  await expect(schematicStart).toHaveCount(1)
  await expect(schematicEnd).toHaveCount(1)
  await expect(schematicStart.locator('img')).toHaveJSProperty('naturalHeight', 3000)
  await expect(schematicEnd.locator('img')).toHaveJSProperty('naturalHeight', 3000)
  await expect(schematicStartPage.locator('[class*="content"] > *')).toHaveCount(1)
  await expect(schematicEndPage.locator('[class*="content"] > *')).toHaveCount(1)
  await expect(schematicStart.locator('figcaption')).toBeHidden()
  await expect(schematicEnd.locator('figcaption')).toBeHidden()
  const startPageNumber = Number((await schematicStartPage.getAttribute('aria-label'))?.replace('Страница ', ''))
  const endPageNumber = Number((await schematicEndPage.getAttribute('aria-label'))?.replace('Страница ', ''))
  expect(endPageNumber).toBe(startPageNumber + 1)
  const startPageBox = await schematicStartPage.boundingBox()
  const endPageBox = await schematicEndPage.boundingBox()
  const startImageBox = await schematicStart.locator('img').boundingBox()
  const endImageBox = await schematicEnd.locator('img').boundingBox()
  expect(Math.abs(startPageBox!.y - endPageBox!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(startImageBox!.height - endImageBox!.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(startImageBox!.y - endImageBox!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(startImageBox!.x + startImageBox!.width - endImageBox!.x)).toBeLessThanOrEqual(2)

  await first.evaluate((element) => element.setAttribute('data-preserved', 'yes'))
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/specialist\/21$/)
  await expect(third).toBeInViewport({ ratio: 0.5 })
  await expect(first).toHaveAttribute('data-preserved', 'yes')

  await expect(first.locator('[class*="content"]')).toHaveCSS('column-count', '2')
  await expect(first.locator('[class*="content"]')).toHaveCSS('column-rule-width', '0px')
  await expect(first.locator('[class*="content"] > p').first()).not.toHaveCSS('text-indent', '0px')
  await expect(first.locator('blockquote p')).toHaveCSS('text-indent', '0px')
  const overflow = await pages.evaluateAll((items) => items.flatMap((item) => {
    const content = item.querySelector('[class*="content"]')
    return content && (
      content.scrollHeight > content.clientHeight + 1
      || content.scrollWidth > content.clientWidth + 1
    )
      ? [item.getAttribute('aria-label')]
      : []
  }))
  expect(overflow).toEqual([])
  expect(errors).toEqual([])
})

test('mobile reader uses one continuous column and desktop restores A4 pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(articleUrl())
  const continuous = page.locator('article[aria-label="Ваш помощник — компьютер"]')
  await expect(continuous).toBeVisible()
  await expect(continuous).toHaveCSS('column-count', '1')
  await expect(page.locator('section[aria-label^="Страница"]')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Листание журнала' })).toHaveCount(0)
  expect(await page.locator('main').evaluate((element) => [
    getComputedStyle(element).paddingLeft,
    getComputedStyle(element).paddingRight,
  ])).toEqual(['0px', '0px'])
  await expect(continuous.getByRole('img', { name: 'Заставка статьи «Ваш помощник — компьютер»' })).toBeVisible()
  await expect(continuous.getByRole('heading', { name: 'Ваш помощник — компьютер' })).toHaveCount(0)
  await expect(continuous.getByText('Историческая статья А. Волкова об одноплатном компьютере «Специалист»')).toHaveCount(0)
  await expect(continuous.locator('figure')).toHaveCount(6)
  await expect(continuous).toContainText('А. ВОЛКОВ')
  await expect(continuous).toContainText('(Продолжение следует)')
  expect(await continuous.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  expect((await continuous.boundingBox())!.height).toBeGreaterThan(844)

  await page.getByRole('button', { name: 'Содержание' }).click()
  await expect(page.locator('dialog [class*="catalogEntry"] strong')).toHaveText([
    'Ваш помощник — компьютер',
  ])
  await page.locator('dialog [class*="catalogEntry"]').click()
  await expect(page).toHaveURL(/specialist$/)
  await expect(continuous).toBeVisible()

  await page.setViewportSize({ width: 1440, height: 1050 })
  const first = page.locator('section[aria-label="Страница 19"]')
  const second = page.locator('section[aria-label="Страница 20"]')
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(continuous).toHaveCount(0)
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
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(new RegExp(`specialist/${lastNumber}$`))
  await expect(page.locator(`section[aria-label="Страница ${lastNumber}"]`)).toBeInViewport({ ratio: 0.5 })
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


test('system sans-serif renders Cyrillic without font downloads', async ({ page }) => {
  const fontRequests: string[] = []
  page.on('request', (request) => {
    if (/\.(woff2?|ttf|otf)$/.test(new URL(request.url()).pathname)) fontRequests.push(request.url())
  })

  await page.goto(articleUrl())
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })

  const state = await page.evaluate(() => ({
    fontFaces: [...document.fonts].map((face) => face.family),
    bodyFamily: getComputedStyle(document.body).fontFamily,
    contentFamily: getComputedStyle(document.querySelector('section[aria-label="Страница 19"] [class*="content"]')!).fontFamily,
    runningHeaderFamily: getComputedStyle(document.querySelector('section[aria-label="Страница 19"] > header')!).fontFamily,
  }))
  expect(state.fontFaces).toEqual([])
  expect(state.bodyFamily).toBe('sans-serif')
  expect(state.contentFamily).toBe('sans-serif')
  expect(state.runningHeaderFamily).toBe('sans-serif')
  expect(fontRequests).toEqual([])
})
