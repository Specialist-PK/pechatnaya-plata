import type { ArticleMeta } from '@content/types'
import { resolveArticleMedia } from '@content/media'
import styles from './Page.module.css'

export interface PageView {
  number: number
  element: HTMLElement
  content: HTMLElement
}

export function createArticleHero(article: ArticleMeta): HTMLElement {
  return <header class={styles.hero} aria-label={article.title}>
    {article.hero && <img
      src={resolveArticleMedia(article.slug, article.hero)}
      alt={`Заставка статьи «${article.title}»`}
    />}
  </header> as HTMLElement
}

export function createContinuousArticle(article: ArticleMeta, body: HTMLElement): HTMLElement {
  const element = <article class={`${styles.content} ${styles.continuous}`} aria-label={article.title} /> as HTMLElement
  element.replaceChildren(...Array.from(body.children))
  return element
}

export function createMagazinePage(article: ArticleMeta, number: number): PageView {
  const content = <div class={styles.content} /> as HTMLElement
  const element = <section class={`${styles.page}${number % 2 === 0 ? ` ${styles.even}` : ''}`} aria-label={`Страница ${number}`}>
    <header class={styles.header}>
      <span>Печатная плата</span>
      <span>{article.issue}</span>
    </header>
    {content}
    <footer class={styles.footer}>
      <span>{article.rubric}</span>
      <span class={styles.pageNumber}>{number}</span>
    </footer>
  </section> as HTMLElement

  return { number, element, content }
}
