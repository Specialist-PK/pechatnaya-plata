import { createMagazinePage } from '@components/Page'
import type { PageView } from '@components/Page'
import type { ArticleMeta, MagazinePage } from '../content/types'
import styles from '../components/Page/Page.module.css'

interface PaginationOptions {
  article: ArticleMeta
  body: HTMLElement
  host: HTMLElement
  width: number
  height: number
}

function overflows(content: HTMLElement): boolean {
  return content.scrollHeight > content.clientHeight + 1
}

export function paginateArticle({ article, body, host, width, height }: PaginationOptions): MagazinePage[] {
  host.replaceChildren()
  const pages: PageView[] = []
  const queue = Array.from(body.children, (element) => element.cloneNode(true) as HTMLElement)
  let current: PageView

  const createPage = () => {
    const pageNumber = article.startPage + pages.length
    const page = createMagazinePage(article, pageNumber)
    page.element.style.setProperty('--page-width', `${width}px`)
    page.element.style.setProperty('--page-height', `${height}px`)
    host.append(page.element)
    pages.push(page)
    return page
  }

  current = createPage()

  const finishPage = () => {
    current = createPage()
  }

  while (queue.length > 0) {
    const block = queue.shift()!
    const previous = current.content.lastElementChild
    current.content.append(block)

    if (!overflows(current.content)) continue

    block.remove()

    if (current.content.childElementCount > 0) {
      if (previous instanceof HTMLHeadingElement) {
        queue.unshift(previous.cloneNode(true) as HTMLElement)
        previous.remove()
      }
      finishPage()
      queue.unshift(block)
      continue
    }

    if (block instanceof HTMLParagraphElement && block.children.length === 0) {
      const words = (block.textContent ?? '').trim().split(/\s+/)
      let low = 1
      let high = words.length - 1
      let best = 0
      const candidate = block.cloneNode(false) as HTMLParagraphElement

      while (low <= high) {
        const middle = Math.floor((low + high) / 2)
        candidate.textContent = words.slice(0, middle).join(' ')
        current.content.replaceChildren(candidate)
        if (overflows(current.content)) high = middle - 1
        else {
          best = middle
          low = middle + 1
        }
      }

      if (best > 0 && best < words.length) {
        candidate.textContent = words.slice(0, best).join(' ')
        const remainder = block.cloneNode(false) as HTMLParagraphElement
        remainder.textContent = words.slice(best).join(' ')
        queue.unshift(remainder)
        finishPage()
        continue
      }
    }

    block.classList.add(styles.oversized!)
    current.content.replaceChildren(block)
    finishPage()
  }

  const last = pages.at(-1)
  if (last && last.content.childElementCount === 0 && pages.length > 1) {
    last.element.remove()
    pages.pop()
  }

  return pages.map(({ number, element }) => ({ number, element }))
}
