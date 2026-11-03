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
})
