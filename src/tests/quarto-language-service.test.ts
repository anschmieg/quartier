import { describe, expect, it } from 'vitest'
import { languageService } from '@/core/language/CompositeLanguageService'
import type { DocumentRef, WorkspaceHandle } from '@/core/workspace/types'

const documentRef: DocumentRef = {
  workspaceId: 'browser:test',
  path: 'paper.qmd',
  kind: 'text',
  language: 'qmd',
  isQuarto: true,
}

const workspaceHandle: WorkspaceHandle = {
  providerId: 'local',
  workspaceId: 'browser:test',
  displayName: 'Test',
}

describe('Quarto language service', () => {
  it('offers schema-backed frontmatter, cell option, and snippet completions', async () => {
    const completions = await languageService.getCompletions(
      { line: 1, column: 1 },
      documentRef,
      workspaceHandle,
      '---\nformat:\n---\n\n```{python}\n#|\n```',
    )

    const labels = completions.map((completion) => completion.label)

    expect(labels).toContain('bibliography')
    expect(labels).toContain('fig-cap')
    expect(labels).toContain('callout-note')
    expect(labels).toContain('code-cell-python')
  })

  it('offers all callout snippets and callout option completions', async () => {
    const completions = await languageService.getCompletions(
      { line: 1, column: 5 },
      documentRef,
      workspaceHandle,
      '::: {.callout-',
    )

    const labels = completions.map((completion) => completion.label)

    expect(labels).toEqual(expect.arrayContaining([
      'callout-note',
      'callout-tip',
      'callout-warning',
      'callout-caution',
      'callout-important',
      'callout-title',
      'callout-collapse',
      'callout-appearance',
      'callout-icon',
    ]))

    expect(completions.find((completion) => completion.label === 'callout-important')?.insertText)
      .toBe('::: {.callout-important title="Important"}\n\n:::')
    expect(completions.find((completion) => completion.label === 'callout-collapse')?.insertText)
      .toBe('collapse="false"')
  })

  it('offers prose container snippets for generic divs, tabsets, and columns', async () => {
    const completions = await languageService.getCompletions(
      { line: 1, column: 5 },
      documentRef,
      workspaceHandle,
      '::: {.',
    )

    const labels = completions.map((completion) => completion.label)

    expect(labels).toEqual(expect.arrayContaining([
      'div-generic',
      'tabset-panel',
      'columns-layout',
      'div-id',
      'div-class',
    ]))
    expect(completions.find((completion) => completion.label === 'tabset-panel')?.insertText)
      .toBe('::: {.panel-tabset}\n\n## Tab 1\n\n\n## Tab 2\n\n\n:::')
    expect(completions.find((completion) => completion.label === 'columns-layout')?.insertText)
      .toContain('::: {.columns}')
  })
})
