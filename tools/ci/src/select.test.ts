import { describe, expect, it } from 'vitest'
import { type Job, select } from './select'

const ran = (files: string[]): Job[] => Object.entries(select(files))
  .filter(([, run]) => run)
  .map(([job]) => job as Job)
  .sort()

describe('select', () => {
  it('skips heavy jobs for documentation-only changes', () => {
    expect(ran(['README.md', 'docs/adr/0004-x.md', '.github/PULL_REQUEST_TEMPLATE.md'])).toEqual([])
    expect(ran(['.github/ISSUE_TEMPLATE/task.yml'])).toEqual([])
  })

  it('runs only unit checks for CI selector and unit test changes', () => {
    expect(ran(['tools/ci/src/select.ts'])).toEqual(['test'])
    expect(ran(['src/content/render.test.ts'])).toEqual(['test'])
    expect(ran(['src/lib/jsx/jsx-runtime.test.tsx'])).toEqual(['test'])
  })

  it('runs both jobs for application and browser changes', () => {
    expect(ran(['src/content/render.ts'])).toEqual(['test', 'web'])
    expect(ran(['e2e/magazine.spec.ts'])).toEqual(['test', 'web'])
    expect(ran(['playwright.config.ts'])).toEqual(['test', 'web'])
  })

  it('runs both jobs for manifests and workflows', () => {
    for (const file of ['package.json', 'bun.lock', '.github/workflows/ci.yml', '.github/workflows/deploy.yml']) {
      expect(ran([file]), file).toEqual(['test', 'web'])
    }
  })

  it('runs both jobs for unknown paths and when changes are unknown', () => {
    expect(ran(['some/new/place/file.xyz'])).toEqual(['test', 'web'])
    expect(ran([])).toEqual(['test', 'web'])
  })

  it('runs a job when any changed file is relevant', () => {
    expect(ran(['README.md', 'src/content/render.ts'])).toEqual(['test', 'web'])
  })
})
