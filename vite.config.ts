import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'

const fromRoot = (path: string) => fileURLToPath(new URL(`./${path}`, import.meta.url))
const articlesDirectory = fromRoot('content/articles')
const virtualArticlesId = 'virtual:articles'
const resolvedVirtualArticlesId = `\0${virtualArticlesId}`

function readArticles() {
  return readdirSync(articlesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = join(articlesDirectory, entry.name, 'index.md')
      const source = readFileSync(file, 'utf8')
      const { data } = matter(source)
      const slug = entry.name
      const required = ['title', 'description', 'issue', 'published', 'rubric']

      for (const field of required) {
        if (typeof data[field] !== 'string' && typeof data[field] !== 'number') {
          throw new Error(`${slug}/index.md: missing frontmatter field "${field}"`)
        }
      }

      if (!Array.isArray(data.authors) || data.authors.length === 0) {
        throw new Error(`${slug}/index.md: authors must be a non-empty list`)
      }

      if (data.draft === true) return []

      return [{
        slug,
        title: String(data.title),
        description: String(data.description),
        issue: String(data.issue),
        published: String(data.published),
        rubric: String(data.rubric),
        authors: data.authors.map(String),
        startPage: Number(data.startPage ?? 1),
        hero: data.hero ? String(data.hero) : undefined,
      }]
    })
}

function articlesPlugin(): Plugin {
  return {
    name: 'magazine-articles',
    resolveId(id) {
      if (id === virtualArticlesId) return resolvedVirtualArticlesId
    },
    load(id) {
      if (id === resolvedVirtualArticlesId) {
        return `export default ${JSON.stringify(readArticles())}`
      }
    },
    configureServer(server) {
      const reload = (file: string) => {
        if (!file.startsWith(articlesDirectory) || !file.endsWith('.md')) return
        const module = server.moduleGraph.getModuleById(resolvedVirtualArticlesId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.add(articlesDirectory)
      server.watcher.on('add', reload)
      server.watcher.on('change', reload)
      server.watcher.on('unlink', reload)
    },
  }
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [articlesPlugin()],
  resolve: {
    alias: {
      'jsx-dom': fromRoot('src/lib/jsx'),
      '@components': fromRoot('src/components'),
      '@content': fromRoot('src/content'),
      '@lib': fromRoot('src/lib'),
    },
  },
  css: { devSourcemap: true },
  build: { sourcemap: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
