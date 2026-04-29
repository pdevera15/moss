import { describe, it, expect } from 'vitest'
import { getMossTheme, buildMossTheme, themeCompartment, mossHighlightStyle, getMossHighlighting } from './mossTheme'
import { Compartment } from '@codemirror/state'

describe('getMossTheme', () => {
  it('returns a defined CM6 extension for light mode', () => {
    expect(getMossTheme(false)).toBeDefined()
  })

  it('returns a defined CM6 extension for dark mode', () => {
    expect(getMossTheme(true)).toBeDefined()
  })

  it('light and dark return different extensions', () => {
    expect(getMossTheme(false)).not.toBe(getMossTheme(true))
  })

  it('exports a Compartment instance', () => {
    expect(themeCompartment).toBeInstanceOf(Compartment)
  })
})

describe('buildMossTheme', () => {
  it('returns a raw CM6 extension (not wrapped in compartment)', () => {
    const raw = buildMossTheme(false)
    expect(raw).toBeDefined()
    // Verify it is a different object from getMossTheme (which wraps in compartment.of)
    expect(raw).not.toBe(getMossTheme(false))
  })

  it('light and dark build different raw extensions', () => {
    expect(buildMossTheme(false)).not.toBe(buildMossTheme(true))
  })
})

describe('mossHighlightStyle', () => {
  it('is defined and exported', () => {
    expect(mossHighlightStyle).toBeDefined()
  })

  it('getMossHighlighting returns a defined CM6 extension', () => {
    expect(getMossHighlighting()).toBeDefined()
  })
})
