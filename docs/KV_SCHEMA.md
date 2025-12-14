# KV Database Schema

Quartier uses Cloudflare KV (Key-Value) storage for persistent state. This document defines the key patterns and value structures.

## Sessions

### `session:{sessionId}`
Stores metadata for an active collaboration session.

- **Key**: `session:uuid-v4`
- **Value**: JSON
  ```json
  {
    "id": "e2f8...",
    "owner": "user@email.com",
    "name": "My Research Paper",
    "paths": ["owner/repo/folder", "owner/repo/file.qmd"],
    "members": ["collaborator@email.com"],
    "created": 1715000000000
  }
  ```

### `share:{token}`
Maps a short, human-readable share token to a session ID.

- **Key**: `share:brave-bears-shake`
- **Value**: JSON
  ```json
  {
    "token": "brave-bears-shake",
    "sessionId": "e2f8...",
    "permission": "edit", // or "view"
    "createdBy": "user@email.com",
    "created": 1715000000000,
    "expiresAt": 1715604800000 // Optional
  }
  ```

### `member:{email}`
Reverse index to find all sessions a user has access to ("Shared with me").

- **Key**: `member:collaborator@email.com`
- **Value**: JSON Array
  ```json
  ["session-id-1", "session-id-2"]
  ```

### `owner:{email}`
Reverse index to find all sessions created by a user ("Shared by me").

- **Key**: `owner:user@email.com`
- **Value**: JSON Array
  ```json
  ["session-id-1", "session-id-2"]
  ```

## File Caching (Sync)

Used to sync file content changes before they are committed to GitHub, and to enable cross-device persistence.

### `sync:{owner}:{repo}:{path}`
- **Key**: `sync:anschemig:quartier:README.md`
- **Value**: String (File Content)
