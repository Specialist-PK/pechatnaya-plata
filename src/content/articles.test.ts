import { describe, expect, it } from 'vitest'
import { articles, loadArticleSource } from '@content/articles'
import { resolveArticleMedia } from '@content/media'

describe('article catalog', () => {
  it('sorts articles by printed page', () => {
    expect(articles.map((article) => article.slug)).toEqual([
      'memory-of-specialist',
      'eight-bit-workshop',
      'from-schematic-to-machine',
    ])
  })

  it('loads markdown from the article directory without frontmatter', async () => {
    const source = await loadArticleSource('memory-of-specialist')
    expect(source).toContain('## Компьютер начинается с памяти')
    expect(source).not.toContain('title: "Память домашнего компьютера"')
    expect(source).not.toMatch(/^---/)
  })

  it('resolves media within the owning article directory', () => {
    const memoryMap = resolveArticleMedia('memory-of-specialist', 'media/memory-map.svg')
    const lab = resolveArticleMedia('eight-bit-workshop', 'media/computer-lab.svg')
    expect(memoryMap).not.toBe('')
    expect(lab).not.toBe('')
    expect(memoryMap).not.toBe(lab)
    expect(() => resolveArticleMedia('memory-of-specialist', 'media/missing.svg')).toThrow('Media not found')
    expect(() => resolveArticleMedia('memory-of-specialist', 'images/memory-map.svg')).toThrow('relative to media/')
  })
})
