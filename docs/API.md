# API Documentation

This document describes the Quartier API endpoints exposed through Cloudflare Pages Functions.

## Authentication

Quartier supports two authentication modes:

1. **Host Mode**: GitHub OAuth token stored in `gh_token` cookie
2. **Guest Mode**: Cloudflare Access authentication via `cf-access-authenticated-user-email` header

## Base URL

- Development: `http://localhost:8788/api`
- Production: `https://your-domain.com/api`

---

## Authentication Endpoints

### GET /api/auth/me

Get the current authenticated user information.

**Authentication**: Cloudflare Access required

**Response**:
```json
{
  "user": {
    "email": "user@example.com",
    "name": "user"
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Not authenticated

---

## OAuth Endpoints

### GET /api/oauth/login

Initiate GitHub OAuth login flow.

**Query Parameters**:
- `return_to` (optional): URL to redirect to after successful login

**Response**: Redirects to GitHub OAuth authorization

---

### GET /api/oauth/callback

GitHub OAuth callback endpoint (handled automatically).

**Response**: Sets cookies and redirects to app

---

### POST /api/oauth/logout

Logout the current user.

**Response**: Clears cookies and returns success

---

## GitHub API Proxy Endpoints

All GitHub endpoints require either a `gh_token` cookie (Host mode) or a valid session parameter (Guest mode).

### GET /api/github/repos

List repositories accessible to the authenticated user.

**Authentication**: GitHub token required

**Response**:
```json
[
  {
    "id": 123456,
    "name": "repository-name",
    "full_name": "owner/repository-name",
    "private": false,
    "owner": {
      "login": "owner"
    }
  }
]
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized

---

### GET /api/github/content

Get file or directory contents from a GitHub repository.

**Authentication**: GitHub token or valid session required

**Query Parameters**:
- `owner` (required): Repository owner
- `repo` (required): Repository name
- `path` (optional): File/directory path (default: root)
- `session` (optional): Session ID for guest access

**Response** (file):
```json
{
  "name": "README.md",
  "path": "README.md",
  "sha": "abc123...",
  "size": 1234,
  "type": "file",
  "content": "base64-encoded-content..."
}
```

**Response** (directory):
```json
[
  {
    "name": "src",
    "path": "src",
    "type": "dir"
  },
  {
    "name": "README.md",
    "path": "README.md",
    "type": "file",
    "size": 1234
  }
]
```

**Status Codes**:
- `200`: Success
- `400`: Missing required parameters
- `401`: Unauthorized
- `403`: Access denied (path not in session scope)
- `404`: Not found

---

### GET /api/github/branches

List branches for a repository.

**Authentication**: GitHub token required

**Query Parameters**:
- `owner` (required): Repository owner
- `repo` (required): Repository name

**Response**:
```json
{
  "branches": [
    {
      "name": "main",
      "sha": "abc123...",
      "protected": false,
      "isDefault": true
    }
  ],
  "defaultBranch": "main"
}
```

---

### PUT /api/github/commit

Commit file changes to GitHub.

**Authentication**: GitHub token required (Host mode only)

**Request Body**:
```json
{
  "owner": "username",
  "repo": "repository",
  "path": "path/to/file.md",
  "content": "file content",
  "message": "commit message",
  "sha": "existing-file-sha (optional for new files)"
}
```

**Response**:
```json
{
  "success": true,
  "commitSha": "abc123...",
  "fileSha": "def456..."
}
```

**Status Codes**:
- `200`: Success
- `400`: Missing required fields
- `401`: Unauthorized
- `500`: Commit failed

---

### DELETE /api/github/file

Delete a file from GitHub.

**Authentication**: GitHub token required (Host mode only)

**Request Body**:
```json
{
  "owner": "username",
  "repo": "repository",
  "path": "path/to/file.md",
  "message": "delete message",
  "sha": "file-sha"
}
```

**Response**:
```json
{
  "success": true
}
```

---

## Session Management Endpoints

### POST /api/sessions

Create a new collaboration session.

**Authentication**: Cloudflare Access required

**Request Body**:
```json
{
  "paths": [
    "owner/repo",
    "owner/repo/folder/*",
    "owner/repo/file.md"
  ],
  "name": "Session Name (optional)"
}
```

**Response**:
```json
{
  "session": {
    "id": "session_abc123",
    "owner": "user@example.com",
    "paths": ["owner/repo"],
    "members": ["user@example.com"],
    "created": 1234567890000,
    "name": "Session Name"
  }
}
```

**Status Codes**:
- `201`: Created
- `400`: Invalid request
- `401`: Unauthorized
- `500`: Server error

