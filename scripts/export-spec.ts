import { mkdir } from 'node:fs/promises'
import { specToJson, validateSpec } from '../src/content/machine.ts'

const issues = validateSpec()
if (issues.length > 0) {
  for (const issue of issues) console.error(`spec: ${issue.message}`)
  throw new Error('Machine-readable specification failed validation')
}

await mkdir('dist/spec', { recursive: true })
await Bun.write('dist/spec/specialist.json', specToJson())
console.log('Wrote dist/spec/specialist.json')
