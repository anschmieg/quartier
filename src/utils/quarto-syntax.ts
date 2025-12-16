/**
 * Quarto Syntax Adapter
 * 
 * Converts between Quarto's Pandoc-style div syntax:
 * ::: {.callout-tip title="My Title"}
 * 
 * And Remark-Directive syntax used by Milkdown:
 * :::callout-tip{title="My Title"}
 */

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
