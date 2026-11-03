import { articles, loadArticleSource } from '../../content/articles'
import { renderMarkdown, waitForArticleAssets } from '../../content/render'
import type { MagazinePage } from '../../content/types'
import { createArticleHero } from '@components/Page'
import { paginateArticle } from '@lib/paginate'
import styles from './Magazine.module.css'

function route(slug: string, page?: number): string {
  return `#/article/${slug}${page ? `/${page}` : ''}`
}

export function mountMagazine(root: HTMLElement): void {
  const firstArticle = articles[0]
  if (!firstArticle) throw new Error('No published articles')

  let currentArticle = firstArticle
  let pages: MagazinePage[] = []
  let currentIndex = 0
  let spread = false
  let requestId = 0
  let lastWidth = 0
  const sourceCache = new Map<string, string>()

  const previousButton = <button class={styles.control} type="button" aria-label="Предыдущая страница">←</button> as HTMLButtonElement
  const nextButton = <button class={styles.control} type="button" aria-label="Следующая страница">→</button> as HTMLButtonElement
  const counter = <output class={styles.counter} /> as HTMLOutputElement
  const viewport = <div class={styles.viewport} /> as HTMLElement
  const status = <p class={styles.status} role="status" aria-live="polite" /> as HTMLElement
  const measurement = <div class={styles.measurement} aria-hidden="true" /> as HTMLElement
  const catalog = <dialog class={styles.catalog} aria-labelledby="catalog-title" /> as HTMLDialogElement

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
    <p class={styles.colophon}>Прототип журнала. Тексты и векторные иллюстрации созданы с помощью ИИ. Визуальный ориентир — технические журналы 1987 года.</p>,
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
        <nav class={styles.navigation} aria-label="Листание журнала">
          {previousButton}
          {counter}
          {nextButton}
        </nav>
      </main>
      <footer class={styles.siteFooter}>
        <span>Микроэлектроника · домашние компьютеры · техническое творчество</span>
        <span>← → — листать страницы</span>
      </footer>
      {measurement}
      {catalog}
    </div>,
  )

  const metrics = () => {
    const available = Math.min(viewport.clientWidth, 1480)
    const isSpread = available >= 1040
    const gap = isSpread ? 34 : 0
    const width = Math.floor(isSpread ? (available - gap) / 2 : Math.min(available, 720))
    return { spread: isSpread, width, height: Math.round(width * 1.36) }
  }

  const updateUrl = (replace = false) => {
    const page = pages[currentIndex]
    if (!page) return
    const url = route(currentArticle.slug, page.number)
    if (replace) history.replaceState(null, '', url)
    else history.pushState(null, '', url)
  }

  const render = () => {
    const page = pages[currentIndex]
    if (!page) return

    const visible = spread ? pages.slice(currentIndex, currentIndex + 2) : [page]
    viewport.classList.toggle(styles.spread!, spread)
    viewport.classList.remove(styles.turning!)
    void viewport.offsetWidth
    viewport.classList.add(styles.turning!)
    viewport.replaceChildren(...visible.map((item) => item.element))

    const lastVisible = visible.at(-1) ?? page
    counter.value = spread && visible.length > 1
      ? `${page.number}–${lastVisible.number} / ${currentArticle.startPage + pages.length - 1}`
      : `${page.number} / ${currentArticle.startPage + pages.length - 1}`
    previousButton.disabled = currentIndex === 0
    nextButton.disabled = currentIndex >= pages.length - (spread ? 2 : 1)
    status.textContent = `${currentArticle.title}. ${counter.value}`
    document.title = `${currentArticle.title} — Печатная плата`
  }

  const changePage = (direction: number) => {
    const step = spread ? 2 : 1
    const maximum = pages.length - 1
    const next = Math.max(0, Math.min(maximum, currentIndex + direction * step))
    if (next === currentIndex) return
    currentIndex = next
    updateUrl()
    render()
  }

  const openArticle = async (slug: string, requestedPage?: number, canonicalize = false) => {
    const article = articles.find((item) => item.slug === slug) ?? firstArticle
    const id = ++requestId
    status.textContent = 'Подготавливаем страницы…'

    let source = sourceCache.get(article.slug)
    if (!source) {
      source = await loadArticleSource(article.slug)
      sourceCache.set(article.slug, source)
    }

    const nextMetrics = metrics()
    const body = renderMarkdown(source)
    body.prepend(createArticleHero(article))
    await waitForArticleAssets(body)
    if (id !== requestId) return

    const nextPages = paginateArticle({
      article,
      body,
      host: measurement,
      width: nextMetrics.width,
      height: nextMetrics.height,
    })
    if (nextPages.length === 0) throw new Error(`Article is empty: ${article.slug}`)

    currentArticle = article
    pages = nextPages
    spread = nextMetrics.spread
    lastWidth = viewport.clientWidth
    currentIndex = requestedPage === undefined
      ? 0
      : Math.max(0, pages.findIndex((page) => page.number >= requestedPage))
    updateUrl(canonicalize || location.hash !== route(article.slug, pages[currentIndex]?.number))
    render()
  }

  const openFromRoute = () => {
    const match = location.hash.match(/^#\/article\/([^/]+)(?:\/(\d+))?/)
    const slug = match?.[1] ?? firstArticle.slug
    const requestedPage = match?.[2] ? Number(match[2]) : undefined

    if (slug === currentArticle.slug && pages.length > 0) {
      currentIndex = requestedPage === undefined
        ? 0
        : Math.max(0, pages.findIndex((page) => page.number >= requestedPage))
      updateUrl(true)
      render()
      return
    }

    void openArticle(slug, requestedPage, !match).catch((error: unknown) => {
      status.textContent = error instanceof Error ? error.message : String(error)
    })
  }

  previousButton.addEventListener('click', () => changePage(-1))
  nextButton.addEventListener('click', () => changePage(1))
  catalog.addEventListener('click', (event) => {
    if (event.target === catalog) closeCatalog()
  })
  window.addEventListener('hashchange', openFromRoute)
  window.addEventListener('keydown', (event) => {
    if (catalog.open || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    if (event.key === 'ArrowLeft') changePage(-1)
    if (event.key === 'ArrowRight') changePage(1)
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
