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
})
