import { createMagazinePage } from '@components/Page'
import type { PageView } from '@components/Page'
import type { ArticleMeta, MagazinePage } from '@content/types'
import styles from '@components/Page/Page.module.css'

interface PaginationOptions {
  article: ArticleMeta
  body: HTMLElement
  host: HTMLElement
  width: number
  height: number
}

function overflows(content: HTMLElement): boolean {
  return content.scrollHeight > content.clientHeight + 1
    || content.scrollWidth > content.clientWidth + 1
}

export function paginateArticle({ article, body, host, width, height }: PaginationOptions): MagazinePage[] {
  host.replaceChildren()
  const pages: PageView[] = []
  const queue = Array.from(body.children, (element) => element.cloneNode(true) as HTMLElement)
  let current: PageView

  const createPage = () => {
    const pageNumber = article.startPage + pages.length
    const page = createMagazinePage(pageNumber)
    page.element.style.setProperty('--page-width', `${width}px`)
    page.element.style.setProperty('--page-height', `${height}px`)
    host.append(page.element)
    pages.push(page)
    return page
  }

  current = createPage()

  const [hero, source, openingFigure] = queue
  if (hero?.tagName === 'HEADER' && source?.tagName === 'BLOCKQUOTE' && openingFigure?.tagName === 'FIGURE') {
    const openingText = document.createElement('div')
    openingText.className = styles.openingText!
    openingText.setAttribute('data-opening-text', '')
    queue.splice(0, 3)
    current.element.setAttribute('data-opening-layout', '')
    current.content.append(hero, openingText, openingFigure, source)
  }

  const finishPage = () => {
    current = createPage()
  }

  const finishSpread = (withLead = false) => {
    const endIndex = queue.findIndex((element) => element.hasAttribute('data-spread-end'))
    if (endIndex < 0) return false
    const [end] = queue.splice(endIndex, 1)
    finishPage()
    current.content.append(end!)
    finishPage()
    if (withLead) {
      const leadIndex = queue.findIndex((element) => element.classList.contains('lead-figure'))
      if (leadIndex >= 0) {
        const [lead] = queue.splice(leadIndex, 1)
        current.content.append(lead!)
      }
    }
    return true
  }

  const placeSpreadCompanion = (block: HTMLElement): boolean => {
    if (!block.hasAttribute('data-spread-companion') || !current.content.querySelector('[data-spread-start]')) return false
    const displaced: HTMLElement[] = []
    current.content.append(block)

    while (overflows(current.content)) {
      const previous = block.previousElementSibling
      if (!(previous instanceof HTMLElement) || previous.tagName !== 'P') break
      previous.remove()
      displaced.unshift(previous)
    }

    if (!overflows(current.content) && finishSpread(true)) {
      queue.unshift(...displaced)
      return true
    }

    block.remove()
    current.content.append(...displaced)
    return false
  }

  while (queue.length > 0) {
    const block = queue.shift()!
    const spreadStart = block.hasAttribute('data-spread-start')
    const spreadEnd = block.hasAttribute('data-spread-end')

    if (placeSpreadCompanion(block)) continue

    if (!spreadEnd && block.tagName === 'FIGURE' && current.content.querySelector('[data-spread-start]') && finishSpread()) {
      queue.unshift(block)
      continue
    }

    if (spreadEnd && current.content.childElementCount > 0) {
      finishPage()
      queue.unshift(block)
      continue
    }

    if (block.classList.contains('lead-figure') && current.content.childElementCount > 0) {
      finishPage()
      queue.unshift(block)
      continue
    }

    if (spreadStart && (article.startPage + pages.length - 1) % 2 !== 0) {
      finishPage()
      queue.unshift(block)
      continue
    }

    const target = current.element.hasAttribute('data-opening-layout')
      ? current.content.querySelector<HTMLElement>('[data-opening-text]')!
      : current.content
    const previous = target.lastElementChild
    target.append(block)

    if (!overflows(current.content) && !overflows(target)) {
      if (spreadEnd || block.hasAttribute('data-page-end')) finishPage()
      continue
    }

    block.remove()

    if (current.content.querySelector('[data-spread-start]')) {
      const companionIndex = queue.findIndex((element) => element.hasAttribute('data-spread-companion'))
      if (companionIndex >= 0) {
        const [companion] = queue.splice(companionIndex, 1)
        queue.unshift(block)
        if (placeSpreadCompanion(companion!)) continue
        queue.shift()
        queue.splice(companionIndex, 0, companion!)
      }

      if (finishSpread()) {
        queue.unshift(block)
        continue
      }
    }

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
