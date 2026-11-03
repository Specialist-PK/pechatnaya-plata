import { matchesGlob } from './glob'

export type Job = 'test' | 'web'
export const JOBS: readonly Job[] = ['test', 'web']

const DOCS = [
  'docs/**',
  '**/*.md',
  '.github/ISSUE_TEMPLATE/**',
  '.github/PULL_REQUEST_TEMPLATE.md',
]

const IRRELEVANT: Record<Job, string[]> = {
  test: [...DOCS],
  web: [
    ...DOCS,
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'tools/ci/**',
  ],
}

export function select(changedFiles: string[]): Record<Job, boolean> {
  const result = {} as Record<Job, boolean>
  for (const job of JOBS) {
    result[job] = changedFiles.length === 0 || changedFiles.some((file) =>
      !IRRELEVANT[job].some((glob) => matchesGlob(glob, file)),
    )
  }
  return result
}
