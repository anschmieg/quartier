import { describe, expect, it } from 'vitest'
import {
  createVirtualFeatureModule,
  resolveBuildFeatures,
  resolveEditorMode,
} from '@/config/buildFeatures'

describe('resolveBuildFeatures', () => {
  it('keeps the full application as the default profile', () => {
    expect(resolveBuildFeatures()).toEqual({
      profile: 'full',
      sourceEditor: true,
      visualEditor: true,
      remoteStorage: true,
      collaboration: true,
    })
  })

  it.each([
    ['local-writer', true, true, false, false],
    ['source-only', true, false, false, false],
    ['visual-only', false, true, false, false],
  ] as const)('resolves the %s profile', (
    profile,
    sourceEditor,
    visualEditor,
    remoteStorage,
    collaboration,
  ) => {
    expect(resolveBuildFeatures(profile)).toEqual({
      profile,
      sourceEditor,
      visualEditor,
      remoteStorage,
      collaboration,
    })
  })

  it('rejects unknown profiles', () => {
    expect(() => resolveBuildFeatures('mystery')).toThrow('Unknown Quartier build profile')
  })

  it('falls back to the editor that exists in the selected profile', () => {
    expect(resolveEditorMode('visual', resolveBuildFeatures('source-only'))).toBe('source')
    expect(resolveEditorMode('source', resolveBuildFeatures('visual-only'))).toBe('visual')
    expect(resolveEditorMode('visual', resolveBuildFeatures('full'))).toBe('visual')
  })

  it('omits disabled feature imports from the generated build module', () => {
    const sourceOnly = createVirtualFeatureModule(resolveBuildFeatures('source-only'))
    expect(sourceOnly).toContain('CodeEditor.vue')
    expect(sourceOnly).not.toContain('VisualEditorHost.vue')
    expect(sourceOnly).not.toContain("import('/src/features/remoteStorage')")
    expect(sourceOnly).not.toContain('useCollab')

    const localWriter = createVirtualFeatureModule(resolveBuildFeatures('local-writer'))
    expect(localWriter).toContain('VisualEditorHost.vue')
    expect(localWriter).not.toContain("import('/src/features/remoteStorage')")
    expect(localWriter).not.toContain('useCollab')
  })
})
