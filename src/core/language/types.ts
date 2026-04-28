import type { DocumentRef, WorkspaceHandle } from '@/core/workspace/types'

export interface LanguageDiagnostic {
  message: string
  severity: 'info' | 'warning' | 'error'
  line?: number
  column?: number
}

export interface LanguageCompletion {
  label: string
  detail?: string
  insertText?: string
}

export interface LanguageHover {
  contents: string
}

export interface DocumentSymbol {
  name: string
  kind: 'heading' | 'field' | 'citation'
}

export interface LanguageService {
  getDiagnostics(document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<LanguageDiagnostic[]>
  getCompletions(position: { line: number; column: number }, document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<LanguageCompletion[]>
  getHover(position: { line: number; column: number }, document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<LanguageHover | null>
  formatDocument(document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<string>
  getSymbols(document: DocumentRef, workspace: WorkspaceHandle, content: string): Promise<DocumentSymbol[]>
}
