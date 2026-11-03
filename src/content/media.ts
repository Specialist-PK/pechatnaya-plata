const mediaUrls = import.meta.glob('../../content/articles/*/media/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function resolveArticleMedia(slug: string, path: string): string {
  if (!path.startsWith('media/')) {
    throw new Error(`Article media must be relative to media/: ${path}`)
  }

  const key = `../../content/articles/${slug}/${path}`
  const url = mediaUrls[key]
  if (typeof url !== 'string') throw new Error(`Media not found: ${slug}/${path}`)
  return url
}
