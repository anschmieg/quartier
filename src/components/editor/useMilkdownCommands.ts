import { type Editor, editorViewCtx } from '@milkdown/kit/core'
import { toggleStrongCommand, toggleEmphasisCommand } from '@milkdown/preset-commonmark'
import { wrapInHeadingCommand } from '@milkdown/preset-commonmark'
import { wrapInBlockquoteCommand } from '@milkdown/preset-commonmark'
import { wrapInBulletListCommand, wrapInOrderedListCommand } from '@milkdown/preset-commonmark'
import { toggleInlineCodeCommand, createCodeBlockCommand } from '@milkdown/preset-commonmark'
import { toggleLinkCommand } from '@milkdown/preset-commonmark'
import { insertImageCommand } from '@milkdown/preset-commonmark'
import { undoCommand, redoCommand } from '@milkdown/plugin-history'
import { callCommand } from '@milkdown/utils'

export function useMilkdownCommands(getEditor: () => Editor | undefined) {

    const action = (command: any, payload?: any) => {
        const editor = getEditor()
        console.log('[useMilkdownCommands] action called:', {
            command: command?.key || command,
            payload,
            hasEditor: !!editor
        })
        if (!editor) {
            console.warn('[useMilkdownCommands] No editor instance available!')
            return
        }
        editor.action(callCommand(command.key ?? command, payload))
    }

    return {
        // Text Formatting
        toggleBold: () => action(toggleStrongCommand),
        toggleItalic: () => action(toggleEmphasisCommand),
        toggleInlineCode: () => action(toggleInlineCodeCommand),

        // Headings
        setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => action(wrapInHeadingCommand, level),

        // Lists
        toggleBulletList: () => action(wrapInBulletListCommand),
        toggleOrderedList: () => action(wrapInOrderedListCommand),

        // Blocks
        toggleBlockquote: () => action(wrapInBlockquoteCommand),
        toggleCodeBlock: () => action(createCodeBlockCommand),

        // Links & Media
        // Links & Media
        setLink: (url: string) => action(toggleLinkCommand, { href: url }),
        insertImage: (src: string) => action(insertImageCommand, { src, alt: 'image' }),

        // Custom
        insertCallout: () => {
             const editor = getEditor()
             if (!editor) return
             editor.action((ctx) => {
                const view = ctx.get(editorViewCtx)
                const { from } = view.state.selection
                const tr = view.state.tr.insertText('\n::: {.callout-note}\n\n:::\n', from)
                view.dispatch(tr)
             })
        },

        // History
        undo: () => action(undoCommand),
        redo: () => action(redoCommand),

        // State Query (Mock for now)
        isActive: (_name: string, _attributes?: any) => {
            // Stubbed: Unused variables prefixed with _
            return false
        },

        can: () => ({
            undo: () => true,
            redo: () => true
        })
    }
}
