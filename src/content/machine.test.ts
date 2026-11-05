import { describe, expect, it } from 'vitest'
import { specialistSpec, specToJson, validateSpec } from '@content/machine'

describe('specialist machine-readable specification', () => {
  it('passes internal consistency checks', () => {
    expect(validateSpec()).toEqual([])
  })

  it('describes the CPU and chips from the article', () => {
    expect(specialistSpec.cpu).toEqual({ model: 'КР580ИК80А', clockHz: 2_000_000 })
    expect(specialistSpec.ram.model).toBe('К565РУ3')
    expect(specialistSpec.rom.model).toBe('К573РФ2')
    expect(specialistSpec.pio.model).toBe('КР580ИК55')
  })

  it('covers the full 64 KiB address space with non-overlapping regions', () => {
    const regions = [...specialistSpec.memoryMap.regions].sort((a, b) => a.start - b.start)
    expect(regions[0]?.start).toBe(0x0000)
    expect(regions.at(-1)?.end).toBe(0x10000)
    for (let i = 1; i < regions.length; i++) {
      expect(regions[i]!.start).toBe(regions[i - 1]!.end)
    }
  })

  it('keeps memory map addresses in sync with the article table', () => {
    const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, '0')
    const byName = new Map(specialistSpec.memoryMap.regions.map((r) => [r.name, r]))
    expect(byName.get('Регистры')).toMatchObject({ start: 0xf800, end: 0x10000 })
    expect(byName.get('ПЗУ')).toMatchObject({ start: 0xc000, size: 2 * 1024 })
    expect(byName.get('ОЗУ, экранная область')).toMatchObject({ start: 0x9000, size: 12 * 1024 })
    expect(hex(specialistSpec.video.displayMemoryStart)).toBe('9000')
  })

  it('stores video timings from the article text', () => {
    expect(specialistSpec.video.timings).toEqual({
      linePeriodUs: 64,
      lineBlankingUs: 16,
      framePeriodMs: 20,
      verticalBlankingUs: 3584,
    })
    expect(specialistSpec.video.refreshCycleUs).toBe(128)
    expect(specialistSpec.video.arbitrationSlotNs).toBe(500)
  })

  it('reports issues for inconsistent specifications', () => {
    const broken = structuredClone(specialistSpec) as Mutable<typeof specialistSpec>
    broken.memoryMap.regions[0] = { ...broken.memoryMap.regions[0]!, size: 1024 }
    const messages = validateSpec(broken).map((issue) => issue.message)
    expect(messages.some((m) => m.includes('size does not match')))
    expect(messages.some((m) => m.includes('cover'))).toBe(true)
  })

  it('serializes to valid JSON with schema version', () => {
    const parsed = JSON.parse(specToJson())
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.name).toBe('Специалист')
    expect(parsed.source.articleSlug).toBe('specialist')
  })
})

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] }
