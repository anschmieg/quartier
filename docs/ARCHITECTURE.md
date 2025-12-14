# Architecture & System Design

Quartier is a collaborative editor for Quarto documents, built on **Cloudflare ecosystem** (Pages, Functions, KV, Access).

## High-Level Overview

- **Frontend**: Vue 3 + Vite + Tailwind CSS.
- **Backend API**: Cloudflare Pages Functions (Serverless).
- **Database**: Cloudflare KV (Key-Value storage) for sessions and caching.
- **Auth**: Hybrid model supporting GitHub OAuth (Hosts) and Cloudflare Access (Guests).
- **Collaboration**: Yjs over WebSocket (Cloudflare Durable Objects planned, currently standard WS or polling/KV sync).

## Authentication Modes

Quartier implements a unique dual-authentication strategy to support both repository owners (Hosts) and collaborators (Guests).

### 1. Host Mode (GitHub OAuth)
- **Identity**: Authenticated via GitHub OAuth App.
- **Token**: `gh_token` (HttpOnly, Secure cookie).
- **Capabilities**:
  - Full Read/Write access to repositories.
  - Can Commit/Push changes to GitHub.
  - Can create Sessions and Share Links.
- **Flow**:
  1. User clicks "Login with GitHub".
  2. Redirects to `/api/oauth/login`.
  3. GitHub Callback -> sets `gh_token` and `gh_user` cookies.

### 2. Guest Mode (Cloudflare Access)
- **Identity**: Authenticated via Cloudflare Access (Google, Email OTP, etc.).
- **Token**: `CF_Authorization` cookie (managed by Cloudflare).
- **Capabilities**:
  - **Read-Only** access to GitHub Repositories (via Proxy).
  - **Write** access to *Session Cursors* and *Live Edits* (Yjs).
  - **Cannot Commit** to GitHub directly.
  - Access is scoped to specific files/folders shared in the Session.
- **Flow**:
  1. User clicks a Share Link (`/s/:token`).
  2. If unauthenticated, redirects to `/app` (Protected Route).
  3. Cloudflare Access intercepts -> Login screen.
  4. User logs in -> Redirected back to `/app` -> Router sends back to `/s/:token`.
  5. API validates generic email identity against Session Members.

## Backend Proxy

To secure GitHub tokens and implement custom access control, the frontend never talks to GitHub directly.

- **Frontend** calls `/api/github/*`.
- **Functions** (`functions/api/github/*`) intercept requests:
  - Check for `gh_token`.
  - If missing, check for `session` query param.
  - If `session` present, validate Access Identity against Session Members.
  - If valid, proxy request to GitHub API.

## Collaboration Architecture

### Sessions
A "Session" defines a scope of collaboration.
- **Stored in KV**: `session:{id}`.
- **Contains**: Owner, Member list, Allowed Paths.

### Sharing
- **Share Link**: Points to `/s/:token`.
- **Token**: Maps to a Session ID + Permission Level (Read/Write).
- **Security**: The `/share/*` API endpoint is public (bypasses Access) to allow initial metadata fetch, but *Joining* requires Access authentication.

## File System
- **FileBrowser**: Virtual file system combining GitHub directory listings and Session-scoped paths.
- **Caching**: KV is used to cache file contents (ETags) to reduce GitHub API rate limits.