---

### GET /api/sessions

List all sessions owned by or shared with the authenticated user.

**Authentication**: Cloudflare Access required

**Response**:
```json
{
  "sessions": [
    {
      "id": "session_abc123",
      "owner": "user@example.com",
      "paths": ["owner/repo"],
      "members": ["user@example.com"],
      "created": 1234567890000,
      "name": "Session Name"
    }
  ]
}
```

---

### GET /api/sessions/:id

Get details of a specific session.

**Authentication**: Cloudflare Access required (must be owner or member)

**Response**:
```json
{
  "session": {
    "id": "session_abc123",
    "owner": "user@example.com",
    "paths": ["owner/repo"],
    "members": ["user@example.com", "collaborator@example.com"],
    "created": 1234567890000,
    "name": "Session Name"
  }
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `403`: Not a session member
- `404`: Session not found

---

### DELETE /api/sessions/:id

Delete a session (owner only).

**Authentication**: Cloudflare Access required

**Response**:
```json
{
  "success": true
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `403`: Not session owner
- `404`: Session not found

---

### POST /api/sessions/:id/share

Create a share link for a session.

**Authentication**: Cloudflare Access required (must be session owner)

**Request Body**:
```json
{
  "permission": "edit",  // or "view"
  "expiresAt": 1234567890000  // optional, timestamp in ms
}
```

**Response**:
```json
{
  "token": "brave-bears-shake",
  "url": "https://your-domain.com/s/brave-bears-shake",
  "sessionId": "session_abc123",
  "permission": "edit",
  "expiresAt": 1234567890000
}
```

---

### GET /api/sessions/shared

Get sessions shared with the current user.

**Authentication**: Cloudflare Access required

**Response**:
```json
{
  "sessions": [...]
}
```

---

## Share Link Endpoints

### GET /api/share/:token

Get session information from a share token.

**Authentication**: Public endpoint (no auth required to view metadata)

**Response**:
```json
{
  "token": "brave-bears-shake",
  "sessionId": "session_abc123",
  "permission": "edit",
  "session": {
    "id": "session_abc123",
    "name": "Session Name",
    "owner": "user@example.com"
  }
}
```

**Status Codes**:
- `200`: Success
- `404`: Invalid or expired token

---

## File Sync Endpoints (KV Storage)

These endpoints provide server-side file caching and async collaboration.

### GET /api/sync/:owner/:repo/:path

Get cached file content from KV storage.

**Authentication**: Cloudflare Access required

**Response**:
```json
{
  "content": "file content",
  "user": "user@example.com",
  "timestamp": 1234567890000,
  "sha": "github-sha",
  "yjsState": "base64-encoded-yjs-state"
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `404`: Not found

---

### GET /api/sync/:owner/:repo

List all cached files for a repository.

**Authentication**: Cloudflare Access required

**Response**:
```json
[
  {
    "path": "README.md",
    "type": "file"
  }
]
```

---

### PUT /api/sync/:owner/:repo/:path

Save file content to KV storage.

**Authentication**: Cloudflare Access required

**Request Body**:
```json
{
  "content": "file content",
  "sha": "github-sha (optional)",
  "yjsState": "base64-encoded-yjs-state (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "timestamp": 1234567890000
}
```

**Status Codes**:
- `200`: Success
- `400`: Missing content
- `401`: Unauthorized
- `500`: Server error

---

### DELETE /api/sync/:owner/:repo/:path

Delete cached file content from KV storage.

**Authentication**: Cloudflare Access required

**Response**:
```json
{
  "success": true
}
```

---

## Rate Limiting

API endpoints implement rate limiting to prevent abuse:

- **Default limit**: 60 requests per minute per user
- **Commit operations**: 10 requests per minute per user
- **Session creation**: 5 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when the limit resets

**Status Code**:
- `429`: Too Many Requests

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "additional": "context"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `INVALID_INPUT`: Request validation failed
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## Best Practices

1. **Always handle errors gracefully** - Check response status codes
2. **Use exponential backoff** - For rate limited requests
3. **Cache responses** - When appropriate (GET requests)
4. **Validate input** - Before sending requests
5. **Monitor rate limits** - Check headers to avoid hitting limits
6. **Use sessions efficiently** - Share sessions rather than creating many
7. **Clean up resources** - Delete sessions when no longer needed

---

## Development

For local development:

1. Set environment variables in `.dev.vars`:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_secret
   DEV_USER_EMAIL=local@quartier.dev
   DEV_ACCESS_TOKEN=your_github_token
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. API available at `http://localhost:8788/api`
