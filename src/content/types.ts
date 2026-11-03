export interface ArticleMeta {
  slug: string
  title: string
  description: string
  issue: string
  published: string
  rubric: string
  authors: string[]
  startPage: number
  hero?: string
}

export interface MagazinePage {
  number: number
  element: HTMLElement
}
