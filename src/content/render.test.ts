import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@content/render'
import { resolveArticleMedia } from '@content/media'

describe('markdown renderer', () => {
  it('renders an article image as a figure with a caption', () => {
    const article = renderMarkdown('![Карта памяти](media/figure-2-memory-map.jpg)', 'specialist')
    const figure = article.querySelector('figure')
    expect(figure).not.toBeNull()
    expect(figure?.querySelector('figcaption')?.textContent).toBe('Карта памяти')
    expect(figure?.querySelector('img')?.getAttribute('src')).toBe(resolveArticleMedia('specialist', 'media/figure-2-memory-map.jpg'))
  })

  it('marks figures requested for a text column', () => {
    const article = renderMarkdown('![Карта памяти](media/figure-2-memory-map.jpg "column")', 'specialist')
    expect(article.querySelector('figure')?.classList.contains('column-figure')).toBe(true)
    expect(article.querySelector('img')?.hasAttribute('title')).toBe(false)
  })

  it('turns a heading immediately before a table into its caption', () => {
    const article = renderMarkdown('## Параметры\n\n| Параметр | Значение |\n| --- | --- |\n| Частота | 2 МГц |', 'specialist')
    expect(article.querySelector('table caption')?.textContent).toBe('Параметры')
    expect(article.querySelector('h2')).toBeNull()
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
