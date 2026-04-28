import type { BuildService, BuildValidationResult, RenderResult } from './types'
import type { DocumentRef, WorkspaceHandle } from '@/core/workspace/types'

class StubBuildService implements BuildService {
  async renderDocument(_document: DocumentRef, _workspace: WorkspaceHandle): Promise<RenderResult> {
    return {
      ok: false,
      messages: ['Render pipeline not configured yet.'],
    }
  }

  async executeCell(_document: DocumentRef, _cellRef: string, _workspace: WorkspaceHandle): Promise<BuildValidationResult> {
    return {
      ok: false,
      messages: ['Execution pipeline not configured yet.'],
    }
  }

  async validateProject(_workspace: WorkspaceHandle): Promise<BuildValidationResult> {
    return {
      ok: true,
      messages: [],
    }
  }
}

export const buildService: BuildService = new StubBuildService()
