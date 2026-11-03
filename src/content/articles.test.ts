import { describe, expect, it } from 'vitest'
import { articles, loadArticleSource } from '@content/articles'
import { resolveArticleMedia } from '@content/media'

describe('article catalog', () => {
  it('contains the historical article in printed page order', () => {
    expect(articles.map((article) => article.slug)).toEqual(['specialist'])
    expect(articles[0]?.startPage).toBe(19)
  })

  it('loads markdown from the article directory without frontmatter', async () => {
    const source = await loadArticleSource('specialist')
    expect(source).toContain('Одноплатный персональный компьютер «Специалист»')
    expect(source).not.toContain('title: "Ваш помощник — компьютер"')
    expect(source).not.toMatch(/^---/)
  })

  it('resolves all seven images within the article directory', () => {
    const paths = [
      'media/specialist-title.jpg',
      'media/figure-1-block-diagram.jpg',
      'media/figure-2-memory-map.jpg',
      'media/figure-3-schematic-part-1.jpg',
      'media/figure-3-schematic-part-2.jpg',
      'media/figure-4-timing-diagram.jpg',
      'media/technical-specifications.jpg',
    ]
    const urls = paths.map((path) => resolveArticleMedia('specialist', path))
    expect(new Set(urls).size).toBe(paths.length)
    urls.forEach((url) => expect(url).not.toBe(''))
    expect(() => resolveArticleMedia('specialist', 'media/missing.jpg')).toThrow('Media not found')
    expect(() => resolveArticleMedia('specialist', 'images/memory-map.jpg')).toThrow('relative to media/')
  })
})
