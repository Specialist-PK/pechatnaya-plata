import type { ArticleMeta } from '@content/types'
import { resolveArticleMedia } from '@content/media'
import styles from './Page.module.css'

export interface PageView {
  number: number
  element: HTMLElement
  content: HTMLElement
}

export function createArticleHero(article: ArticleMeta): HTMLElement {
  return <header class={styles.hero}>
    <span class={styles.rubric}>{article.rubric}</span>
    {article.hero && <img src={resolveArticleMedia(article.slug, article.hero)} alt="Техническая иллюстрация к статье" />}
    <div class={styles.heroTitle}>
      <h1>{article.title}</h1>
      <p>{article.description}</p>
    </div>
  </header> as HTMLElement
}

export function createMagazinePage(article: ArticleMeta, number: number): PageView {
  const content = <div class={styles.content} /> as HTMLElement
  const element = <section class={styles.page} aria-label={`Страница ${number}`}>
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
