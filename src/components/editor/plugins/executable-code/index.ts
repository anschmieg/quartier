/**
 * Executable Code Plugin for Milkdown
 * 
 * Detects `{python}` and `{r}` fenced code blocks (Quarto syntax) and renders them
 * as interactive CodeCell components instead of static code blocks.
 */

import { $view } from '@milkdown/utils'
import { codeBlockSchema } from '@milkdown/preset-commonmark'
import CodeCell from '../../CodeCell.vue'

// Quarto uses {language} syntax for executable code
const EXECUTABLE_LANGUAGES = ['python', 'r', '{python}', '{r}']

/**
 * Check if a code block should be executable
 */
export function isExecutable(language: string | null | undefined): boolean {
    if (!language) return false
    const normalized = language.toLowerCase().trim()
    return EXECUTABLE_LANGUAGES.includes(normalized)
}

/**
 * Normalize language string (remove curly braces if present)
 */
export function normalizeLanguage(language: string): 'python' | 'r' {
    const cleaned = language.replace(/[{}]/g, '').toLowerCase().trim()
    return cleaned === 'r' ? 'r' : 'python'
}

/**
 * Create the executable code view plugin
 */
export function createExecutableCodeView(nodeViewFactory: any) {
    return $view(codeBlockSchema.node, () => {
        return nodeViewFactory({
            component: CodeCell,
            // Map ProseMirror node attrs to Vue props
            as: 'div',
            update: (node: any, prevNode: any) => {
                // Only update if content changed
                return node.attrs.language === prevNode?.attrs?.language
            },
        })
    })
}

export { CodeCell }
