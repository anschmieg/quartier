import { describe, it, expect } from 'vitest'
import {
    hasFrontmatter,
    extractFrontmatter,
    validateFrontmatterBoundaries,
    type FrontmatterDiagnostic
} from '@/utils/quarto-syntax'

describe('Frontmatter boundary detection', () => {
    // ========================================================================
    // hasFrontmatter() tests
    // ========================================================================
    
    describe('hasFrontmatter', () => {
        it('detects valid frontmatter at document start', () => {
            const doc = `---
title: "Test"
author: "Jane"
---

# Content here`
            expect(hasFrontmatter(doc)).toBe(true)
        })

        it('requires frontmatter at document start', () => {
            const doc = `# Some content

---
title: "Late Frontmatter"
---`
            expect(hasFrontmatter(doc)).toBe(false)
        })

        it('rejects empty frontmatter', () => {
            const doc = `---
---

# Content`
            expect(hasFrontmatter(doc)).toBe(false)
        })

        it('rejects frontmatter with only whitespace', () => {
            const doc = `---
   
   
---

# Content`
            expect(hasFrontmatter(doc)).toBe(false)
        })

        it('accepts frontmatter with single key', () => {
            const doc = `---
title: "Single Key"
---`
            expect(hasFrontmatter(doc)).toBe(true)
        })

        it('handles CRLF line endings', () => {
            const doc = `---\r\ntitle: "Windows"\r\n---\r\n\r\n# Content`
            expect(hasFrontmatter(doc)).toBe(true)
        })

        it('returns false for empty string', () => {
            expect(hasFrontmatter('')).toBe(false)
        })

        it('returns false for undefined', () => {
            expect(hasFrontmatter(undefined as any)).toBe(false)
        })
    })

    // ========================================================================
    // extractFrontmatter() tests
    // ========================================================================

    describe('extractFrontmatter', () => {
        it('extracts frontmatter and body separately', () => {
            const doc = `---
title: "Test"
---

# Body content`
            const result = extractFrontmatter(doc)
            expect(result).not.toBeNull()
            expect(result!.frontmatter).toBe('title: "Test"')
            expect(result!.body).toBe('\n# Body content')
            // endLine counts: opening ---(1) + content line(2) + closing ---(3) + empty line after(4) = 4
            expect(result!.endLine).toBe(4)
        })

        it('returns null when no frontmatter', () => {
            const doc = `# No frontmatter here

Just content.`
            expect(extractFrontmatter(doc)).toBeNull()
        })

        it('returns null when frontmatter not at start', () => {
            const doc = `Some intro text

---
title: "Late"
---`
            expect(extractFrontmatter(doc)).toBeNull()
        })

        it('handles multiline frontmatter', () => {
            const doc = `---
title: "Long Title"
author:
  - name: "First Author"
    affiliation: "University A"
  - name: "Second Author"
    affiliation: "University B"
date: 2024-01-15
---

# Introduction`
            const result = extractFrontmatter(doc)
            expect(result).not.toBeNull()
            expect(result!.frontmatter).toContain('author:')
            expect(result!.frontmatter).toContain('Second Author')
        })
    })

    // ========================================================================
    // validateFrontmatterBoundaries() tests
    // ========================================================================

    describe('validateFrontmatterBoundaries', () => {
        it('returns no diagnostics for valid frontmatter', () => {
            const doc = `---
title: "Valid"
---

# Content

Regular HR below:

---

More content.`
            const diagnostics = validateFrontmatterBoundaries(doc)
            // Should have at most an info-level diagnostic about HR after frontmatter
            const errors = diagnostics.filter(d => d.severity === 'error')
            expect(errors.length).toBe(0)
        })

        it('detects unclosed frontmatter', () => {
            const doc = `---
title: "Missing Closer"
author: "Test"

# This should be body but frontmatter never closed`
            const diagnostics = validateFrontmatterBoundaries(doc)
            expect(diagnostics.some(d => 
                d.severity === 'error' && 
                d.message.includes('Unclosed frontmatter')
            )).toBe(true)
        })

        it('detects indented closing fence', () => {
            const doc = `---
title: "Test"
  ---

# Content`
            const diagnostics = validateFrontmatterBoundaries(doc)
            expect(diagnostics.some(d => 
                d.severity === 'warning' && 
                d.message.includes('Indented')
            )).toBe(true)
        })

        it('warns on empty frontmatter block', () => {
            const doc = `---
---

# Content`
            const diagnostics = validateFrontmatterBoundaries(doc)
            expect(diagnostics.some(d => 
                d.severity === 'warning' && 
                d.message.includes('Empty frontmatter')
            )).toBe(true)
        })

        it('handles horizontal rule immediately after frontmatter', () => {
            const doc = `---
title: "Test"
---
---

# Above HR is valid`
            const diagnostics = validateFrontmatterBoundaries(doc)
            // Should be info level, not error
            const hrDiagnostic = diagnostics.find(d => 
                d.message.includes('Horizontal rule')
            )
            expect(hrDiagnostic?.severity).toBe('info')
        })

        it('returns empty for empty string', () => {
            expect(validateFrontmatterBoundaries('')).toEqual([])
        })

        it('distinguishes HR from frontmatter closer', () => {
            // This doc has valid frontmatter, then an HR later - HR should NOT
            // cause an error
            const doc = `---
title: "Valid Doc"
---

# Introduction

Some paragraph text.

---

# Next Section

More text.`
            const diagnostics = validateFrontmatterBoundaries(doc)
            const errors = diagnostics.filter(d => d.severity === 'error')
            expect(errors.length).toBe(0)
        })

        it('handles YAML with triple-dash content', () => {
            // YAML can contain --- as a document separator within content
            const doc = `---
title: "Test"
description: |
  Some text
  ---
  More text
---

# Content`
            // This is actually valid - the --- inside the multiline string
            // is NOT a fence
            const result = hasFrontmatter(doc)
            expect(result).toBe(true)
        })
    })
})
