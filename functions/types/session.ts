/**
 * Session and Share Token Types
 * 
 * Sessions represent collaborative editing sessions.
 * Share tokens are separate, revocable links to join a session.
 */

export interface Session {
  id: string           // session_abc123
  owner: string        // email of creator
  files: string[]      // ["owner/repo/path.md"]
  members: string[]    // emails with access
  created: number      // timestamp
  name?: string        // optional friendly name
}

export interface ShareToken {
  token: string        // share_xyz789
  sessionId: string    // links to Session.id
  permission: 'edit' | 'view'
  expiresAt?: number   // optional expiration
  createdBy: string    // email
  created: number
}

/**
 * Generate a random session ID
 */
export function generateSessionId(): string {
  return `session_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

/**
 * Generate a random share token
 */
export function generateShareToken(): string {
  return `share_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}
