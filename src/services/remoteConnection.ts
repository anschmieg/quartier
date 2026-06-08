export type RemoteConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export type RemoteProviderCapability =
  | 'connect'
  | 'import'
  | 'sync'
  | 'disconnect'

export interface RemoteProviderDescriptor {
  id: string
  name: string
  description: string
  capabilities: readonly RemoteProviderCapability[]
  availability: 'scaffolded' | 'available'
}

export interface RemoteConnection {
  providerId: string
  status: RemoteConnectionStatus
  accountLabel?: string
  message?: string
}

export interface DeferredRemoteAction {
  status: 'deferred'
  message: string
}

export interface RemoteImportResult {
  remoteLocator: string
  title: string
  source: string
  revision: string
}

export interface RemoteSyncResult {
  remoteLocator: string
  revision: string
}

export interface RemoteProviderClient<
  ConnectInput,
  ImportInput,
  SyncInput,
  DisconnectInput = void,
> {
  connect(input: ConnectInput): Promise<RemoteConnection | DeferredRemoteAction>
  importDocument(input: ImportInput): Promise<RemoteImportResult | DeferredRemoteAction>
  syncDocument(input: SyncInput): Promise<RemoteSyncResult | DeferredRemoteAction>
  disconnect(input: DisconnectInput): Promise<RemoteConnection | DeferredRemoteAction>
}

export function createDisconnectedConnection(
  provider: RemoteProviderDescriptor,
): RemoteConnection {
  return {
    providerId: provider.id,
    status: 'disconnected',
  }
}
