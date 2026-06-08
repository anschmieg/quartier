export interface ConflictBaseSnapshot {
  readonly title: string
  readonly source: string
  readonly revision: string
}

export interface ConflictLocalSnapshot {
  readonly id: string
  readonly title: string
  readonly source: string
}

export interface ConflictRemoteSnapshot {
  readonly id: string
  readonly title: string
  readonly source: string
  readonly revision: string
}

export interface DocumentConflict {
  readonly documentId: string
  readonly providerId: string
  readonly remoteLocator: string
  readonly base: Readonly<ConflictBaseSnapshot>
  readonly local: Readonly<ConflictLocalSnapshot>
  readonly remote: Readonly<ConflictRemoteSnapshot>
}

export interface KeepLocalCommitRequest {
  readonly kind: 'keep-local'
  readonly documentId: string
  readonly providerId: string
  readonly remoteLocator: string
  readonly expectedRevision: string
  readonly title: string
  readonly source: string
}

export interface CreateLocalRecoveryCopyRequest {
  readonly kind: 'create-local-recovery-copy'
  readonly title: string
  readonly source: string
}

export interface ReplaceLocalWithRemoteRequest {
  readonly kind: 'replace-local-with-remote'
  readonly documentId: string
  readonly title: string
  readonly source: string
  readonly remoteRevision: string
}

export interface AcceptRemoteRequest {
  readonly kind: 'accept-remote'
  readonly documentId: string
  readonly recoveryCopy: Readonly<CreateLocalRecoveryCopyRequest>
  readonly replacement: Readonly<ReplaceLocalWithRemoteRequest>
}

export interface ManualResolutionDraft {
  readonly kind: 'manual-resolution'
  readonly documentId: string
  readonly title: string
  readonly source: string
  readonly baseRevision: string
  readonly remoteRevision: string
}

function freezeSnapshot<T extends object>(value: T): Readonly<T> {
  return Object.freeze({ ...value })
}

export function createDocumentConflict(input: DocumentConflict): Readonly<DocumentConflict> {
  return Object.freeze({
    documentId: input.documentId,
    providerId: input.providerId,
    remoteLocator: input.remoteLocator,
    base: freezeSnapshot(input.base),
    local: freezeSnapshot(input.local),
    remote: freezeSnapshot(input.remote),
  })
}

export function createKeepLocalCommitRequest(
  conflict: DocumentConflict,
): Readonly<KeepLocalCommitRequest> {
  return Object.freeze({
    kind: 'keep-local',
    documentId: conflict.documentId,
    providerId: conflict.providerId,
    remoteLocator: conflict.remoteLocator,
    expectedRevision: conflict.remote.revision,
    title: conflict.local.title,
    source: conflict.local.source,
  })
}

export function createAcceptRemoteRequest(
  conflict: DocumentConflict,
): Readonly<AcceptRemoteRequest> {
  return Object.freeze({
    kind: 'accept-remote',
    documentId: conflict.documentId,
    recoveryCopy: freezeSnapshot({
      kind: 'create-local-recovery-copy' as const,
      title: `${conflict.local.title} (recovery copy)`,
      source: conflict.local.source,
    }),
    replacement: freezeSnapshot({
      kind: 'replace-local-with-remote' as const,
      documentId: conflict.documentId,
      title: conflict.remote.title,
      source: conflict.remote.source,
      remoteRevision: conflict.remote.revision,
    }),
  })
}

export function createManualResolutionDraft(
  conflict: DocumentConflict,
): Readonly<ManualResolutionDraft> {
  return Object.freeze({
    kind: 'manual-resolution',
    documentId: conflict.documentId,
    title: conflict.local.title,
    source: conflict.local.source,
    baseRevision: conflict.base.revision,
    remoteRevision: conflict.remote.revision,
  })
}

function hasStringProperties(
  value: unknown,
  properties: readonly string[],
): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  return properties.every(property => typeof record[property] === 'string')
}

export function parseDocumentConflict(value: unknown): Readonly<DocumentConflict> | undefined {
  if (!hasStringProperties(value, ['documentId', 'providerId', 'remoteLocator'])) {
    return undefined
  }

  const record = value as Record<string, unknown>
  if (!hasStringProperties(record.base, ['title', 'source', 'revision'])
    || !hasStringProperties(record.local, ['id', 'title', 'source'])
    || !hasStringProperties(record.remote, ['id', 'title', 'source', 'revision'])) {
    return undefined
  }

  const header = value as Pick<DocumentConflict, 'documentId' | 'providerId' | 'remoteLocator'>
  const base = record.base as unknown as ConflictBaseSnapshot
  const local = record.local as unknown as ConflictLocalSnapshot
  const remote = record.remote as unknown as ConflictRemoteSnapshot
  return createDocumentConflict({
    documentId: header.documentId,
    providerId: header.providerId,
    remoteLocator: header.remoteLocator,
    base: {
      title: base.title,
      source: base.source,
      revision: base.revision,
    },
    local: {
      id: local.id,
      title: local.title,
      source: local.source,
    },
    remote: {
      id: remote.id,
      title: remote.title,
      source: remote.source,
      revision: remote.revision,
    },
  })
}
