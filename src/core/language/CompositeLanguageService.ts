import type { LanguageService, LanguageDiagnostic, LanguageCompletion, LanguageHover, DocumentSymbol } from './types'
import type { DocumentRef, WorkspaceHandle } from '@/core/workspace/types'
import quartoIntelligence from '@/assets/quarto-intelligence.json'

type QuartoSchemaEntry = {
  name?: string
  description?: string | {
    short?: string
    long?: string
  }
  schema?: unknown
}

const schemaEntries = quartoIntelligence as unknown as Record<string, QuartoSchemaEntry[] | unknown>

function getDescription(entry: QuartoSchemaEntry): string | undefined {
  if (typeof entry.description === 'string') return entry.description
  return entry.description?.short || entry.description?.long
}

function getSchemaCompletions(files: string[]): LanguageCompletion[] {
  const seen = new Set<string>()
  return files.flatMap((file) => {
    const entries = schemaEntries[file]
    if (!Array.isArray(entries)) return []
    return entries.flatMap((entry) => {
      if (!entry.name || seen.has(entry.name)) return []
      seen.add(entry.name)
      return [{
        label: entry.name,
        detail: getDescription(entry) || 'Quarto option',
        insertText: `${entry.name}: `,
      }]
    })
  })
}

const frontmatterCompletions = getSchemaCompletions([
  'schema/document-metadata.yml',
  'schema/document-references.yml',
  'schema/document-formatting.yml',
  'schema/document-execute.yml',
  'schema/document-crossref.yml',
  'schema/document-toc.yml',
])

const cellOptionCompletions = getSchemaCompletions([
  'schema/cell-attributes.yml',
  'schema/cell-codeoutput.yml',
  'schema/cell-figure.yml',
  'schema/cell-table.yml',
  'schema/cell-layout.yml',
])

const snippetCompletions: LanguageCompletion[] = [
  {
    label: 'callout-note',
    detail: 'Quarto note callout block',
    insertText: '::: {.callout-note}\n## Note\n\n\n:::',
  },
  {
    label: 'callout-warning',
    detail: 'Quarto warning callout block',
    insertText: '::: {.callout-warning}\n## Warning\n\n\n:::',
  },
  {
    label: 'code-cell-python',
    detail: 'Executable Python code cell',
    insertText: '```{python}\n#| label: fig-\n\n```',
  },
  {
    label: 'code-cell-r',
    detail: 'Executable R code cell',
    insertText: '```{r}\n#| label: fig-\n\n```',
  },
  {
    label: 'figure-crossref',
    detail: 'Figure cross-reference',
    insertText: '@fig-',
  },
]

class LocalQuartoLanguageService implements LanguageService {
  async getDiagnostics(document: DocumentRef, _workspace: WorkspaceHandle, content: string): Promise<LanguageDiagnostic[]> {
    const diagnostics: LanguageDiagnostic[] = []
    if (document.isQuarto && content.startsWith('---') && !content.includes('\n---', 3)) {
      diagnostics.push({
        message: 'Frontmatter starts with "---" but does not appear to close cleanly.',
        severity: 'warning',
        line: 1,
        column: 1,
      })
    }
    return diagnostics
  }

  async getCompletions(_position: { line: number; column: number }, document: DocumentRef): Promise<LanguageCompletion[]> {
    if (!document.isQuarto) return []
    return [
      { label: 'title', detail: 'Frontmatter field', insertText: 'title: ""' },
      { label: 'author', detail: 'Frontmatter field', insertText: 'author: ""' },
      { label: 'format', detail: 'Frontmatter field', insertText: 'format:\n  html: default' },
      ...frontmatterCompletions,
      ...cellOptionCompletions,
      ...snippetCompletions,
    ]
  }

  async getHover(): Promise<LanguageHover | null> {
    return null
  }

  async formatDocument(_document: DocumentRef, _workspace: WorkspaceHandle, content: string): Promise<string> {
    return content
  }

  async getSymbols(_document: DocumentRef, _workspace: WorkspaceHandle, content: string): Promise<DocumentSymbol[]> {
    return content
      .split('\n')
      .filter((line) => line.startsWith('#'))
      .map((line) => ({
        name: line.replace(/^#+\s*/, ''),
        kind: 'heading' as const,
      }))
  }
}

export class CompositeLanguageService implements LanguageService {
  private readonly delegates: LanguageService[]

  constructor(delegates: LanguageService[] = [new LocalQuartoLanguageService()]) {
    this.delegates = delegates
  }

  async getDiagnostics(document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<LanguageDiagnostic[]> {
    const results = await Promise.all(this.delegates.map((delegate) => delegate.getDiagnostics(document, workspace, content)))
    return results.flat()
  }

  async getCompletions(position: { line: number; column: number }, document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<LanguageCompletion[]> {
    const results = await Promise.all(this.delegates.map((delegate) => delegate.getCompletions(position, document, workspace, content)))
    return results.flat()
  }

  async getHover(position: { line: number; column: number }, document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<LanguageHover | null> {
    for (const delegate of this.delegates) {
      const result = await delegate.getHover(position, document, workspace, content)
      if (result) return result
    }
    return null
  }

  async formatDocument(document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<string> {
    let next = content
    for (const delegate of this.delegates) {
      next = await delegate.formatDocument(document, workspace, next)
    }
    return next
  }

  async getSymbols(document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<DocumentSymbol[]> {
    const results = await Promise.all(this.delegates.map((delegate) => delegate.getSymbols(document, workspace, content)))
    return results.flat()
  }
}

export const languageService = new CompositeLanguageService()
