import { articles, loadArticleSource } from '@content/articles'
import { renderMarkdown, waitForArticleAssets } from '@content/render'
import type { MagazinePage } from '@content/types'
import { createArticleHero, createContinuousArticle } from '@components/Page'
import { paginateArticle } from '@lib/paginate'
import styles from './Magazine.module.css'

function route(slug: string, page?: number): string {
  return `#/article/${slug}${page ? `/${page}` : ''}`
}

type RouteUpdate = 'push' | 'replace' | 'none'

export function mountMagazine(root: HTMLElement): void {
  const firstArticle = articles[0]
  if (!firstArticle) throw new Error('No published articles')

  let currentArticle = firstArticle
  let pages: MagazinePage[] = []
  let currentIndex = 0
  let spread = false
  let continuous = false
  let requestId = 0
  let lastWidth = 0
  let scrollFrame = 0
  let scrollTarget: number | null = null
  let scrollTargetTimer: ReturnType<typeof setTimeout>
  const sourceCache = new Map<string, string>()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const viewport = <div class={styles.viewport} aria-label="Страницы статьи" /> as HTMLElement
  const status = <p class={styles.status} role="status" aria-live="polite" /> as HTMLElement
  const measurement = <div class={styles.measurement} aria-hidden="true" /> as HTMLElement
  const catalog = <dialog class={styles.catalog} aria-labelledby="catalog-title" /> as HTMLDialogElement
  const footerHint = <span>Прокручивайте ленту · ← → — страницы</span> as HTMLElement

  const closeCatalog = () => catalog.close()
  const openCatalog = () => catalog.showModal()

  const catalogButton = <button class={styles.catalogButton} type="button" onClick={openCatalog}>
    <span aria-hidden="true">▦</span> Содержание
  </button> as HTMLButtonElement

  catalog.append(
    <div class={styles.catalogHeader}>
      <div>
        <span class={styles.kicker}>Выпуск 02 / 1987</span>
        <h2 id="catalog-title">В этом номере</h2>
      </div>
      <button class={styles.control} type="button" aria-label="Закрыть содержание" onClick={closeCatalog}>×</button>
    </div>,
    <div class={styles.catalogList}>
      {articles.map((article) => <button class={styles.catalogEntry} type="button" onClick={() => {
        closeCatalog()
        location.hash = route(article.slug)
      }}>
        <span class={styles.catalogPage}>{article.startPage}</span>
        <span>
          <small>{article.rubric}</small>
          <strong>{article.title}</strong>
          <span>{article.description}</span>
        </span>
      </button>)}
    </div>,
    <p class={styles.colophon}>Историческая публикация А. Волкова из «Моделист-Конструктора», 1987, № 2. Текст и иллюстрации воспроизведены по вычитанной транскрипции и качественному цветному скану выпуска.</p>,
  )

  root.replaceChildren(
    <div class={styles.shell}>
      <header class={styles.masthead}>
        <a class={styles.brand} href={route(firstArticle.slug)} aria-label="Печатная плата, к первой статье">
          <span class={styles.brandMark} aria-hidden="true">ПП</span>
          <span><strong>Печатная плата</strong><small>Журнал технического творчества</small></span>
        </a>
        <div class={styles.issue}><span>Выпуск</span><strong>02 / 1987</strong></div>
        {catalogButton}
      </header>
      <main class={styles.main}>
        {status}
        {viewport}
      </main>
      <footer class={styles.siteFooter}>
        <span>Микроэлектроника · домашние компьютеры · техническое творчество</span>
        {footerHint}
      </footer>
      {measurement}
      {catalog}
    </div>,
  )

  const metrics = () => {
    const isContinuous = viewport.clientWidth < 768
    const available = Math.min(viewport.clientWidth, 2100)
    const isSpread = !isContinuous && available >= 2100
    const width = Math.floor(isSpread ? available / 2 : Math.min(available, 1050))
    return { continuous: isContinuous, spread: isSpread, width, height: Math.round(width * 297 / 210) }
  }

  const rowStartAt = (index: number) => {
    if (!spread || index === 0) return index
    const page = pages[index]
    const previous = pages[index - 1]
    return page && previous && page.number % 2 !== 0 && previous.number === page.number - 1
      ? index - 1
      : index
  }

  const currentRowStart = () => rowStartAt(currentIndex)

  const updateUrl = (mode: Exclude<RouteUpdate, 'none'> = 'replace') => {
    const page = pages[currentIndex]
    if (!page) return
    const url = route(currentArticle.slug, continuous ? undefined : page.number)
    if (location.hash === url) return
    if (mode === 'replace') history.replaceState(null, '', url)
    else history.pushState(null, '', url)
  }

  const updateNavigation = () => {
    const page = pages[currentIndex]
    if (!page) return

    document.title = `${currentArticle.title} — Печатная плата`
    if (continuous) {
      status.textContent = currentArticle.title
      pages.forEach((item) => item.element.removeAttribute('aria-current'))
      return
    }

    const firstVisible = currentRowStart()
    const firstPage = pages[firstVisible]!
    const lastVisible = spread && firstPage.number % 2 === 0 && pages[firstVisible + 1]?.number === firstPage.number + 1
      ? firstVisible + 1
      : firstVisible
    const position = lastVisible > firstVisible
      ? `${pages[firstVisible]!.number}–${pages[lastVisible]!.number} / ${currentArticle.startPage + pages.length - 1}`
      : `${page.number} / ${currentArticle.startPage + pages.length - 1}`
    status.textContent = `${currentArticle.title}. ${position}`

    pages.forEach((item, index) => {
      if (index === currentIndex) item.element.setAttribute('aria-current', 'page')
      else item.element.removeAttribute('aria-current')
    })
  }

  const clearScrollTarget = () => {
    scrollTarget = null
    clearTimeout(scrollTargetTimer)
  }

  const scrollToIndex = (index: number, routeUpdate: RouteUpdate = 'push', smooth = true) => {
    const next = Math.max(0, Math.min(pages.length - 1, index))
    const target = pages[next]
    if (!target) return

    clearScrollTarget()
    currentIndex = next
    scrollTarget = next
    if (routeUpdate !== 'none') updateUrl(routeUpdate)
    updateNavigation()
    target.element.scrollIntoView({
      behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto',
      block: 'start',
    })
    scrollTargetTimer = setTimeout(() => {
      scrollTarget = null
    }, 1000)
  }

  const syncFromScroll = () => {
    if (scrollTarget !== null || pages.length === 0) return

    const readingLine = Math.min(window.innerHeight * 0.33, 240)
    let next = 0
    for (let index = 0; index < pages.length; index += 1) {
      if (pages[index]!.element.getBoundingClientRect().top <= readingLine) next = index
      else break
    }
    next = rowStartAt(next)
    if (next === currentIndex) return

    currentIndex = next
    updateUrl()
    updateNavigation()
  }

  const render = () => {
    viewport.classList.toggle(styles.spread!, spread)
    viewport.classList.toggle(styles.continuous!, continuous)
    viewport.setAttribute('aria-label', continuous ? 'Статья' : 'Страницы статьи')
    footerHint.textContent = continuous ? 'Прокручивайте статью' : 'Прокручивайте ленту · ← → — страницы'
    pages.forEach((item, index) => {
      const start = rowStartAt(index)
      const left = pages[start]
      const right = pages[start + 1]
      const paired = spread && left && left.number % 2 === 0 && right?.number === left.number + 1
      item.element.style.gridColumn = spread && !paired ? (item.number % 2 === 0 ? '1' : '2') : ''
    })
    viewport.replaceChildren(...pages.map((item) => item.element))
    updateNavigation()
  }

  const changePage = (direction: number) => {
    const firstVisible = currentRowStart()
    const left = pages[firstVisible]
    const right = pages[firstVisible + 1]
    const paired = spread && left && left.number % 2 === 0 && right?.number === left.number + 1
    const rowSize = paired ? 2 : 1
    const next = direction > 0
      ? Math.min(pages.length - 1, firstVisible + rowSize)
      : rowStartAt(Math.max(0, firstVisible - 1))
    if (next === currentIndex) return
    scrollToIndex(next)
  }

  const openArticle = async (slug: string, requestedPage?: number, canonicalize = false) => {
    const article = articles.find((item) => item.slug === slug) ?? firstArticle
    const id = ++requestId
    clearScrollTarget()
    status.textContent = 'Подготавливаем статью…'

    let source = sourceCache.get(article.slug)
    if (!source) {
      source = await loadArticleSource(article.slug)
      sourceCache.set(article.slug, source)
    }

    const nextMetrics = metrics()
    const body = renderMarkdown(source, article.slug)
    body.prepend(createArticleHero(article))
    await waitForArticleAssets(body)
    if (id !== requestId) return

    const nextPages: MagazinePage[] = nextMetrics.continuous
      ? [{ number: article.startPage, element: createContinuousArticle(article, body) }]
      : paginateArticle({
        article,
        body,
        host: measurement,
        width: nextMetrics.width,
        height: nextMetrics.height,
      })
    if (nextPages.length === 0) throw new Error(`Article is empty: ${article.slug}`)

    currentArticle = article
    pages = nextPages
    continuous = nextMetrics.continuous
    spread = nextMetrics.spread
    lastWidth = viewport.clientWidth
    currentIndex = requestedPage === undefined
      ? 0
      : Math.max(0, pages.findIndex((page) => page.number >= requestedPage))
    render()
    const expectedRoute = route(article.slug, continuous ? undefined : pages[currentIndex]?.number)
    if (canonicalize || location.hash !== expectedRoute) updateUrl('replace')
    scrollToIndex(currentIndex, 'none', false)
  }

  const openFromRoute = () => {
    const match = location.hash.match(/^#\/article\/([^/]+)(?:\/(\d+))?/)
    const slug = match?.[1] ?? firstArticle.slug
    const requestedPage = match?.[2] ? Number(match[2]) : undefined

    if (slug === currentArticle.slug && pages.length > 0) {
      currentIndex = requestedPage === undefined
        ? 0
        : Math.max(0, pages.findIndex((page) => page.number >= requestedPage))
      updateUrl('replace')
      scrollToIndex(currentIndex, 'none', false)
      return
    }

    void openArticle(slug, requestedPage, !match).catch((error: unknown) => {
      status.textContent = error instanceof Error ? error.message : String(error)
    })
  }

  catalog.addEventListener('click', (event) => {
    if (event.target === catalog) closeCatalog()
  })
  window.addEventListener('hashchange', openFromRoute)
  window.addEventListener('scroll', () => {
    if (scrollFrame !== 0) return
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0
      syncFromScroll()
    })
  }, { passive: true })
  window.addEventListener('wheel', clearScrollTarget, { passive: true })
  window.addEventListener('touchstart', clearScrollTarget, { passive: true })
  window.addEventListener('keydown', (event) => {
    if (catalog.open || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      changePage(event.key === 'ArrowLeft' ? -1 : 1)
    } else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      clearScrollTarget()
    }
  })

  let resizeTimer: ReturnType<typeof setTimeout>
  const observer = new ResizeObserver(() => {
    if (Math.abs(viewport.clientWidth - lastWidth) < 24) return
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const page = pages[currentIndex]
      if (!page) return
      void openArticle(currentArticle.slug, page.number, true).catch((error: unknown) => {
        status.textContent = error instanceof Error ? error.message : String(error)
      })
    }, 180)
  })
  observer.observe(viewport)
  openFromRoute()
}
