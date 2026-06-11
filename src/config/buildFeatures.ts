export type BuildProfileName = 'full' | 'local-writer' | 'source-only' | 'visual-only'

export interface BuildFeatures {
  profile: BuildProfileName
  sourceEditor: boolean
  visualEditor: boolean
  remoteStorage: boolean
  collaboration: boolean
}

const BUILD_PROFILES: Record<BuildProfileName, BuildFeatures> = {
  full: {
    profile: 'full',
    sourceEditor: true,
    visualEditor: true,
    remoteStorage: true,
    collaboration: true,
  },
  'local-writer': {
    profile: 'local-writer',
    sourceEditor: true,
    visualEditor: true,
    remoteStorage: false,
    collaboration: false,
  },
  'source-only': {
    profile: 'source-only',
    sourceEditor: true,
    visualEditor: false,
    remoteStorage: false,
    collaboration: false,
  },
  'visual-only': {
    profile: 'visual-only',
    sourceEditor: false,
    visualEditor: true,
    remoteStorage: false,
    collaboration: false,
  },
}

export function resolveBuildFeatures(profile: string = 'full'): BuildFeatures {
  if (!(profile in BUILD_PROFILES)) {
    throw new Error(`Unknown Quartier build profile: ${profile}`)
  }

  return BUILD_PROFILES[profile as BuildProfileName]
}

export type EditorMode = 'visual' | 'source'

export function resolveEditorMode(
  requestedMode: EditorMode,
  features: Pick<BuildFeatures, 'sourceEditor' | 'visualEditor'>,
): EditorMode {
  if (requestedMode === 'visual' && features.visualEditor) return 'visual'
  if (requestedMode === 'source' && features.sourceEditor) return 'source'
  return features.sourceEditor ? 'source' : 'visual'
}

export function createVirtualFeatureModule(features: BuildFeatures): string {
  return [
    `export const buildFeatures = Object.freeze(${JSON.stringify(features)})`,
    features.sourceEditor
      ? `export const loadSourceEditor = () => import('/src/components/editor/CodeEditor.vue')`
      : 'export const loadSourceEditor = undefined',
    features.visualEditor
      ? `export const loadVisualEditor = () => import('/src/components/editor/VisualEditorHost.vue')`
      : 'export const loadVisualEditor = undefined',
    features.remoteStorage
      ? `export const loadRemoteStorage = () => import('/src/features/remoteStorage')`
      : 'export const loadRemoteStorage = undefined',
    features.collaboration
      ? `import * as collaborationModule from '/src/composables/useCollab'; export const collaboration = collaborationModule`
      : 'export const collaboration = undefined',
  ].join('\n')
}
