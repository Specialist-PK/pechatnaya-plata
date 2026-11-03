import { expect, test } from '@playwright/test'

const basePath = '/pechatnaya-plata/'

function articleUrl(slug: string, page?: number): string {
  return `${basePath}#/article/${slug}${page ? `/${page}` : ''}`
}

test('desktop A4 spreads stay in one vertically scrolling DOM', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(articleUrl('memory-of-specialist'))
  const pages = page.locator('section[aria-label^="Страница"]')
  const first = page.locator('section[aria-label="Страница 19"]')
  const second = page.locator('section[aria-label="Страница 20"]')
  await expect(pages).toHaveCount(3)
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(second).toBeInViewport({ ratio: 0.5 })

  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  const thirdBox = await page.locator('section[aria-label="Страница 21"]').boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  expect(thirdBox).not.toBeNull()
  expect(firstBox!.height / firstBox!.width).toBeCloseTo(297 / 210, 2)
  expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(firstBox!.x + firstBox!.width - secondBox!.x)).toBeLessThanOrEqual(1)
  expect(thirdBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height)

  await first.evaluate((element) => element.setAttribute('data-preserved', 'yes'))
  await page.getByRole('button', { name: 'Следующая страница' }).click()
  await expect(page).toHaveURL(/memory-of-specialist\/21$/)
  await expect(page.locator('section[aria-label="Страница 21"]')).toBeInViewport({ ratio: 0.5 })
  await expect(first).toHaveAttribute('data-preserved', 'yes')
  await expect(page.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()

  const overflow = await pages.evaluateAll((items) => items.flatMap((item) => {
    const content = item.querySelector('[class*="content"]')
    return content && content.scrollHeight > content.clientHeight + 1
      ? [item.getAttribute('aria-label')]
      : []
  }))
  expect(overflow).toEqual([])
  expect(errors).toEqual([])
})

test('mobile reader, catalog order and resize remain consistent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(articleUrl('memory-of-specialist'))
  const first = page.locator('section[aria-label="Страница 19"]')
  const second = page.locator('section[aria-label="Страница 20"]')
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(second).toBeAttached()
  await expect(first.getByRole('heading', { name: 'Память домашнего компьютера' })).toBeVisible()
  await expect(first.getByText('Как процессор, память и экран делят одно адресное пространство')).toBeVisible()
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
    'Память домашнего компьютера',
    'Восемь бит для технического творчества',
    'От схемы к работающей машине',
  ])
  await page.locator('dialog [class*="catalogEntry"]').nth(1).click()
  await expect(page).toHaveURL(/eight-bit-workshop\/31$/)
  await expect(page.locator('section[aria-label="Страница 31"]')).toBeInViewport({ ratio: 0.5 })

  await page.setViewportSize({ width: 1440, height: 1050 })
  const singleFirst = page.locator('section[aria-label="Страница 31"]')
  const singleSecond = page.locator('section[aria-label="Страница 32"]')
  await expect(singleFirst).toBeInViewport({ ratio: 0.5 })
  await expect(singleFirst).toHaveCSS('width', '1050px')
  const singleFirstBox = await singleFirst.boundingBox()
  const singleSecondBox = await singleSecond.boundingBox()
  expect(singleFirstBox!.width).toBe(1050)
  expect(singleSecondBox!.y).toBeGreaterThanOrEqual(singleFirstBox!.y + singleFirstBox!.height)

  await page.setViewportSize({ width: 2560, height: 1600 })
  await expect(singleFirst).toBeInViewport({ ratio: 0.5 })
  await expect(singleSecond).toBeInViewport({ ratio: 0.5 })
  await expect(singleFirst).toHaveCount(1)
  expect((await singleFirst.boundingBox())!.width).toBe(1050)
  expect((await singleSecond.boundingBox())!.width).toBe(1050)
})

test('deep links, keyboard navigation and browser history work on the published base path', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(articleUrl('from-schematic-to-machine', 45))
  await expect(page.locator('section[aria-label="Страница 45"]')).toBeInViewport({ ratio: 0.5 })
  await expect(page).toHaveURL(/from-schematic-to-machine\/45$/)
  await expect(page.locator('[aria-label="Страницы статьи"]')).toHaveCSS('animation-name', 'none')

  await page.goto(articleUrl('memory-of-specialist', 19))
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/memory-of-specialist\/21$/)
  await expect(page.locator('section[aria-label="Страница 21"]')).toBeInViewport({ ratio: 0.5 })
  await page.goBack()
  await expect(page).toHaveURL(/memory-of-specialist\/19$/)
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
})

test('manual vertical scrolling synchronizes the current page URL', async ({ page }) => {
  await page.goto(articleUrl('memory-of-specialist'))
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })

  await page.mouse.move(200, 200)
  await page.mouse.wheel(0, 2400)
  await expect(page).toHaveURL(/memory-of-specialist\/21$/)
  await expect(page.locator('section[aria-label="Страница 21"]')).toBeInViewport({ ratio: 0.5 })

  await page.mouse.wheel(0, -2400)
  await expect(page).toHaveURL(/memory-of-specialist\/19$/)
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
})

test('all articles load local media without browser errors', async ({ page }) => {
  const errors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => failedRequests.push(request.url()))

  for (const slug of ['memory-of-specialist', 'eight-bit-workshop', 'from-schematic-to-machine']) {
    await page.goto(articleUrl(slug))
    await expect(page.locator('section[aria-label^="Страница"]').first()).toBeInViewport({ ratio: 0.5 })
    const state = await page.evaluate(() => ({
      brokenImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }))
    expect(state).toEqual({ brokenImages: 0, horizontalOverflow: false })
  }

  expect(errors).toEqual([])
  expect(failedRequests).toEqual([])
})
