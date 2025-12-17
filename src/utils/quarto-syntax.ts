/**
 * Quarto Syntax Adapter
 * 
 * Converts between Quarto's Pandoc-style div syntax:
 * ::: {.callout-tip title="My Title"}
 * 
 * And Remark-Directive syntax used by Milkdown:
 * :::callout-tip{title="My Title"}
 * 
 * Also provides frontmatter boundary detection utilities to distinguish
 * YAML frontmatter `---` from horizontal rules (thematic breaks).
 */

// ============================================================================
// FRONTMATTER BOUNDARY DETECTION
// ============================================================================

export type FrontmatterDiagnosticSeverity = 'error' | 'warning' | 'info'

export interface FrontmatterDiagnostic {
    severity: FrontmatterDiagnosticSeverity
    message: string
    line: number        // 1-indexed line number
    column: number      // 1-indexed column
    endLine?: number
    endColumn?: number
}

/**
 * Check if document has valid frontmatter structure.
 * Frontmatter MUST:
 * 1. Start at position 0 (first line of document)
 * 2. Have opening `---` on its own line
 * 3. Have closing `---` on its own line
 * 4. Have at least one character between fences
 */
export function hasFrontmatter(markdown: string): boolean {
    if (!markdown || !markdown.startsWith('---')) return false
    
    // Match: starts with ---, has content, ends with ---
    const match = markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
    return match !== null && match[1] !== undefined && match[1].trim().length > 0
}

/**
 * Extract frontmatter content and body separately.
 * Returns null if no valid frontmatter found.
 */
export function extractFrontmatter(markdown: string): { frontmatter: string; body: string; endLine: number } | null {
    if (!markdown || !markdown.startsWith('---')) return null
    
    const match = markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
    if (!match || !match[1]) return null
    
    const frontmatterContent = match[1]
    const fullMatch = match[0]
    const body = markdown.slice(fullMatch.length)
    
    // Count lines to find end position
    const endLine = fullMatch.split(/\r?\n/).length
    
    return {
        frontmatter: frontmatterContent,
        body,
        endLine
    }
}

/**
 * Validate frontmatter boundaries and detect common issues.
 * 
 * Key heuristics:
 * 1. Frontmatter must start at document position 0
 * 2. `---` mid-document is likely an HR, not frontmatter
 * 3. Unclosed frontmatter (opening `---` without closing)
 * 4. Indented `---` fences are invalid
 */
