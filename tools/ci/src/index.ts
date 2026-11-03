import { spawnSync } from 'node:child_process'
import { JOBS, select } from './select'

function changedFiles(): string[] | undefined {
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return undefined
  const output = spawnSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' })
  return output.status === 0 ? output.stdout.split('\n').filter(Boolean) : undefined
}

function main() {
  const files = changedFiles()
  const selected = select(files ?? [])
  console.error(files === undefined ? 'Changed files are unknown: running all jobs' : `Changed files: ${files.length}`)
  for (const job of JOBS) {
    console.error(`  ${selected[job] ? 'run' : 'skip'}: ${job}`)
    console.log(`${job}=${selected[job]}`)
  }
}

if (import.meta.main) main()
