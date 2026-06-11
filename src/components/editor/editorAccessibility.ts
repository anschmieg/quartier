export const editorAccessibilityAttributes = {
  role: 'textbox',
  'aria-label': 'Quarto document editor',
  'aria-describedby': 'writer-editor-instructions',
  'aria-multiline': 'true',
}

type EscapeEditorView = {
  dom: {
    blur: () => void
  }
}

type EscapeKeyboardEvent = {
  key: string
}

export function handleEditorEscape(view: EscapeEditorView, event: EscapeKeyboardEvent): boolean {
  if (event.key !== 'Escape') return false

  view.dom.blur()
  return true
}
