import type { DocumentRef, WorkspaceHandle } from '@/core/workspace/types'

export interface BuildValidationResult {
  ok: boolean
  messages: string[]
}

export interface RenderResult {
  ok: boolean
  outputPath?: string
  messages: string[]
}

export interface BuildService {
  renderDocument(document: DocumentRef, workspace: WorkspaceHandle, options?: Record<string, unknown>): Promise<RenderResult>
  executeCell(document: DocumentRef, cellRef: string, workspace: WorkspaceHandle): Promise<BuildValidationResult>
  validateProject(workspace: WorkspaceHandle): Promise<BuildValidationResult>
}
