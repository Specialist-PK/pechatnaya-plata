import MarkdownIt from 'markdown-it'
import { resolveArticleMedia } from '@content/media'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

export function renderMarkdown(source: string, slug: string): HTMLElement {
  const article = document.createElement('article')
  article.className = 'article-body'
  article.innerHTML = markdown.render(source)

  for (const image of article.querySelectorAll('img')) {
    const source = image.getAttribute('src') ?? ''
    if (source.startsWith('media/')) {
      image.src = resolveArticleMedia(slug, source)
    } else if (!/^(?:[a-z]+:|\/\/)/i.test(source)) {
      image.src = `${import.meta.env.BASE_URL}${source.replace(/^\.\//, '').replace(/^\//, '')}`
    }
    image.loading = 'eager'
    image.decoding = 'async'

    const paragraph = image.parentElement
    if (paragraph instanceof HTMLParagraphElement && paragraph.childElementCount === 1 && !(paragraph.textContent ?? '').trim()) {
      const figure = document.createElement('figure')
      const caption = document.createElement('figcaption')
      caption.textContent = image.alt
      figure.append(image, caption)
      paragraph.replaceWith(figure)
    }
  }

  return article
}

export async function waitForArticleAssets(article: HTMLElement): Promise<void> {
  await document.fonts.ready
  await Promise.all(Array.from(article.querySelectorAll('img'), async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => reject(new Error(`Image failed: ${image.src}`)), { once: true })
      })
    }
    await image.decode()
  }))
}
