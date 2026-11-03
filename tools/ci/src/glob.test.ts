import { describe, expect, it } from 'vitest'
import { matchesGlob } from './glob'

describe('matchesGlob', () => {
  it('keeps a single star inside one path segment', () => {
    expect(matchesGlob('src/*/index.ts', 'src/content/index.ts')).toBe(true)
    expect(matchesGlob('src/*/index.ts', 'src/content/articles/index.ts')).toBe(false)
  })

  it('lets a double star cross directories, including none', () => {
    expect(matchesGlob('docs/**', 'docs/adr/0001.md')).toBe(true)
    expect(matchesGlob('**/*.md', 'README.md')).toBe(true)
    expect(matchesGlob('**/*.md', 'docs/adr/0001.md')).toBe(true)
    expect(matchesGlob('**/*.md', 'docs/adr/0001.txt')).toBe(false)
  })

  it('matches the whole path and treats dots literally', () => {
    expect(matchesGlob('package.json', 'package.json')).toBe(true)
    expect(matchesGlob('package.json', 'tools/package.json')).toBe(false)
    expect(matchesGlob('package.json', 'packageXjson')).toBe(false)
  })
})
