
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { EditorView } from '@milkdown/prose/view'
import { $prose } from '@milkdown/utils'
import { getSuggestions, type CompletionItem } from './completion-source'
export type { CompletionItem } from './completion-source'
export const completionKey = new PluginKey('frontmatter-completion')

export interface CompletionState {
    active: boolean
    items: CompletionItem[]
    index: number
    coords: { left: number; top: number; bottom: number } | null
    query: string
    range: { from: number; to: number } | null
}

// Factory to create the plugin with access to a reactive state handler
export const createCompletionPlugin = (
    onUpdate: (state: CompletionState) => void,
    _onSelect?: (item: CompletionItem) => void // Callback when item is selected via click/enter
) => {
    return $prose(() => {
        let activeState: CompletionState = {
            active: false,
            items: [],
            index: 0,
            coords: null,
            query: '',
            range: null
        }

        return new Plugin({
            key: completionKey,
            view: (_editorView) => {
                return {
                    update: (view, _prevState) => {
                        const state = view.state
                        const selection = state.selection
                        const { $from } = selection

                        // Only trigger if selection is empty (cursor)
                        if (!selection.empty) {
                            updateState({ active: false, items: [], index: 0, coords: null, query: '', range: null })
                            return
                        }

                        // Check if we are inside a frontmatter block
                        // We need to look at the node at current position
                        // Or just walk up the tree?
                        // In Milkdown, frontmatter is a specific node type 'frontmatter' (code block-ish)
                        // But wait, the inner content is 'text'.
                        // Let's check parent.

                        const parent = $from.node($from.depth - 1)

                        // Check if we are in frontmatter
                        // Based on our validation.ts, we know the node name is 'frontmatter'
                        // But 'frontmatter' node contains 'text'.
                        // So the parent of the text node should be 'frontmatter'
                        // const isFrontmatter = parent && parent.type.name === 'frontmatter'

                        // Alternative: Check if node itself is frontmatter (if we are at top level inside it?)
                        // 'frontmatter' node content is 'text*' so $from.parent should be the frontmatter node?
                        // Let's debug this if needed. Assuming $from.parent.type.name === 'frontmatter'

                        if (!parent || parent.type.name !== 'frontmatter') {
                            updateState({ active: false, items: [], index: 0, coords: null, query: '', range: null })
                            return
                        }

                        // Get the text of the current line
                        // $from.parent is the frontmatter node.
                        // $from.parentOffset is the offset inside the frontmatter node.
                        // But frontmatter content is one giant text node usually?
                        // If it is 'text*', it might be one text node.
                        // We need to split by lines to find current line content.

                        const textContent = $from.parent.textContent
                        const relativePos = $from.parentOffset

                        // Find start/end of current line
                        const lines = textContent.split('\n')
                        let charCount = 0
                        let currentLineText = ''
                        let lineStartOffset = 0

                        for (const line of lines) {
                            if (charCount + line.length + 1 > relativePos) { // +1 for newline
                                currentLineText = line
                                lineStartOffset = charCount
                                break
                            }
                            charCount += line.length + 1
                        }

                        // Cursor position inside the line
                        const cursorInLine = relativePos - lineStartOffset

                        // Get suggestions
                        const suggestions = getSuggestions(currentLineText, cursorInLine)

                        if (suggestions.length === 0) {
                            updateState({ active: false, items: [], index: 0, coords: null, query: '', range: null })
                            return
                        }


                        // We have suggestions!
                        // Calculate coords for the popup
                        const coords = view.coordsAtPos(selection.from)

                        // Calculate replacement range
                        // start of word (replaceStart in local line offset)
                        // Absolute: lineStartPos + replaceStart? 
                        // Wait, lineStartOffset is relative to frontmatter block.
                        // Absolute Line Start = $from.start() + lineStartOffset.

                        // We need to re-find the regex match to determine start.
                        const textBefore = currentLineText.slice(0, cursorInLine)
                        let replaceStart = 0
                        if (suggestions.length > 0) {
                            const firstSuggestion = suggestions[0]
                            if (!firstSuggestion) return // Should be impossible given length check

                            const kind = firstSuggestion.kind

                            if (kind === 'property') {
                                const match = textBefore.match(/([\w-]*)$/)
                                if (match && match[1] !== undefined) {
                                    replaceStart = cursorInLine - match[1]!.length
                                }
                            } else {
                                // Value
                                const match = textBefore.match(/:\s*([\w-]*)$/)
                                if (match && match[1] !== undefined) {
                                    replaceStart = cursorInLine - match[1]!.length
                                }
                            }
                        }

                        const absStart = $from.start() + lineStartOffset + replaceStart
                        const absEnd = $from.pos

                        updateState({
                            active: true,
                            items: suggestions,
                            index: 0,
                            coords: { left: coords.left, top: coords.top, bottom: coords.bottom },
                            query: '',
                            range: { from: absStart, to: absEnd }
                        })
                    }
                }
            },
            props: {
                handleKeyDown(view, event) {
                    if (!activeState.active) return false

                    if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        const nextIndex = (activeState.index + 1) % activeState.items.length
                        updateState({ ...activeState, index: nextIndex })
                        return true
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        const prevIndex = (activeState.index - 1 + activeState.items.length) % activeState.items.length
                        updateState({ ...activeState, index: prevIndex })
                        return true
                    }
                    if (event.key === 'Enter' || event.key === 'Tab') {
                        event.preventDefault()
                        const item = activeState.items[activeState.index]

                        // Perform insertion
                        // We need to know what to replace.
                        // `getSuggestions` gave us the item, but we need to calculate the replacement range again?
                        // Or do it here.
                        // Simplest: Replace the "word" before cursor.

                        // The 'insertText' from item usually contains the full text to insert.
                        if (item) {
                            insertCompletion(view, item)
                            updateState({ active: false, items: [], index: 0, coords: null, query: '', range: null })
                        }
                        return true
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault()
                        updateState({ active: false, items: [], index: 0, coords: null, query: '', range: null })
                        return true
                    }

                    return false
                }
            }
        })

        function updateState(newState: CompletionState) {
            activeState = newState
            onUpdate(newState)
        }

        function insertCompletion(view: EditorView, item: CompletionItem) {
            // Use the pre-calculated range if available/valid?
            // Yes, checking state is safer than recalculating.
            // But we must assume state is fresh. Prosemirror sync ensures it.

            const range = activeState.range
            if (!range) return

            const tr = view.state.tr.insertText(item.insertText || item.label, range.from, range.to)
            view.dispatch(tr)
        }
    })
}
