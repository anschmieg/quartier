import { describe, expect, it } from 'vitest'
import { normalizeCodeCellLanguage, parseCodeCellMetadata, updateCodeCellOption } from '@/components/editor/code-cell-metadata'

describe('code cell metadata', () => {
  it('normalizes Quarto fenced languages', () => {
    expect(normalizeCodeCellLanguage('{python}')).toBe('python')
    expect(normalizeCodeCellLanguage(' R ')).toBe('r')
  })

  it('parses language, label, fig caption, echo, and source body', () => {
    const metadata = parseCodeCellMetadata('{python}', '#| label: fig-example\n#| fig-cap: "Example figure"\n#| echo: false\n\nprint("hi")')

    expect(metadata).toEqual({
      language: 'python',
      label: 'fig-example',
      figCap: 'Example figure',
      echo: 'false',
      source: 'print("hi")',
    })
  })

  it('updates existing cell options and inserts missing options before source', () => {
    const original = '#| label: old\n\nprint("hi")'

    expect(updateCodeCellOption(original, 'label', 'fig-new')).toContain('#| label: fig-new')
    expect(updateCodeCellOption(original, 'fig-cap', 'New caption')).toBe('#| label: old\n#| fig-cap: "New caption"\n\nprint("hi")')
  })
})

