import { ref } from 'vue'
import { useDocumentBuffer } from './useDocumentBuffer'
import { useWorkspaceSession } from './useWorkspaceSession'

export function useDocumentSave() {
  const buffer = useDocumentBuffer()
  const workspaceSession = useWorkspaceSession()
  const error = ref<string | null>(null)

  const save = async (message?: string) => {
    error.value = null
    const provider = workspaceSession.getProvider()
    const handle = workspaceSession.state.activeHandle
    const document = buffer.state.document
    if (!provider || !handle || !document) return null

    try {
      const result = await provider.writeDocument(handle, document.path, buffer.state.content, {
        message,
        baseRevision: buffer.state.baseRevision,
      })
      await buffer.markSaved(result.revision)
      return result
    } catch (saveError) {
      console.error('Save failed:', saveError)
      error.value = saveError instanceof Error ? saveError.message : 'Save failed'
      return null
    }
  }

  return {
    error,
    save,
  }
}
