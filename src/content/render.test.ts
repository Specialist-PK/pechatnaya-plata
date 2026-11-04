import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@content/render'
import { resolveArticleMedia } from '@content/media'

describe('markdown renderer', () => {
  it('renders an article image as a figure with a caption', () => {
    const article = renderMarkdown('![Карта памяти](media/figure-1-block-diagram.webp)', 'specialist')
    const figure = article.querySelector('figure')
    expect(figure).not.toBeNull()
    expect(figure?.querySelector('figcaption')?.textContent).toBe('Карта памяти')
    expect(figure?.querySelector('img')?.getAttribute('src')).toBe(resolveArticleMedia('specialist', 'media/figure-1-block-diagram.webp'))
  })

  it('marks figures with composable print layout hints', () => {
    const article = renderMarkdown('![Карта памяти](media/figure-1-block-diagram.webp "column lead page-end spread-companion embedded-caption")', 'specialist')
    const figure = article.querySelector('figure')
    expect(figure?.classList.contains('column-figure')).toBe(true)
    expect(figure?.classList.contains('lead-figure')).toBe(true)
    expect(figure?.classList.contains('embedded-caption')).toBe(true)
    expect(figure?.hasAttribute('data-page-end')).toBe(true)
    expect(figure?.hasAttribute('data-spread-companion')).toBe(true)
    expect(figure?.querySelector('img')?.hasAttribute('title')).toBe(false)
  })

  it('pairs schematic parts across an intervening column figure', () => {
    const article = renderMarkdown('![Схема, первая часть](media/figure-3-schematic-part-1.webp)\n\n![Карта](media/figure-1-block-diagram.webp "column")\n\n![Схема, вторая часть](media/figure-3-schematic-part-2.webp)', 'specialist')
    expect(article.querySelector('figure[data-spread-start] img')?.getAttribute('src')).toBe(resolveArticleMedia('specialist', 'media/figure-3-schematic-part-1.webp'))
    expect(article.querySelector('figure[data-spread-end] img')?.getAttribute('src')).toBe(resolveArticleMedia('specialist', 'media/figure-3-schematic-part-2.webp'))
    expect(article.querySelector('figure.column-figure')).not.toBeNull()
  })

  it('turns a heading immediately before a table into its caption', () => {
    const article = renderMarkdown('## Параметры\n\n| Параметр | Значение |\n| --- | --- |\n| Частота | 2 МГц |', 'specialist')
    expect(article.querySelector('table caption')?.textContent).toBe('Параметры')
    expect(article.querySelector('h2')).toBeNull()
  })

  it('uses a matching table as an accessible image description', () => {
    const article = renderMarkdown('## Параметры\n\n| Параметр | Значение |\n| --- | --- |\n| Частота | 2 МГц |\n\n![Параметры](media/technical-specifications.webp "embedded-caption")', 'specialist')
    const table = article.querySelector('table.visually-hidden')
    const image = article.querySelector('figure img')
    expect(table?.id).not.toBe('')
    expect(table?.parentElement).toBe(image?.parentElement)
    expect(table?.querySelector('caption')?.textContent).toBe('Параметры')
    expect(image?.getAttribute('aria-describedby')).toBe(table?.id)
  })

  it('escapes raw HTML instead of injecting it', () => {
    const article = renderMarkdown('<button>Не кнопка</button><script>alert(1)</script>', 'specialist')
    expect(article.querySelector('button')).toBeNull()
    expect(article.querySelector('script')).toBeNull()
    expect(article.textContent).toContain('Не кнопка')
  })

  it('leaves external image URLs unchanged', () => {
    const article = renderMarkdown('![Внешняя схема](https://example.com/scheme.svg)', 'specialist')
    expect(article.querySelector('img')?.getAttribute('src')).toBe('https://example.com/scheme.svg')
  })

  it('resolves original page links and opens them in a new tab', () => {
    const article = renderMarkdown('[19](media/original-page-19.webp)', 'specialist')
    const anchor = article.querySelector('a')
    expect(anchor?.getAttribute('href')).toBe(resolveArticleMedia('specialist', 'media/original-page-19.webp'))
    expect(anchor?.target).toBe('_blank')
    expect(anchor?.rel).toBe('noopener noreferrer')
  })

  it('renders technical notation as inline code', () => {
    const article = renderMarkdown('Сигнал `RAS` микросхемы `КР580ИК80А`', 'specialist')
    expect(Array.from(article.querySelectorAll('code'), (code) => code.textContent)).toEqual([
      'RAS',
      'КР580ИК80А',
    ])
  })

  it('renders active-low signals with overline styling', () => {
    const article = renderMarkdown('Сигналы `/RAS` и `/ЧТ`', 'specialist')
    const signals = Array.from(article.querySelectorAll('code.active-low'))
    expect(signals.map((signal) => signal.textContent)).toEqual(['RAS', 'ЧТ'])
  })
})
