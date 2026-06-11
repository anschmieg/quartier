declare module 'virtual:quartier-features' {
  import type { Component } from 'vue'
  import type { BuildFeatures } from '@/config/buildFeatures'

  export const buildFeatures: Readonly<BuildFeatures>
  export const loadSourceEditor: (() => Promise<{ default: Component }>) | undefined
  export const loadVisualEditor: (() => Promise<{ default: Component }>) | undefined
  export const loadRemoteStorage: (() => Promise<{ registerRemoteStorage(): void }>) | undefined
  export const collaboration: typeof import('@/composables/useCollab') | undefined
}
