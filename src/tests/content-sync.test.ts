import { describe, it, expect } from 'vitest'
import { 
    convertQuartoToMilkdown, 
    convertMilkdownToQuarto 
} from '@/utils/quarto-syntax'

describe('Content Sync: Quarto ↔ Milkdown conversion roundtrip', () => {
    
    // Helper to test roundtrip conversion
    const testRoundtrip = (input: string) => {
        const toMilkdown = convertQuartoToMilkdown(input)
        const backToQuarto = convertMilkdownToQuarto(toMilkdown)
        return { original: input, milkdown: toMilkdown, quarto: backToQuarto }
    }

    // ========================================================================
    // Callout Syntax
    // ========================================================================
    
    describe('Callout blocks', () => {
        it('preserves basic callout blocks via roundtrip', () => {
            const input = `::: {.callout-note}
This is a note.
:::`
            const result = testRoundtrip(input)
            // The content should be preserved (exact format may differ slightly)
            expect(result.quarto).toContain('.callout-note')
            expect(result.quarto).toContain('This is a note.')
        })

        it('preserves callout with title attribute', () => {
            const input = `::: {.callout-warning title="Important Warning"}
Be careful!
:::`
            const result = testRoundtrip(input)
            expect(result.quarto).toContain('.callout-warning')
            expect(result.quarto).toContain('title=')
        })

        it('preserves all callout types', () => {
            const types = ['note', 'warning', 'tip', 'important', 'caution']
            
            for (const type of types) {
                const input = `::: {.callout-${type}}
Content
:::`
                const result = testRoundtrip(input)
                expect(result.quarto).toContain(`.callout-${type}`)
            }
        })

        it('handles shorthand callout syntax', () => {
            const input = `::: callout-tip
Quick tip!
:::`
            const result = convertQuartoToMilkdown(input)
            expect(result).toContain(':::callout-tip')
        })
    })

    // ========================================================================
    // Standard Markdown (should NOT be modified)
    // ========================================================================
    
    describe('Standard markdown preservation', () => {
        it('preserves frontmatter unchanged', () => {
            const input = `---
title: "My Document"
author: "Jane Doe"
---

# Content`
            const result = convertQuartoToMilkdown(input)
            expect(result).toContain('title: "My Document"')
            expect(result).toContain('author: "Jane Doe"')
        })

        it('preserves code blocks with language', () => {
            const input = "```python\nprint('hello')\n```"
            const result = convertQuartoToMilkdown(input)
            expect(result).toBe(input)
        })

        it('preserves horizontal rules', () => {
            const input = `# Section 1

Content

---

# Section 2`
            const result = convertQuartoToMilkdown(input)
            expect(result).toContain('---')
        })

        it('preserves inline math', () => {
            const input = 'The formula $E = mc^2$ is famous.'
            const result = convertQuartoToMilkdown(input)
            expect(result).toBe(input)
        })

        it('preserves display math', () => {
            const input = `$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$`
            const result = convertQuartoToMilkdown(input)
            expect(result).toBe(input)
        })

        it('preserves links and images', () => {
            const input = 'Check [this link](https://example.com) and ![image](./image.png)'
            const result = convertQuartoToMilkdown(input)
            expect(result).toBe(input)
        })

        it('preserves lists', () => {
            const input = `- Item 1
- Item 2
  - Nested item

1. First
2. Second`
            const result = convertQuartoToMilkdown(input)
            expect(result).toBe(input)
        })
    })

    // ========================================================================
    // Edge Cases
    // ========================================================================
    
    describe('Edge cases', () => {
        it('handles empty string', () => {
            expect(convertQuartoToMilkdown('')).toBe('')
            expect(convertMilkdownToQuarto('')).toBe('')
        })

        it('handles content with no callouts', () => {
            const input = '# Just a heading\n\nSome text.'
            const result = convertQuartoToMilkdown(input)
            expect(result).toBe(input)
        })

        it('preserves mixed content', () => {
            const input = `---
title: "Mixed Content"
---

# Introduction

Regular paragraph.

::: {.callout-note}
A note!
:::

\`\`\`python
x = 1
\`\`\`

---

## Conclusion`
            const result = testRoundtrip(input)
            expect(result.quarto).toContain('title: "Mixed Content"')
            expect(result.quarto).toContain('.callout-note')
            expect(result.quarto).toContain('```python')
        })

        it('handles indented callouts', () => {
            const input = `  ::: {.callout-tip}
  Indented callout
  :::`
            const result = convertQuartoToMilkdown(input)
            expect(result).toContain(':::callout-tip')
        })

        it('handles callout with ID and class', () => {
            const input = `::: {#my-id .callout-note .custom-class}
Content with ID
:::`
            const result = convertQuartoToMilkdown(input)
            expect(result).toContain(':::callout-note')
            // ID and class should be preserved in some form
            expect(result).toContain('id="my-id"')
        })
    })

    // ========================================================================
    // Non-Callout Div Fences (should NOT be converted)
    // ========================================================================
    
    describe('Non-callout divs', () => {
        it('preserves generic fenced divs unchanged', () => {
            const input = `::: {.panel-tabset}
Content
:::`
            const result = convertQuartoToMilkdown(input)
            // Generic divs should NOT be converted to callout format
            expect(result).toBe(input)
        })

        it('preserves column divs unchanged', () => {
            const input = `::: {.columns}
Content
:::`
            const result = convertQuartoToMilkdown(input)
            expect(result).toBe(input)
        })
    })
})
