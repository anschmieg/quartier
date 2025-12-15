
import quartoSchema from './quarto-schema.json'

// Define types for our suggestions
export interface CompletionItem {
    label: string
    detail?: string
    kind: 'property' | 'value'
    insertText?: string
}

export function getSuggestions(
    lineContent: string,
    cursorOffset: number
): CompletionItem[] {
    const textBeforeCursor = lineContent.slice(0, cursorOffset)

    // 1. Check if we are defining a key (Start of line)
    // Regex: ^\s*(\w*)$ -> match empty or partial word at start of line
    const keyMatch = textBeforeCursor.match(/^\s*([\w-]*)$/)

    if (keyMatch) {
        // We are at the start of a key. Suggest top-level properties.
        const query = keyMatch[1]!.toLowerCase()
        const properties = (quartoSchema.properties || {}) as Record<string, any>

        return Object.keys(properties)
            .filter(key => key.toLowerCase().includes(query))
            .map(key => {
                const prop = properties[key]
                return {
                    label: key,
                    detail: prop.description ? prop.description.slice(0, 50) + '...' : 'Property',
                    kind: 'property' as const,
                    insertText: key + ': '
                }
            })
            .slice(0, 20) // Limit results
    }

    // 2. Check if we are defining a value (After colon)
    // Regex: ^\s*([\w-]+):\s*(\w*)$
    const valueMatch = textBeforeCursor.match(/^\s*([\w-]+):\s*([\w-]*)$/)

    if (valueMatch) {
        const key = valueMatch[1]!
        const query = valueMatch[2]!.toLowerCase()

        // Find schema definition for this key
        const properties = (quartoSchema.properties || {}) as Record<string, any>
        const prop = properties[key]

        if (prop) {
            // Check for 'enum' directly or inside 'anyOf'
            let enums: string[] = []

            if (prop.enum) enums = prop.enum
            if (prop.anyOf) {
                prop.anyOf.forEach((sub: any) => {
                    if (sub.enum) enums.push(...sub.enum)
                })
            }
            if (prop.type === 'boolean') {
                enums.push('true', 'false')
            }

            return enums
                .filter(val => val.toLowerCase().includes(query))
                .map(val => ({
                    label: val,
                    kind: 'value' as const,
                    insertText: val
                }))
        }
    }

    return []
}
