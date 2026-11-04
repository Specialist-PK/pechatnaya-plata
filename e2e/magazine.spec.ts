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

test('desktop uses one readable body font and preserves schematic spreads', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto(articleUrl())
  const pages = page.locator('section[aria-label^="Страница"]')
  const first = page.locator('section[aria-label="Страница 19"]')
  const second = page.locator('section[aria-label="Страница 20"]')
  const third = page.locator('section[aria-label="Страница 21"]')
  const openingText = first.locator('[data-opening-text]')
  const openingHero = first.locator('[class*="content"] > header')
  const openingFigure = first.locator('figure:has(img[alt^="Рис. 1."])')
  await expect(pages).toHaveCount(6)
  await expect(first).toBeInViewport({ ratio: 0.5 })
  await expect(openingFigure).toHaveCount(1)
  await expect(openingText.locator(':scope > p')).toHaveCount(6)
  await expect(openingText).toHaveCSS('column-count', '2')
  await expect(second).not.toBeInViewport({ ratio: 0.1 })

  const paragraphFontSizes = await pages.locator('[class*="content"] > p, [data-opening-text] > p').evaluateAll((paragraphs) => [
    ...new Set(paragraphs.map((paragraph) => getComputedStyle(paragraph).fontSize)),
  ])
  expect(paragraphFontSizes).toHaveLength(1)

  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  const thirdBox = await third.boundingBox()
  const openingHeroBox = await openingHero.boundingBox()
  const openingTextBox = await openingText.boundingBox()
  const openingFigureBox = await openingFigure.boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  expect(thirdBox).not.toBeNull()
  expect(firstBox!.width).toBe(1050)
  expect(firstBox!.height / firstBox!.width).toBeCloseTo(297 / 210, 2)
  expect(firstBox!.x).toBeGreaterThan(secondBox!.x)
  expect(secondBox!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height)
  expect(Math.abs(secondBox!.y - thirdBox!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(secondBox!.x + secondBox!.width - thirdBox!.x)).toBeLessThanOrEqual(1)
  expect(openingHeroBox!.y + openingHeroBox!.height).toBeLessThanOrEqual(openingTextBox!.y + 1)
  expect(openingTextBox!.y + openingTextBox!.height).toBeLessThanOrEqual(openingFigureBox!.y + 1)

  const memoryMap = page.locator('figure.column-figure:has(img[alt^="Рис. 2."])')
  const memoryMapPage = pages.filter({ has: memoryMap })
  const memoryDescription = page.locator('table').filter({ hasText: 'Рис. 2. Схема распределения памяти' })
  await expect(memoryMap).toHaveCount(1)
  await expect(memoryMapPage).toHaveAttribute('aria-label', 'Страница 20')
  await expect(memoryMap).toHaveCSS('column-span', 'none')
  await expect(memoryMap.locator('figcaption')).toHaveText('Рис. 2. Схема распределения памяти')
  await expect(memoryMap.locator('figcaption')).toBeHidden()
  await expect(memoryDescription).toHaveCSS('clip-path', 'inset(50%)')
  expect(await memoryMap.locator('img').getAttribute('aria-describedby')).toBe(await memoryDescription.getAttribute('id'))
  await expect(memoryDescription.locator('tbody tr')).toHaveCount(7)
  await expect(memoryDescription.locator('tbody tr').first()).toContainText('F800H–FFFFH')
  await expect(memoryDescription.locator('tbody tr').last()).toContainText('0000H–3FFFH')

  const oddNumberBox = await first.locator('[class*="pageNumber"]').boundingBox()
  const evenNumberBox = await second.locator('[class*="pageNumber"]').boundingBox()
  expect(oddNumberBox!.x - firstBox!.x).toBeGreaterThan(firstBox!.width / 2)
  expect(evenNumberBox!.x - secondBox!.x).toBeLessThan(secondBox!.width / 2)
  await expect(openingHero).toHaveCount(1)

  const timingDiagram = page.locator('figure:has(img[alt^="Рис. 4."])')
  const timingDiagramPage = pages.filter({ has: timingDiagram })
  await expect(timingDiagramPage).toHaveAttribute('aria-label', 'Страница 22')
  await expect(timingDiagram).toHaveClass(/lead-figure/)
  await expect(timingDiagramPage.locator('[class*="content"]')).toHaveCSS('column-count', '3')

  const specificationsTable = page.locator('table').filter({ hasText: 'Технические характеристики компьютера «Специалист»' })
  const specificationsFigure = page.locator('figure:has(img[alt^="Технические характеристики"])')
  const specificationsImage = specificationsFigure.locator('img')
  await expect(specificationsTable).toHaveCSS('column-span', 'none')
  await expect(specificationsTable).toHaveCSS('position', 'absolute')
  await expect(specificationsTable).toHaveCSS('clip-path', 'inset(50%)')
  await expect(specificationsFigure).toHaveCSS('column-span', 'none')
  await expect(specificationsTable.locator('caption')).toHaveText('Технические характеристики компьютера «Специалист»')
  expect(await specificationsImage.getAttribute('aria-describedby')).toBe(await specificationsTable.getAttribute('id'))
  await expect(specificationsTable).toHaveCSS('font-size', await specificationsTable.evaluate((table) => getComputedStyle(table.parentElement!).fontSize))
  await expect(specificationsTable.locator('thead')).toBeHidden()
  await expect(specificationsTable.locator('td').first()).toHaveCSS('border-top-width', '0px')
  await expect(specificationsTable.locator('td').first()).toHaveCSS('border-right-width', '0px')
  await expect(specificationsTable.locator('td').first()).toHaveCSS('border-bottom-width', '0px')
  await expect(specificationsTable.locator('td').first()).toHaveCSS('border-left-width', '0px')
  const specificationsTablePage = pages.filter({ has: specificationsTable })
  const specificationsFigurePage = pages.filter({ has: specificationsFigure })
  await expect(specificationsTablePage).toHaveAttribute('aria-label', 'Страница 24')
  await expect(specificationsFigurePage).toHaveAttribute('aria-label', 'Страница 24')

  const schematicStart = page.locator('figure[data-spread-start]')
  const schematicEnd = page.locator('figure[data-spread-end]')
  const schematicStartPage = pages.filter({ has: schematicStart })
  const schematicEndPage = pages.filter({ has: schematicEnd })
  await expect(schematicStartPage).toHaveAttribute('aria-label', 'Страница 20')
  await expect(schematicEndPage).toHaveAttribute('aria-label', 'Страница 21')
  await expect(schematicStart.locator('img')).toHaveJSProperty('naturalHeight', 3064)
  await expect(schematicEnd.locator('img')).toHaveJSProperty('naturalHeight', 3064)
  await expect(schematicStartPage.locator('[class*="content"] > p')).toHaveCount(3)
  await expect(schematicStartPage.locator('[class*="content"] > *')).toHaveCount(5)
  await expect(schematicEndPage.locator('[class*="content"] > *')).toHaveCount(1)
  await expect(schematicStart.locator('figcaption')).toBeHidden()
  await expect(schematicEnd.locator('figcaption')).toBeHidden()
  const startImage = schematicStart.locator('img')
  const endImage = schematicEnd.locator('img')
  const startImageBox = await startImage.boundingBox()
  const endImageBox = await endImage.boundingBox()
  const startScale = await startImage.evaluate((image) => image.getBoundingClientRect().width / (image as HTMLImageElement).naturalWidth)
  const endScale = await endImage.evaluate((image) => image.getBoundingClientRect().width / (image as HTMLImageElement).naturalWidth)
  expect(Math.abs(startScale - endScale)).toBeLessThanOrEqual(0.00001)
  expect(Math.abs(startImageBox!.height - endImageBox!.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(startImageBox!.y - endImageBox!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(startImageBox!.x + startImageBox!.width - endImageBox!.x)).toBeLessThanOrEqual(2)

  await first.evaluate((element) => element.setAttribute('data-preserved', 'yes'))
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/specialist\/20$/)
  await expect(second).toBeInViewport({ ratio: 0.5 })
  await expect(third).toBeInViewport({ ratio: 0.5 })
  await expect(first).toHaveAttribute('data-preserved', 'yes')

  await expect(openingText).toHaveCSS('column-count', '2')
  await expect(first.locator('[class*="content"]')).toHaveCSS('column-rule-width', '0px')
  await expect(timingDiagramPage.locator('[class*="content"] > p').first()).not.toHaveCSS('text-indent', '0px')
  await expect(first.locator('blockquote p')).toHaveCSS('text-indent', '0px')
  const overflow = await pages.evaluateAll((items) => items.flatMap((item) => {
    const regions = [item.querySelector('[class*="content"]'), item.querySelector('[data-opening-text]')]
    return regions.some((region) => region && (
      region.scrollHeight > region.clientHeight + 1
      || region.scrollWidth > region.clientWidth + 1
    ))
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
  await expect(continuous.locator(':scope > p').first()).toHaveCSS('font-size', '19.2px')
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
  await expect(continuous.locator('table.visually-hidden')).toHaveCount(2)
  expect(await continuous.evaluate((article) => {
    const children = Array.from(article.children)
    const firstParagraph = article.querySelector(':scope > p')
    return children.slice(0, children.findIndex((element) => element === firstParagraph)).map((element) => element.tagName)
  })).toEqual(['HEADER', 'BLOCKQUOTE', 'FIGURE'])
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
  await expect(second).not.toBeInViewport({ ratio: 0.1 })
  await expect(first).toHaveCount(1)
  expect((await first.boundingBox())!.width).toBe(1050)
  expect((await second.boundingBox())!.width).toBe(1050)

  await page.goto(articleUrl(20))
  const third = page.locator('section[aria-label="Страница 21"]')
  await expect(second).toBeInViewport({ ratio: 0.5 })
  await expect(third).toBeInViewport({ ratio: 0.5 })
})

test('deep links, keyboard navigation and browser history work on the published base path', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(articleUrl(19))
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
  await expect(page.locator('[aria-label="Страницы статьи"]')).toHaveCSS('animation-name', 'none')

  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/specialist\/20$/)
  await expect(page.locator('section[aria-label="Страница 20"]')).toBeInViewport({ ratio: 0.5 })
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
  const lastRowNumber = lastNumber % 2 === 0 ? lastNumber : lastNumber - 1

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

test('system fonts render body text and technical notation without downloads', async ({ page }) => {
  const fontRequests: string[] = []
  page.on('request', (request) => {
    if (/\.(woff2?|ttf|otf)$/.test(new URL(request.url()).pathname)) fontRequests.push(request.url())
  })

  await page.goto(articleUrl())
  await expect(page.locator('section[aria-label="Страница 19"]')).toBeInViewport({ ratio: 0.5 })
  const technicalNotation = page.locator('code').first()
  await expect(technicalNotation).toHaveText('ЭВМ')
  await expect(technicalNotation).toHaveCSS('font-family', 'monospace')
  await expect(technicalNotation).toHaveCSS('font-weight', '700')
  const activeLowSignals = page.locator('code.active-low')
  await expect(activeLowSignals).toHaveCount(8)
  await expect(activeLowSignals.first()).toHaveText('RAS')
  await expect(activeLowSignals.first()).toHaveCSS('text-decoration-line', 'overline')

  const state = await page.evaluate(() => ({
    fontFaces: [...document.fonts].map((face) => face.family),
    bodyFamily: getComputedStyle(document.body).fontFamily,
    contentFamily: getComputedStyle(document.querySelector('section[aria-label="Страница 19"] [class*="content"]')!).fontFamily,
    pageNumberFamily: getComputedStyle(document.querySelector('section[aria-label="Страница 19"] > footer')!).fontFamily,
  }))
  expect(state.fontFaces).toEqual([])
  expect(state.bodyFamily).toBe('sans-serif')
  expect(state.contentFamily).toBe('sans-serif')
  expect(state.pageNumberFamily).toBe('sans-serif')
  expect(fontRequests).toEqual([])
})
