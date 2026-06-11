import { describe, expect, it, vi } from 'vitest'
import {
  editorAccessibilityAttributes,
  handleEditorEscape,
} from '@/components/editor/editorAccessibility'

describe('editor accessibility', () => {
  it('provides an accessible name and keyboard instructions', () => {
    expect(editorAccessibilityAttributes).toMatchObject({
      role: 'textbox',
      'aria-label': 'Quarto document editor',
      'aria-describedby': 'writer-editor-instructions',
      'aria-multiline': 'true',
    })
  })

  it('lets keyboard users leave the editor with Escape', () => {
    const blur = vi.fn()

    expect(handleEditorEscape({ dom: { blur } }, { key: 'Escape' })).toBe(true)
    expect(blur).toHaveBeenCalledOnce()
  })

  it('does not intercept other keys', () => {
    const blur = vi.fn()

    expect(handleEditorEscape({ dom: { blur } }, { key: 'Tab' })).toBe(false)
    expect(blur).not.toHaveBeenCalled()
  })
})
