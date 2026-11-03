import manifest from 'virtual:articles'
import type { ArticleMeta } from '@content/types'

const articleModules = import.meta.glob('../../content/articles/*/index.md', {
  query: '?raw',
  import: 'default',
})

export const articles = [...manifest as ArticleMeta[]].sort((a, b) => a.startPage - b.startPage)

export async function loadArticleSource(slug: string): Promise<string> {
  const path = `../../content/articles/${slug}/index.md`
  const load = articleModules[path]

  if (!load) throw new Error(`Article not found: ${slug}`)

  const source = await load()
  if (typeof source !== 'string') throw new Error(`Invalid article source: ${slug}`)

  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}
