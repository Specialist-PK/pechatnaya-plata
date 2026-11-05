// Machine-readable hardware specification of the "Specialist" single-board computer.
// Data is extracted from A. Volkov's article «Ваш помощник — компьютер»
// («Modelist-Konstruktor», 1987, No. 2) and published for external tools
// (emulator, FPGA implementation, debug adapters) in the Specialist-PK org.

export interface MemoryRegion {
  /** Human-readable region name in Russian, as printed in the article. */
  readonly name: string
  /** Inclusive start address. */
  readonly start: number
  /** Exclusive end address (start + size). */
  readonly end: number
  /** Region size in bytes. */
  readonly size: number
}

export interface VideoTiming {
  /** Line sync period in microseconds. */
  readonly linePeriodUs: number
  /** Blanking interval within a line scanline in microseconds. */
  readonly lineBlankingUs: number
  /** Frame period in milliseconds. */
  readonly framePeriodMs: number
  /** Vertical blanking interval in microseconds. */
  readonly verticalBlankingUs: number
}

export interface SpecialistSpec {
  readonly schemaVersion: 1
  readonly name: string
  readonly cpu: { readonly model: string; readonly clockHz: number }
  readonly ram: { readonly model: string; readonly sizesKb: readonly number[] }
  readonly rom: { readonly model: string; readonly chipSelectKb: number; readonly maxChips: number }
  readonly pio: { readonly model: string }
  readonly memoryMap: { readonly totalBytes: number; readonly regions: readonly MemoryRegion[] }
  readonly video: {
    readonly displayMemoryStart: number
    readonly refreshCycleUs: number
    readonly arbitrationSlotNs: number
    readonly timings: VideoTiming
  }
  readonly modes: {
    readonly textColumns: number
    readonly textRows: number
    readonly graphicsWidth: number
    readonly graphicsHeight: number
  }
  readonly cassette: { readonly densityBitsPerMm: number; readonly format: 'micro-80' }
  readonly power: { readonly watts: number }
  readonly source: { readonly articleSlug: string; readonly citation: string }
}

const KB = 1024

/** Article table rows in printed order; addresses are parsed from `F800H–FFFFH` notation. */
const REGION_ROWS: ReadonlyArray<readonly [name: string, sizeKb: number, startHex: string, endHex: string]> = [
  ['Регистры', 2, 'F800', 'FFFF'],
  ['Дополнительные ПЗУ и внешние устройства', 12, 'C800', 'F7FF'],
  ['ПЗУ', 2, 'C000', 'C7FF'],
  ['ОЗУ, экранная область', 12, '9000', 'BFFF'],
  ['ОЗУ пользователя', 4, '8000', '8FFF'],
  ['Резервное ОЗУ', 16, '4000', '7FFF'],
  ['ОЗУ пользователя', 16, '0000', '3FFF'],
] as const

function parseRegion(name: string, sizeKb: number, startHex: string, endHex: string): MemoryRegion {
  const start = Number.parseInt(startHex, 16)
  const end = Number.parseInt(endHex, 16) + 1
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error(`Invalid address range for region "${name}"`)
  }
  return { name, start, end, size: sizeKb * KB }
}

export const specialistSpec: SpecialistSpec = {
  schemaVersion: 1,
  name: 'Специалист',
  cpu: { model: 'КР580ИК80А', clockHz: 2_000_000 },
  ram: { model: 'К565РУ3', sizesKb: [32, 48] },
  rom: { model: 'К573РФ2', chipSelectKb: 2, maxChips: 7 },
  pio: { model: 'КР580ИК55' },
  memoryMap: {
    totalBytes: 64 * KB,
    regions: REGION_ROWS.map(([name, sizeKb, startHex, endHex]) => parseRegion(name, sizeKb, startHex, endHex)),
  },
  video: {
    displayMemoryStart: 0x9000,
    refreshCycleUs: 128,
    arbitrationSlotNs: 500,
    timings: {
      linePeriodUs: 64,
      lineBlankingUs: 16,
      framePeriodMs: 20,
      verticalBlankingUs: 3584,
    },
  },
  modes: { textColumns: 64, textRows: 25, graphicsWidth: 384, graphicsHeight: 256 },
  cassette: { densityBitsPerMm: 32, format: 'micro-80' },
  power: { watts: 10 },
  source: {
    articleSlug: 'specialist',
    citation: 'А. Волков, «Ваш помощник — компьютер», «Моделист-Конструктор», 1987, № 2, с. 19–22',
  },
}

export interface SpecIssue {
  readonly message: string
}

/** Validate internal consistency of the specification (sizes, ranges, coverage of the 64 KiB space). */
export function validateSpec(spec: SpecialistSpec = specialistSpec): SpecIssue[] {
  const issues: SpecIssue[] = []
  const capacity = spec.memoryMap.totalBytes

  for (const region of spec.memoryMap.regions) {
    if (region.end <= region.start) {
      issues.push({ message: `Region "${region.name}" has an empty or reversed range` })
      continue
    }
    if (region.end > capacity) {
      issues.push({ message: `Region "${region.name}" exceeds the ${capacity}-byte address space` })
    }
    if (region.end - region.start !== region.size) {
      issues.push({ message: `Region "${region.name}" size does not match its address range` })
    }
  }

  const sorted = [...spec.memoryMap.regions].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!
    const curr = sorted[i]!
    if (curr.start < prev.end) {
      issues.push({ message: `Regions "${prev.name}" and "${curr.name}" overlap` })
    }
  }

  const covered = sorted.reduce((sum, region) => sum + region.size, 0)
  if (covered !== capacity) {
    issues.push({ message: `Regions cover ${covered} bytes, expected ${capacity}` })
  }

  if (spec.video.displayMemoryStart !== spec.memoryMap.regions.find((r) => r.name.includes('экранная'))?.start) {
    issues.push({ message: 'Video memory start does not match the screen region in the memory map' })
  }

  return issues
}

/** Serialize the specification to pretty-printed JSON for distribution alongside the site build. */
export function specToJson(spec: SpecialistSpec = specialistSpec): string {
  return `${JSON.stringify(spec, null, 2)}\n`
}