export function validateFrontmatterBoundaries(markdown: string): FrontmatterDiagnostic[] {
    const diagnostics: FrontmatterDiagnostic[] = []
    if (!markdown) return diagnostics
    
    const lines = markdown.split(/\r?\n/)
    
    // Check for frontmatter
    const hasFM = hasFrontmatter(markdown)
    const extracted = extractFrontmatter(markdown)
    
    // Pattern: exactly `---` (with optional trailing whitespace)
    const isFenceLine = (line: string) => /^---[ \t]*$/.test(line)
    const isIndentedFence = (line: string) => /^\s+---/.test(line)
    
    // 1. Check if first line looks like frontmatter but isn't valid
    if (lines[0]?.trim().startsWith('---') && !hasFM) {
        // Could be unclosed frontmatter
        const firstLineIsFence = isFenceLine(lines[0])
        if (firstLineIsFence) {
            // Look for closing fence
            let foundClosing = false
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i]
                if (line !== undefined && isFenceLine(line)) {
                    foundClosing = true
                    break
                }
            }
            if (!foundClosing) {
                diagnostics.push({
                    severity: 'error',
                    message: 'Unclosed frontmatter: missing closing `---` fence',
                    line: 1,
                    column: 1
                })
            }
        }
    }
    
    // 2. Check for indented fences (already in validation.ts, but we add here too)
    lines.forEach((line, idx) => {
        if (isIndentedFence(line)) {
            const matchResult = line.match(/^(\s+)/)
            const leadingSpaces = matchResult?.[1]?.length ?? 0
            diagnostics.push({
                severity: 'warning',
                message: 'Indented `---` fence detected. Remove indentation for valid frontmatter boundary.',
                line: idx + 1,
                column: 1,
                endColumn: leadingSpaces + 4
            })
        }
    })
    
    // 3. Check for `---` after frontmatter (potential HR confusion)
    if (extracted) {
        // Look for `---` in the body that might be confused
        const bodyLines = extracted.body.split(/\r?\n/)
        bodyLines.forEach((line, idx) => {
            // Skip if it's within a code block (simple heuristic)
            if (isFenceLine(line)) {
                // This is an HR in the body - that's fine, but let's check context
                const lineNum = extracted.endLine + idx
                
                // Additional warning if it's immediately after frontmatter with no content
                if (idx === 0 || (idx === 1 && bodyLines[0]?.trim() === '')) {
                    diagnostics.push({
                        severity: 'info',
                        message: 'Horizontal rule `---` immediately after frontmatter. This is valid but may look like a triple-fence.',
                        line: lineNum,
                        column: 1
                    })
                }
            }
        })
    }
    
    // 4. Check for `---` at document start when there's no valid frontmatter
    // This could indicate malformed YAML
    if (lines[0] && isFenceLine(lines[0]) && !hasFM) {
        // Find what looks like the closing fence
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i]
            if (line !== undefined && isFenceLine(line)) {
                // Check if content between is empty
                const content = lines.slice(1, i).join('\n').trim()
                if (content === '') {
                    diagnostics.push({
                        severity: 'warning',
                        message: 'Empty frontmatter block. Add YAML content or remove the fences.',
                        line: 1,
                        column: 1,
                        endLine: i + 1,
                        endColumn: 4
                    })
                }
                break
            }
        }
    }
    
    return diagnostics
}

// ============================================================================
// CALLOUT SYNTAX CONVERSION
// ============================================================================

export function convertQuartoToMilkdown(markdown: string): string {
    if (!markdown) return ''

    // Regex to match Quarto callout opening fence
    // Matches: 
    // 1. Standard: ::: {.callout-type attrs}
    // 2. Shorthand: ::: callout-type

    // 1. Standard: ::: {.callout-type ...} OR ::: {#id .callout-type ...}
    // We match generic ::: { ... } and check for .callout- inside
    let res = markdown.replace(/^( *)::: \{(.*?)\}/gm, (match, indent, content) => {
        // Look for .callout-type
        const typeMatch = content.match(/\.callout-([a-z]+)/)
        if (typeMatch) {
            const type = typeMatch[1]
            // Remove the .callout-type class from attributes
            let remainingAttrs = content.replace(/\.callout-[a-z]+/, '').trim()
            
            // Normalize Pandoc shorthands to standard key-value
            // #id -> id="id"
            remainingAttrs = remainingAttrs.replace(/(^|\s)#([\w-]+)/g, '$1id="$2"')
            // .class -> class="class"
            remainingAttrs = remainingAttrs.replace(/(^|\s)\.([\w-]+)/g, '$1class="$2"')

            const attrPart = remainingAttrs ? `{${remainingAttrs}}` : ''
            return `${indent}:::callout-${type}${attrPart}`
        }
        // If no callout type found, return original (it's a generic div)
        return match
    })

    // 2. Shorthand (::: callout-type)
    res = res.replace(/^( *)::: callout-([a-z]+)(.*)$/gm, (_, indent, type, _rest) => {
       return `${indent}:::callout-${type}`
    })
    
    return res
}

export function convertMilkdownToQuarto(markdown: string): string {
    if (!markdown) return ''

    // Regex to match Remark-Directive opening fence
    // Matches: :::callout-type{attrs} or :::callout-type
    const milkdownRegex = /^( *):::callout-([a-z]+)(?:\{(.*?)\})?/gm

    return markdown.replace(milkdownRegex, (_, indent, type, attrs) => {
        const cleanAttrs = attrs ? attrs.trim() : ''
        // Construct Quarto syntax
        // If attributes exist, prepend space
        const attrPart = cleanAttrs ? ` ${cleanAttrs}` : ''
        return `${indent}::: {.callout-${type}${attrPart}}`

    })
}
